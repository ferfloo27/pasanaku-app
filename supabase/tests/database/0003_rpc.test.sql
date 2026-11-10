begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (id) values
  ('12000000-0000-4000-8000-000000000001'),
  ('12000000-0000-4000-8000-000000000002'),
  ('12000000-0000-4000-8000-000000000003'),
  ('12000000-0000-4000-8000-000000000004');
insert into public.profiles (user_id, display_name) values
  ('12000000-0000-4000-8000-000000000001', 'Rosa'),
  ('12000000-0000-4000-8000-000000000002', 'Juan'),
  ('12000000-0000-4000-8000-000000000003', 'Lucía');

-- Estas comprobaciones fallan antes de implementar las RPC.
set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000004';
select throws_ok($$select public.create_room('Familia', 200, 'monthly', '2099-01-01', 3)$$,
  'P0001', 'PROFILE_REQUIRED', 'Crear requiere un perfil');
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
select throws_ok($$select public.create_room(' ', 200, 'monthly', '2099-01-01', 3)$$, 'P0001', 'INVALID_INPUT', 'Crear rechaza nombres vacíos');
select throws_ok($$select public.create_room('Familia', 0, 'monthly', '2099-01-01', 3)$$, 'P0001', 'INVALID_INPUT', 'Crear rechaza cuotas inválidas');
select throws_ok($$select public.create_room('Familia', 200, 'monthly', '2099-01-02', 3)$$, 'P0001', 'INVALID_INPUT', 'La frecuencia mensual empieza el día 1');
select throws_ok($$select public.create_room('Familia', 200, 'weekly', current_date - 1, 3)$$, 'P0001', 'INVALID_INPUT', 'No se crean salas con fechas pasadas');
select throws_ok($$select public.create_room('Familia', 200, 'monthly', '2099-01-01', 31)$$, 'P0001', 'INVALID_INPUT', 'Crear rechaza cupos fuera de rango');
select lives_ok($$select public.create_room('  Familia  ', 200, 'monthly', '2099-01-01', 3)$$, 'Crear sala es atómico e incorpora al anfitrión');
reset role;

-- IDs y códigos se obtienen de lo persistido, no de una simulación de Supabase.
create temp table fixture as select id, code from public.rooms where host_user_id = '12000000-0000-4000-8000-000000000001';
grant select on fixture to authenticated;
select is((select count(*) from fixture), 1::bigint, 'Los intentos inválidos no dejan salas');
select is((select name from public.rooms where id = (select id from fixture)), 'Familia', 'El nombre de sala se recorta');
select is((select count(*) from public.participants where room_id = (select id from fixture)), 1::bigint, 'El anfitrión participa una sola vez');
select matches((select code::text from fixture), '^[A-Z0-9]{6}$', 'El código generado cumple el formato');

set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000002';
select is((select count(*) from public.get_room_preview((select code::text from fixture))), 1::bigint, 'Un tercero puede consultar la pre-unión por código');
select is((select is_member from public.get_room_preview((select code::text from fixture))), false, 'La pre-unión identifica a quien aún no participa');
select throws_ok($$select public.get_room_preview('NO!')$$, 'P0001', 'ROOM_NOT_FOUND', 'Un código inválido no revela salas');
select throws_ok($$select public.get_room_preview('ZZZZZZ')$$, 'P0001', 'ROOM_NOT_FOUND', 'Un código inexistente no revela salas');
select lives_ok($$select public.join_room((select lower(code::text) from fixture))$$, 'Se admite un código en minúsculas');
select lives_ok($$select public.join_room((select code::text from fixture))$$, 'Repetir la unión no duplica al miembro');
select is((select count(*) from public.participants where room_id = (select id from fixture)), 2::bigint, 'La unión es idempotente');
select throws_ok($$select public.cancel_room((select id from fixture))$$, 'P0001', 'NOT_HOST', 'Solo el anfitrión cancela');
select throws_ok($$select public.confirm_draw((select id from fixture), array[]::uuid[])$$, 'P0001', 'NOT_HOST', 'Solo el anfitrión confirma');
select throws_ok($$select public.remove_participant((select id from public.participants where user_id = auth.uid()))$$,
  'P0001', 'NOT_HOST', 'Solo el anfitrión elimina participantes');

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000003';
select lives_ok($$select public.join_room((select code::text from fixture))$$, 'El último cupo se puede ocupar');
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000004';
select throws_ok($$select public.join_room((select code::text from fixture))$$, 'P0001', 'ROOM_FULL', 'El cupo no se supera');

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
select throws_ok($$select public.remove_participant((select id from public.participants where user_id = auth.uid()))$$,
  'P0001', 'CANNOT_REMOVE_HOST', 'El anfitrión no se elimina a sí mismo');
