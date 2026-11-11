import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Contenedor local fijo. Nunca utiliza URLs, proyectos enlazados ni archivos .env.
const container = 'supabase_db_pasanaku-app';
const bundle = readFileSync(new URL('../../docs/sql/upgrade-v1-to-v2.sql', import.meta.url), 'utf8');
function docker(args, input) {
  const result = spawnSync('docker', ['exec', '-i', container, ...args], { input, encoding: 'utf8', timeout: 30000 });
  if (result.error) throw result.error;
  return result;
}
function sql(db, input, expectedSuccess = true) {
  const result = docker(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', db], input);
  if (expectedSuccess) assert.equal(result.status, 0, result.stderr);
  else assert.notEqual(result.status, 0);
  return result;
}
const fixture = `
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.rooms (id uuid primary key, code text unique, host_name text,
  start_month date, status text, created_at timestamp without time zone);
create table public.participants (id uuid primary key, room_id uuid references public.rooms(id),
  name text, client_id text, joined_at timestamp without time zone);
create table public.turns (id uuid primary key, room_id uuid references public.rooms(id),
  participant_id uuid references public.participants(id), position integer, assigned_month date);
create publication supabase_realtime for table public.rooms, public.participants;
grant select on public.rooms, public.participants, public.turns to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001');
insert into public.rooms values ('00000000-0000-0000-0000-000000000002', 'ABC123', 'Prueba v1', '2027-01-01', 'drawn', now());
insert into public.participants values ('00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002', 'Prueba v1', 'cliente-v1', now());
insert into public.turns values ('00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 1, '2027-01-01');
`;
function withDatabase(check) {
  const db = `pasanaku_transition_check_${randomUUID().replaceAll('-', '')}`;
  const created = docker(['createdb', '-U', 'postgres', '-T', 'template0', db]);
  assert.equal(created.status, 0, created.stderr);
  try { sql(db, fixture); check(db); }
  finally {
    const removed = docker(['dropdb', '-U', 'postgres', db]);
    assert.equal(removed.status, 0, removed.stderr);
  }
}

test('El paquete contiene exactamente las cuatro migraciones versionadas', () => {
  for (const file of ['0001_schema.sql', '0002_rls.sql', '0003_rpc.sql', '0004_realtime.sql']) {
    const source = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n').trim();
    const embedded = bundle.split(`-- INICIO ${file}`)[1]?.split(`-- FIN ${file}`)[0]?.replaceAll('\r\n', '\n').trim();
    assert.equal(embedded, source, file);
  }
});

test('El cambio conserva v1 y Auth, prepara v2 y rechaza una segunda ejecución', () => withDatabase(db => {
  sql(db, bundle);
  assert.equal(sql(db, `select
    (select count(*) from pasanaku_v1_archive.rooms),
    (select count(*) from pasanaku_v1_archive.participants),
    (select count(*) from pasanaku_v1_archive.turns),
    (select count(*) from auth.users),
    (select count(*) from public.rooms),
    (select count(*) from public.profiles),
    (select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'),
    (select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='pasanaku_v1_archive'),
    has_table_privilege('anon', 'pasanaku_v1_archive.rooms', 'select'),
    has_table_privilege('authenticated', 'pasanaku_v1_archive.rooms', 'select'),
    (select count(*) from pg_class where relnamespace='public'::regnamespace
      and relname in ('rooms','participants','turns','profiles') and relrowsecurity);
  `).stdout.trim(), '1|1|1|1|0|0|2|0|f|f|4');
  assert.match(sql(db, bundle, false).stderr, /archivo v1 ya existe/);
  assert.equal(sql(db, 'select count(*) from pasanaku_v1_archive.turns').stdout.trim(), '1');
}));

test('Un conflicto al crear las RPC revierte tablas, permisos y Realtime', () => withDatabase(db => {
  sql(db, 'create function public.list_my_rooms() returns integer language sql as $$ select 1 $$;');
  sql(db, bundle, false);
  assert.equal(sql(db, `select
    to_regnamespace('pasanaku_v1_archive') is null,
    to_regclass('public.profiles') is null,
    (select count(*) from public.rooms),
    (select count(*) from public.turns),
    has_table_privilege('anon', 'public.rooms', 'select'),
    (select count(*) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public');
  `).stdout.trim(), 't|t|1|1|t|2');
}));
