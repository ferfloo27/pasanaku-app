import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import * as fc from 'fast-check';
import { turnDate } from '../../src/features/draw/domain/schedule.js';

// Destino fijo: un contenedor Docker local, nunca una URL ni credenciales de .env.
const container = 'supabase_db_pasanaku-app';
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

test('Propiedad 12: SQL y turnDate coinciden para todas las frecuencias', { timeout: 120000 }, async () => {
  for (const frequency of ['monthly', 'weekly', 'biweekly']) {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 2096, max: 2104 }), fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 2, max: 8 }), async (year, month, count) => {
        const start = `${year}-${String(month).padStart(2, '0')}-${frequency === 'monthly' ? '01' : '25'}`;
        const f = await fixture(count, frequency, start);
        try {
          await sql(`insert into public.participants (room_id, user_id, name) values ${f.users.slice(1, count).map(id => `(${quote(f.room.id)}, ${quote(id)}, 'Paridad')`).join(',')}`);
          await sql(asUser(f.users[0], `select public.confirm_draw(${quote(f.room.id)},
            (select array_agg(id order by user_id) from public.participants where room_id = ${quote(f.room.id)}))`));
          const dates = JSON.parse(await sql(`select json_agg(turn_date order by position) from public.turns where room_id = ${quote(f.room.id)}`));
          assert.deepEqual(dates, Array.from({ length: count }, (_, i) => turnDate(start, frequency, i + 1)));
        } finally { await f.cleanup(); }
      }), { numRuns: 4 });
  }
});

function connection(statement, keepOpen = false) {
  const child = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-qAt',
    '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { stdio: 'pipe' });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
  child.stdin.write(`${statement}\n`);
  if (!keepOpen) child.stdin.end();
  return { child, done, output: () => stdout };
}

async function sql(statement) {
  const result = await connection(statement).done;
  assert.equal(result.code, 0, result.stderr);
  return result.stdout;
}

function asUser(userId, statement) {
  return `begin; set local role authenticated; set local request.jwt.claim.sub = ${quote(userId)};
    ${statement}; commit;`;
}

async function fixture(maxParticipants = 2, frequency = 'monthly', startDate = '2099-01-01') {
  const users = Array.from({ length: maxParticipants + 1 }, () => randomUUID());
  await sql(`insert into auth.users (id) values ${users.map((id) => `(${quote(id)})`).join(',')};
    insert into public.profiles (user_id, display_name) values
    ${users.map((id, i) => `(${quote(id)}, 'Persona ${i}')`).join(',')};`);
  const room = JSON.parse(await sql(asUser(users[0], `select row_to_json(r)
    from public.create_room('Prueba de transacciones', 200, ${quote(frequency)}, ${quote(startDate)}, ${maxParticipants}) r`)));
  return {
    users, room,
    async cleanup() {
      // Solo se borran las filas creadas por esta fixture, con identidades aleatorias propias.
      await sql(`delete from public.turns where room_id = ${quote(room.id)};
        delete from public.participants where room_id = ${quote(room.id)};
        delete from public.rooms where id = ${quote(room.id)};
        delete from public.profiles where user_id in (${users.map(quote).join(',')});
        delete from auth.users where id in (${users.map(quote).join(',')});`);
    },
  };
}

async function until(predicate, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(50);
  }
  throw new Error(`No se cumplió: ${description}`);
}

// Fuerza que ambas transacciones lleguen al mismo bloqueo antes de liberarlo.
// Así la prueba no depende de que dos procesos arranquen "a la vez" por casualidad.
async function raceOnRoom(roomId, statements) {
  const tag = `pasanaku_race_${randomUUID().replaceAll('-', '')}`;
  const gate = connection(`begin; select 1 from public.rooms where id = ${quote(roomId)} for update;
    select 'LOCK_HELD';`, true);
  const pending = [];
  try {
    await until(() => gate.output().includes('LOCK_HELD'), 'bloqueo inicial de la sala');
    for (const statement of statements) {
      pending.push(connection(statement.replace('begin;', `begin; set local application_name = ${quote(tag)};`)).done);
    }
    await until(async () => Number(await sql(`select count(*) from pg_stat_activity
      where wait_event_type = 'Lock' and application_name = ${quote(tag)}
      and pid <> pg_backend_pid()`)) === statements.length, 'ambas conexiones esperando el bloqueo');
  } finally {
    gate.child.stdin.end('commit;\n');
    const released = await gate.done;
    assert.equal(released.code, 0, released.stderr);
  }
  return Promise.all(pending);
}