select lives_ok($$select public.remove_participant((select id from public.participants where user_id = '12000000-0000-4000-8000-000000000003'))$$,
  'El anfitrión puede eliminar mientras espera');
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000003';
select lives_ok($$select public.join_room((select code::text from fixture))$$, 'Una persona eliminada puede volver antes del sorteo');
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
select throws_ok($$select public.confirm_draw((select id from fixture), array[]::uuid[])$$,
  'P0001', 'PARTICIPANTS_CHANGED', 'No se confirma un conjunto incompleto');
select throws_ok($$select public.confirm_draw((select id from fixture), array_fill((select id from public.participants where user_id = auth.uid()), array[3]))$$,
  'P0001', 'PARTICIPANTS_CHANGED', 'No se confirman participantes repetidos');
select is((select count(*) from public.turns where room_id = (select id from fixture)), 0::bigint, 'Las confirmaciones fallidas no dejan turnos');
select is((select status::text from public.rooms where id = (select id from fixture)), 'waiting', 'Un fallo conserva la sala en espera');
select lives_ok($$select public.confirm_draw((select id from fixture), (select array_agg(id order by user_id) from public.participants where room_id = (select id from fixture)))$$,
  'El anfitrión confirma un orden completo');
select is((select count(*) from public.turns where room_id = (select id from fixture)), 3::bigint, 'Se persisten todos los turnos');
select results_eq($$select position, turn_date::text, payout_bs from public.turns where room_id = (select id from fixture) order by position$$,
  $$values (1, '2099-01-01', 600), (2, '2099-02-01', 600), (3, '2099-03-01', 600)$$, 'Posiciones, fechas mensuales y montos coinciden con el orden');
select throws_ok($$select public.confirm_draw((select id from fixture), (select array_agg(id) from public.participants where room_id = (select id from fixture)))$$,
  'P0001', 'ROOM_NOT_WAITING', 'Una segunda confirmación no repite el sorteo');
select throws_ok($$select public.cancel_room((select id from fixture))$$, 'P0001', 'ROOM_NOT_WAITING', 'Una sala sorteada no se cancela');
select throws_ok($$select public.remove_participant((select id from public.participants where user_id = '12000000-0000-4000-8000-000000000003'))$$,
  'P0001', 'ROOM_NOT_WAITING', 'Una sala sorteada no pierde participantes');
select is((select count(*) from public.turns where room_id = (select id from fixture)), 3::bigint, 'Los reintentos no cambian los turnos existentes');
select is((select count(*) from public.list_my_rooms()), 1::bigint, 'Tus salas devuelve la sala propia');

-- Un cambio de perfil no renombra los snapshots de una participación ya creada.
update public.profiles set display_name = 'Otro nombre' where user_id = auth.uid();
select is((select host_name from public.rooms where id = (select id from fixture)), 'Rosa', 'Se conserva el nombre del anfitrión');
select is((select name from public.participants where user_id = auth.uid()), 'Rosa', 'Se conserva el nombre de participación');

reset role;
-- Cancelaciones: una ventana de 30 días, acordada con la persona dueña del proyecto.
insert into public.rooms (id, code, name, host_user_id, host_name, contribution_bs, start_date, status, cancelled_at)
values
  ('22000000-0000-4000-8000-000000000001', 'CAN001', 'Reciente', '12000000-0000-4000-8000-000000000001', 'Rosa', 100, '2099-01-01', 'cancelled', now() - interval '29 days'),
  ('22000000-0000-4000-8000-000000000002', 'CAN002', 'Antigua', '12000000-0000-4000-8000-000000000001', 'Rosa', 100, '2099-01-01', 'cancelled', now() - interval '31 days');
insert into public.participants (room_id, user_id, name)
select r.id, r.host_user_id, r.host_name from public.rooms r where r.code in ('CAN001', 'CAN002');
set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
select results_eq($$select code::text from public.list_my_rooms() order by code$$,
  $$select code::text from fixture union all select 'CAN001' order by 1$$, 'Tus salas incluye solo cancelaciones de los últimos 30 días');
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000004';
select is((select count(*) from public.list_my_rooms()), 0::bigint, 'Tus salas no filtra información ajena');
select throws_ok($$select public.join_room((select code::text from fixture))$$, 'P0001', 'ROOM_DRAWN', 'No se entra después del sorteo');
select throws_ok($$select public.join_room('CAN001')$$, 'P0001', 'ROOM_CANCELLED', 'No se entra a una sala cancelada');

set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok($$select public.create_room('Intruso', 100, 'monthly', '2099-01-01', 2)$$, '42501', null, 'Sin sesión no se ejecutan RPC');

reset role;
select * from finish();
rollback;
