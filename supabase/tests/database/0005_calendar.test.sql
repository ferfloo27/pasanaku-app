begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);

insert into auth.users (id) values ('13000000-0000-4000-8000-000000000001');
insert into public.profiles (user_id, display_name) values ('13000000-0000-4000-8000-000000000001', 'Rosa');
set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';

-- +14 y -12 garantizan que alguna sesión esté en otro día, sea cual sea la hora.
set local timezone = 'Pacific/Kiritimati';
select lives_ok(format($$select public.create_room('Hoy', 200, 'weekly', %L, 2)$$,
  (statement_timestamp() at time zone 'America/La_Paz')::date), 'Hoy en Bolivia se acepta aunque la sesión esté adelantada');
select throws_ok(format($$select public.create_room('Ayer', 200, 'biweekly', %L, 2)$$,
  (statement_timestamp() at time zone 'America/La_Paz')::date - 1), 'P0001', 'INVALID_INPUT', 'Ayer en Bolivia se rechaza con una sesión adelantada');
select lives_ok(format($$select public.create_room('Este mes', 200, 'monthly', %L, 2)$$,
  date_trunc('month', statement_timestamp() at time zone 'America/La_Paz')::date), 'El mes vigente en Bolivia se acepta con una sesión adelantada');

set local timezone = 'Etc/GMT+12';
select lives_ok(format($$select public.create_room('Hoy', 200, 'biweekly', %L, 2)$$,
  (statement_timestamp() at time zone 'America/La_Paz')::date), 'Hoy en Bolivia se acepta aunque la sesión esté atrasada');
select throws_ok(format($$select public.create_room('Ayer', 200, 'weekly', %L, 2)$$,
  (statement_timestamp() at time zone 'America/La_Paz')::date - 1), 'P0001', 'INVALID_INPUT', 'Ayer en Bolivia se rechaza con una sesión atrasada');
select lives_ok(format($$select public.create_room('Este mes', 200, 'monthly', %L, 2)$$,
  date_trunc('month', statement_timestamp() at time zone 'America/La_Paz')::date), 'El mes vigente en Bolivia se acepta con una sesión atrasada');

reset role;
select * from finish();
rollback;
