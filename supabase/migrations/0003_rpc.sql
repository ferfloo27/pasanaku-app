create function public.create_room(
  name text, contribution_bs integer, frequency text, start_date date,
  max_participants integer default 30
)
returns public.rooms
language plpgsql security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  business_today date := (statement_timestamp() at time zone 'America/La_Paz')::date;
  display_name text;
  new_room public.rooms;
  new_code text;
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
begin
  select p.display_name into display_name from public.profiles p where p.user_id = caller;
  if caller is null or display_name is null then raise exception 'PROFILE_REQUIRED'; end if;
  if name is null or char_length(btrim(name)) not between 1 and 60
    or contribution_bs is null or contribution_bs not between 1 and 100000
    or frequency is null or frequency not in ('weekly', 'biweekly', 'monthly')
    or start_date is null or not isfinite(start_date)
    or max_participants is null or max_participants not between 2 and 30 then
    raise exception 'INVALID_INPUT';
  end if;
  if frequency = 'monthly' then
    if extract(day from start_date) <> 1 or start_date < date_trunc('month', business_today)::date then
      raise exception 'INVALID_INPUT';
    end if;
  elsif start_date < business_today then
    raise exception 'INVALID_INPUT';
  end if;

  for attempt in 1..10 loop
    new_code := '';
    for character_index in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    begin
      insert into public.rooms (code, name, host_user_id, host_name, contribution_bs, frequency, start_date, max_participants)
      values (new_code, btrim(name), caller, btrim(display_name), contribution_bs, frequency::public.room_frequency, start_date, max_participants)
      returning * into new_room;
    exception when unique_violation then
      continue;
    end;
    insert into public.participants (room_id, user_id, name) values (new_room.id, caller, btrim(display_name));
    return new_room;
  end loop;
  raise exception 'CODE_GENERATION_FAILED';
end;
$$;

-- Un tipo compuesto permite conservar "code" como argumento y campo de respuesta.
create type public.room_preview as (
  name text, host_name text, participant_count bigint, max_participants integer,
  contribution_bs integer, frequency public.room_frequency, start_date date,
  code char(6), status public.room_status, is_member boolean
);

create function public.get_room_preview(code text)
returns setof public.room_preview
language plpgsql stable security definer set search_path = public
as $$
declare
  normalized_code text := upper(btrim(get_room_preview.code));
begin
  if normalized_code is null or normalized_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  return query
    select r.name, r.host_name,
      (select count(*) from public.participants p where p.room_id = r.id),
      r.max_participants, r.contribution_bs, r.frequency, r.start_date, r.code, r.status,
      exists(select 1 from public.participants p where p.room_id = r.id and p.user_id = auth.uid())
    from public.rooms r where r.code = normalized_code;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
end;
$$;

create function public.join_room(code text)
returns public.rooms
language plpgsql security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target public.rooms;
  display_name text;
begin
  select r.* into target from public.rooms r where r.code = upper(btrim(join_room.code)) for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  -- Un reintento de un miembro devuelve su sala incluso si ya cambió de estado.
  if exists(select 1 from public.participants p where p.room_id = target.id and p.user_id = caller) then
    return target;
  end if;
  if target.status = 'drawn' then raise exception 'ROOM_DRAWN'; end if;
  if target.status = 'cancelled' then raise exception 'ROOM_CANCELLED'; end if;
  if (select count(*) from public.participants p where p.room_id = target.id) >= target.max_participants then
    raise exception 'ROOM_FULL';
  end if;
  select p.display_name into display_name from public.profiles p where p.user_id = caller;
  if caller is null or display_name is null then raise exception 'PROFILE_REQUIRED'; end if;
  insert into public.participants (room_id, user_id, name) values (target.id, caller, btrim(display_name));
  return target;
end;
$$;

