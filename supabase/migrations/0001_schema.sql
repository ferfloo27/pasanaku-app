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
