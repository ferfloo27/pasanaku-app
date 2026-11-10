begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select enum_has_labels('public', 'room_status', array['waiting', 'drawn', 'cancelled']);
select enum_has_labels('public', 'room_frequency', array['weekly', 'biweekly', 'monthly']);
select has_table('public', 'profiles', 'Existe el perfil por cuenta');
select has_table('public', 'rooms', 'Existen las salas');
select has_table('public', 'participants', 'Existen las participaciones');
select has_table('public', 'turns', 'Existen los turnos');

insert into auth.users (id) values ('10000000-0000-4000-8000-000000000001');
insert into public.profiles (user_id, display_name)
values ('10000000-0000-4000-8000-000000000001', 'Rosa');
insert into public.rooms (id, code, name, host_user_id, host_name, contribution_bs, start_date)
values ('20000000-0000-4000-8000-000000000001', 'ABC123', 'Familia',
        '10000000-0000-4000-8000-000000000001', 'Rosa', 200, '2099-01-01');

select is((select frequency::text from public.rooms where code = 'ABC123'), 'monthly', 'La frecuencia inicial es mensual');
select is((select max_participants from public.rooms where code = 'ABC123'), 30, 'El cupo inicial es 30');
select is((select status::text from public.rooms where code = 'ABC123'), 'waiting', 'La sala inicia en espera');
select throws_ok($$update public.rooms set code = 'abc123'$$, '23514', null, 'Rechaza códigos fuera de A-Z y 0-9');
select throws_ok($$update public.rooms set name = '   '$$, '23514', null, 'Rechaza nombres de sala vacíos');
select throws_ok($$update public.rooms set name = repeat('a', 61)$$, '23514', null, 'Rechaza nombres de sala de más de 60 caracteres');
select throws_ok($$update public.rooms set contribution_bs = 0$$, '23514', null, 'Rechaza cuotas menores a 1');
select throws_ok($$update public.rooms set contribution_bs = 100001$$, '23514', null, 'Rechaza cuotas mayores a 100000');
select throws_ok($$update public.rooms set max_participants = 1$$, '23514', null, 'Rechaza cupos menores a 2');
select throws_ok($$update public.rooms set max_participants = 31$$, '23514', null, 'Rechaza cupos mayores a 30');
select throws_ok($$update public.profiles set display_name = '   '$$, '23514', null, 'Rechaza perfiles sin nombre');
select throws_ok($$update public.profiles set display_name = repeat('a', 51)$$, '23514', null, 'Rechaza perfiles de más de 50 caracteres');

insert into public.participants (id, room_id, user_id, name)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', 'Rosa');
select throws_ok($$insert into public.participants (room_id, user_id, name)
  values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Rosa')$$,
  '23505', null, 'Una cuenta no se duplica en una sala');

insert into public.turns (room_id, participant_id, position, turn_date, payout_bs)
values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, '2099-01-01', 400);
select throws_ok($$update public.turns set position = 0$$, '23514', null, 'Los turnos empiezan en 1');
select throws_ok($$delete from public.participants where id = '30000000-0000-4000-8000-000000000001'$$,
  '23503', null, 'Un participante con turno no se borra en cascada');

select * from finish();
rollback;
