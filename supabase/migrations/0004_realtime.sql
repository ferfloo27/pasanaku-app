alter publication supabase_realtime add table public.rooms, public.participants;
alter table public.participants replica identity full;
