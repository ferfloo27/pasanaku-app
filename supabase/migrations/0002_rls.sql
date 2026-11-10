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
