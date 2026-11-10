begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('11000000-0000-4000-8000-000000000001'),
  ('11000000-0000-4000-8000-000000000002');
insert into public.profiles (user_id, display_name) values
  ('11000000-0000-4000-8000-000000000001', 'Rosa'),
  ('11000000-0000-4000-8000-000000000002', 'Juan');
insert into public.rooms (id, code, name, host_user_id, host_name, contribution_bs, start_date)
values ('21000000-0000-4000-8000-000000000001', 'RLS123', 'Familia',
        '11000000-0000-4000-8000-000000000001', 'Rosa', 200, '2099-01-01');
insert into public.participants (id, room_id, user_id, name)
values ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001',
        '11000000-0000-4000-8000-000000000001', 'Rosa');
insert into public.turns (room_id, participant_id, position, turn_date, payout_bs)
values ('21000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, '2099-01-01', 200);

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select is((select count(*) from public.rooms where code = 'RLS123'), 1::bigint, 'Un miembro lee su sala');
select is((select count(*) from public.participants where room_id = '21000000-0000-4000-8000-000000000001'), 1::bigint, 'Un miembro lee los participantes');
select is((select count(*) from public.turns where room_id = '21000000-0000-4000-8000-000000000001'), 1::bigint, 'Un miembro lee los turnos');
select is((select count(*) from public.profiles), 1::bigint, 'Solo se ve el perfil propio');
select lives_ok($$update public.profiles set display_name = 'Rosa María' where user_id = auth.uid()$$, 'Se puede editar el perfil propio');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
select is((select count(*) from public.rooms where code = 'RLS123'), 0::bigint, 'Un tercero no lee ni lista salas ajenas');
select is((select count(*) from public.participants where room_id = '21000000-0000-4000-8000-000000000001'), 0::bigint, 'Un tercero no lee participantes ajenos');
select is((select count(*) from public.turns where room_id = '21000000-0000-4000-8000-000000000001'), 0::bigint, 'Un tercero no lee turnos ajenos');
select is((select count(*) from public.profiles where user_id = '11000000-0000-4000-8000-000000000001'), 0::bigint, 'Un tercero no lee el perfil de otra cuenta');
select is_empty($$update public.profiles set display_name = 'Intruso' where user_id = '11000000-0000-4000-8000-000000000001' returning user_id$$, 'No se edita el perfil ajeno');
select throws_ok($$insert into public.profiles (user_id, display_name) values ('11000000-0000-4000-8000-000000000003', 'Intruso')$$, '42501', null, 'No se crea un perfil con otra identidad');

-- Propiedad 8: ninguna identidad de cliente escribe directamente en las tablas de sala.
select throws_ok($$insert into public.rooms (code, name, host_user_id, host_name, contribution_bs, start_date)
  values ('BAD123', 'Intruso', auth.uid(), 'Juan', 200, '2099-01-01')$$, '42501', null, 'INSERT rooms requiere RPC');
select throws_ok($$update public.rooms set name = 'Intruso'$$, '42501', null, 'UPDATE rooms requiere RPC');
select throws_ok($$delete from public.rooms$$, '42501', null, 'DELETE rooms requiere RPC');
select throws_ok($$insert into public.participants (room_id, user_id, name)
  values ('21000000-0000-4000-8000-000000000001', auth.uid(), 'Juan')$$, '42501', null, 'INSERT participants requiere RPC');
select throws_ok($$update public.participants set name = 'Intruso'$$, '42501', null, 'UPDATE participants requiere RPC');
select throws_ok($$delete from public.participants$$, '42501', null, 'DELETE participants requiere RPC');
select throws_ok($$insert into public.turns (room_id, participant_id, position, turn_date, payout_bs)
  values ('21000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 2, '2099-02-01', 200)$$,
  '42501', null, 'INSERT turns requiere RPC');
select throws_ok($$update public.turns set payout_bs = 999$$, '42501', null, 'UPDATE turns requiere RPC');
select throws_ok($$delete from public.turns$$, '42501', null, 'DELETE turns requiere RPC');

set local role anon;
set local request.jwt.claim.sub = '';
select is((select count(*) from public.rooms where code = 'RLS123'), 0::bigint, 'Sin sesión no se leen salas');
select is((select count(*) from public.profiles), 0::bigint, 'Sin sesión no se leen perfiles');
select throws_ok($$update public.rooms set name = 'Intruso'$$, '42501', null, 'El rol anon tampoco escribe salas');

reset role;
select * from finish();
rollback;