create function public.remove_participant(participant_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target public.rooms;
  member public.participants;
begin
  select r.* into target from public.rooms r
  where r.id = (select p.room_id from public.participants p where p.id = remove_participant.participant_id)
  for update;
  if not found or target.host_user_id is distinct from auth.uid() then raise exception 'NOT_HOST'; end if;
  if target.status <> 'waiting' then raise exception 'ROOM_NOT_WAITING'; end if;
  select p.* into member from public.participants p where p.id = remove_participant.participant_id;
  if member.user_id = target.host_user_id then raise exception 'CANNOT_REMOVE_HOST'; end if;
  delete from public.participants p where p.id = remove_participant.participant_id and p.room_id = target.id;
end;
$$;

create function public.cancel_room(room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target public.rooms;
begin
  select r.* into target from public.rooms r where r.id = cancel_room.room_id for update;
  if not found or target.host_user_id is distinct from auth.uid() then raise exception 'NOT_HOST'; end if;
  if target.status <> 'waiting' then raise exception 'ROOM_NOT_WAITING'; end if;
  update public.rooms r set status = 'cancelled', cancelled_at = now() where r.id = target.id;
end;
$$;

create function public.confirm_draw(room_id uuid, participant_ids uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  target public.rooms;
  actual_ids uuid[];
  ordered_ids uuid[];
  member_count integer;
begin
  -- Todas las operaciones sobre la lista de miembros toman primero el mismo bloqueo.
  select r.* into target from public.rooms r where r.id = confirm_draw.room_id for update;
  if not found or target.host_user_id is distinct from auth.uid() then raise exception 'NOT_HOST'; end if;
  if target.status <> 'waiting' then raise exception 'ROOM_NOT_WAITING'; end if;
  select array_agg(p.id order by p.id), count(*)::integer into actual_ids, member_count
  from public.participants p where p.room_id = target.id;
  if member_count < 2 then raise exception 'NOT_ENOUGH_PARTICIPANTS'; end if;
  select array_agg(item order by item) into ordered_ids from unnest(participant_ids) item;
  if participant_ids is null or array_ndims(participant_ids) is distinct from 1
    or cardinality(participant_ids) <> member_count or ordered_ids is distinct from actual_ids then
    raise exception 'PARTICIPANTS_CHANGED';
  end if;

  insert into public.turns (room_id, participant_id, position, turn_date, payout_bs)
  select target.id, item, position::integer,
    case target.frequency
      when 'monthly' then (target.start_date + make_interval(months => (position - 1)::integer))::date
      when 'weekly' then target.start_date + 7 * (position - 1)::integer
      when 'biweekly' then target.start_date + 15 * (position - 1)::integer
    end,
    target.contribution_bs * member_count
  from unnest(participant_ids) with ordinality as ordered(item, position);
  update public.rooms r set status = 'drawn', drawn_at = now() where r.id = target.id;
end;
$$;

create function public.list_my_rooms()
returns table (
  id uuid, code char(6), name text, host_user_id uuid, host_name text,
  contribution_bs integer, frequency public.room_frequency, start_date date,
  max_participants integer, status public.room_status, drawn_at timestamptz,
  cancelled_at timestamptz, created_at timestamptz, participant_count bigint,
  is_host boolean, last_activity_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.code, r.name, r.host_user_id, r.host_name, r.contribution_bs,
    r.frequency, r.start_date, r.max_participants, r.status, r.drawn_at,
    r.cancelled_at, r.created_at, members.participant_count,
    r.host_user_id = auth.uid(),
    greatest(r.created_at, r.drawn_at, r.cancelled_at, members.last_joined_at) as last_activity_at
  from public.rooms r
  cross join lateral (
    select count(*) as participant_count, max(p.joined_at) as last_joined_at
    from public.participants p where p.room_id = r.id
  ) members
  where exists(select 1 from public.participants p where p.room_id = r.id and p.user_id = auth.uid())
    and (r.status in ('waiting', 'drawn') or (r.status = 'cancelled' and r.cancelled_at >= now() - interval '30 days'))
  order by last_activity_at desc, r.id;
$$;

-- Las sesiones anónimas de Auth usan authenticated; anon significa sin sesión.
revoke all on function public.create_room(text, integer, text, date, integer) from public, anon, authenticated;
revoke all on function public.get_room_preview(text) from public, anon, authenticated;
revoke all on function public.join_room(text) from public, anon, authenticated;
revoke all on function public.remove_participant(uuid) from public, anon, authenticated;
revoke all on function public.cancel_room(uuid) from public, anon, authenticated;
revoke all on function public.confirm_draw(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.list_my_rooms() from public, anon, authenticated;
grant execute on function public.create_room(text, integer, text, date, integer) to authenticated;
grant execute on function public.get_room_preview(text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.remove_participant(uuid) to authenticated;
grant execute on function public.cancel_room(uuid) to authenticated;
grant execute on function public.confirm_draw(uuid, uuid[]) to authenticated;
grant execute on function public.list_my_rooms() to authenticated;