test('Propiedad 10: dos uniones concurrentes al último cupo admiten exactamente una', { timeout: 120000 }, async () => {
  await fc.assert(fc.asyncProperty(
    fc.integer({ min: 2, max: 30 }), fc.boolean(), async (capacity, reverse) => {
      const f = await fixture(capacity);
      try {
        const existingMembers = f.users.slice(1, capacity - 1);
        if (existingMembers.length) {
          await sql(`insert into public.participants (room_id, user_id, name) values
            ${existingMembers.map((id) => `(${quote(f.room.id)}, ${quote(id)}, 'Miembro de prueba')`).join(',')}`);
        }
        const callers = reverse ? f.users.slice(-2).reverse() : f.users.slice(-2);
        const results = await raceOnRoom(f.room.id, callers.map((id) => asUser(id,
          `select public.join_room(${quote(f.room.code)})`)));
        assert.equal(results.filter((result) => result.code === 0).length, 1);
        assert.match(results.find((result) => result.code !== 0).stderr, /ROOM_FULL/);
        assert.equal(await sql(`select count(*) from public.participants where room_id = ${quote(f.room.id)}`), String(capacity));
      } finally {
        await f.cleanup();
      }
  }), { numRuns: 6 });
});

test('Propiedad 11: dos confirmaciones concurrentes no repiten ni cambian el sorteo', { timeout: 60000 }, async () => {
  const f = await fixture();
  try {
    await sql(asUser(f.users[1], `select public.join_room(${quote(f.room.code)})`));
    const ids = JSON.parse(await sql(`select json_agg(id order by user_id) from public.participants where room_id = ${quote(f.room.id)}`));
    const orders = [ids, [...ids].reverse()];
    const results = await raceOnRoom(f.room.id, orders.map((order) => asUser(f.users[0],
      `select public.confirm_draw(${quote(f.room.id)}, array[${order.map(quote).join(',')}]::uuid[])`)));
    const winner = results.findIndex((result) => result.code === 0);
    assert.equal(results.filter((result) => result.code === 0).length, 1);
    assert.match(results[1 - winner].stderr, /ROOM_NOT_WAITING/);
    const persisted = JSON.parse(await sql(`select json_agg(participant_id order by position) from public.turns where room_id = ${quote(f.room.id)}`));
    assert.deepEqual(persisted, orders[winner]);
    assert.equal(await sql(`select status from public.rooms where id = ${quote(f.room.id)}`), 'drawn');
  } finally {
    await f.cleanup();
  }
});

test('Propiedad 11: un fallo durante INSERT revierte todos los turnos y el estado', { timeout: 60000 }, async () => {
  const f = await fixture();
  const constraintName = `test_failure_${randomUUID().replaceAll('-', '')}`;
  try {
    await sql(asUser(f.users[1], `select public.join_room(${quote(f.room.code)})`));
    await sql(`alter table public.turns add constraint ${constraintName}
      check (room_id <> ${quote(f.room.id)} or position <> 2) not valid;`);
    const result = await connection(asUser(f.users[0], `select public.confirm_draw(${quote(f.room.id)},
      (select array_agg(id) from public.participants where room_id = ${quote(f.room.id)}))`)).done;
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, new RegExp(constraintName));
    assert.equal(await sql(`select count(*) from public.turns where room_id = ${quote(f.room.id)}`), '0');
    assert.equal(await sql(`select status from public.rooms where id = ${quote(f.room.id)}`), 'waiting');
  } finally {
    await sql(`alter table public.turns drop constraint if exists ${constraintName};`);
    await f.cleanup();
  }
});

test('Las fechas persistidas respetan 7 y 15 días, incluso al cruzar mes y año', { timeout: 60000 }, async () => {
  for (const [frequency, start, expected] of [
    ['weekly', '2099-12-29', ['2099-12-29', '2100-01-05']],
    ['biweekly', '2099-01-25', ['2099-01-25', '2099-02-09']],
  ]) {
    const f = await fixture(2, frequency, start);
    try {
      await sql(asUser(f.users[1], `select public.join_room(${quote(f.room.code)})`));
      await sql(asUser(f.users[0], `select public.confirm_draw(${quote(f.room.id)},
        (select array_agg(id order by user_id) from public.participants where room_id = ${quote(f.room.id)}))`));
      const dates = JSON.parse(await sql(`select json_agg(turn_date order by position) from public.turns where room_id = ${quote(f.room.id)}`));
      assert.deepEqual(dates, expected);
    } finally {
      await f.cleanup();
    }
  }
});
