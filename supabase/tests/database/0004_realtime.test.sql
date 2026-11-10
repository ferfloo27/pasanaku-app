begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(3);

select ok(exists(select 1 from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'),
  'Realtime publica los cambios de rooms');
select ok(exists(select 1 from pg_publication_tables
  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants'),
  'Realtime publica los cambios de participants');
select is((select relreplident::text from pg_class where oid = 'public.participants'::regclass),
  'f', 'participants conserva la identidad completa para replicación');

select * from finish();
rollback;
