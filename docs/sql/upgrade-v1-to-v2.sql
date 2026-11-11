-- Pasanaku v1 -> v2. EJECUCION MANUAL por la persona duena.
-- Aparta las tres tablas v1; no borra sus datos ni modifica auth.users.
-- La web v1 dejara de funcionar al confirmar esta transaccion.
-- Revisar proyecto y disponer de una copia externa antes de ejecutar.
-- Generado con las migraciones 0001-0004; no ejecutar esas migraciones otra vez.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $preflight$
declare
  item record;
  actual_columns text[];
begin
  if exists (select 1 from pg_namespace where nspname = 'pasanaku_v1_archive') then
    raise exception 'El archivo v1 ya existe: detener y revisar; no se ha cambiado nada';
  end if;
  if to_regclass('public.profiles') is not null then
    raise exception 'public.profiles ya existe: el destino no es la v1 esperada';
  end if;
  for item in select * from (values
    ('rooms', array['id','code','host_name','start_month','status','created_at']),
    ('participants', array['id','room_id','name','client_id','joined_at']),
    ('turns', array['id','room_id','participant_id','position','assigned_month'])
  ) as expected(table_name, columns) loop
    select array_agg(c.column_name::text order by c.ordinal_position)
      into actual_columns from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = item.table_name;
    if actual_columns is distinct from item.columns then
      raise exception 'Estructura inesperada en public.%: detener y revisar', item.table_name;
    end if;
  end loop;
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables) then
    raise exception 'La publicacion Realtime no tiene la configuracion esperada';
  end if;
end;
$preflight$;

lock table public.rooms, public.participants, public.turns in access exclusive mode;
create schema pasanaku_v1_archive;
revoke all on schema pasanaku_v1_archive from public, anon, authenticated;

-- Retirar solo las tablas v1 de Realtime antes de apartarlas.
do $publication$
declare item record;
begin
  for item in select schemaname, tablename from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('rooms','participants','turns') loop
    execute format('alter publication supabase_realtime drop table %I.%I', item.schemaname, item.tablename);
  end loop;
end;
$publication$;

alter table public.rooms set schema pasanaku_v1_archive;
alter table public.participants set schema pasanaku_v1_archive;
alter table public.turns set schema pasanaku_v1_archive;
revoke all on all tables in schema pasanaku_v1_archive from public, anon, authenticated;

-- INICIO 0001_schema.sql
create type public.room_status as enum ('waiting', 'drawn', 'cancelled');
create type public.room_frequency as enum ('weekly', 'biweekly', 'monthly');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code char(6) unique not null check (code ~ '^[A-Z0-9]{6}$'),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  host_user_id uuid not null references auth.users(id),
  host_name text not null,
  contribution_bs integer not null check (contribution_bs between 1 and 100000),
  frequency public.room_frequency not null default 'monthly',
  start_date date not null,
  max_participants integer not null default 30 check (max_participants between 2 and 30),
  status public.room_status not null default 'waiting',
  drawn_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table public.turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id),
  position integer not null check (position >= 1),
  turn_date date not null,
  payout_bs integer not null,
  unique (room_id, position),
  unique (room_id, participant_id)
);

-- Apoya las consultas de pertenencia y de "Tus salas" sin recorrer todas las filas.
create index participants_user_id_room_id_idx on public.participants (user_id, room_id);
create index rooms_host_user_id_idx on public.rooms (host_user_id);

-- FIN 0001_schema.sql

-- INICIO 0002_rls.sql
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.turns enable row level security;

-- Se retiran también TRUNCATE, REFERENCES y TRIGGER concedidos por defecto.
revoke all on public.rooms, public.participants, public.turns from public, anon, authenticated;
grant select on public.rooms, public.participants, public.turns to anon, authenticated;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- Evita la recursión de RLS al consultar pertenencia desde participants.
-- No acepta user_id: siempre comprueba la identidad de quien llama.
create function public.is_room_participant(target_room uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.participants p
    where p.room_id = target_room and p.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_room_participant(uuid) from public, anon, authenticated;
grant execute on function public.is_room_participant(uuid) to authenticated;

create policy profiles_select_own on public.profiles
for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy rooms_select_member on public.rooms
for select to authenticated using (public.is_room_participant(id));
create policy participants_select_member on public.participants
for select to authenticated using (public.is_room_participant(room_id));
create policy turns_select_member on public.turns
for select to authenticated using (public.is_room_participant(room_id));

-- FIN 0002_rls.sql

-- INICIO 0003_rpc.sql
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

-- FIN 0003_rpc.sql

-- INICIO 0004_realtime.sql
alter publication supabase_realtime add table public.rooms, public.participants;
alter table public.participants replica identity full;

-- FIN 0004_realtime.sql

notify pgrst, 'reload schema';
commit;

