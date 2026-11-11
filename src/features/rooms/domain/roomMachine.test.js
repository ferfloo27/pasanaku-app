import { expect, it } from 'vitest';
import fc from 'fast-check';
import { initialRoomState, roomReducer } from './roomMachine';
const room = { id: 'room', status: 'waiting', host_name: 'Rosa', host_user_id: 'u' };
const participants = [{ id: 'own', user_id: 'u' }, { id: 'other', user_id: 'v' }];
const load = (status = 'waiting', isMember = true) => roomReducer(initialRoomState, { type: 'LOADED', userId: 'u', data: { room: { ...room, status }, participants, turns: [], isMember } });
it('carga cada estado de entrada sin revelar sorteos anteriores', () => {
  expect(load().status).toBe('lobby'); expect(load('drawn').status).toBe('results');
  expect(load('cancelled').status).toBe('cancelled'); expect(load('waiting', false).status).toBe('preview');
});
it('revela solamente el cambio en vivo waiting→drawn y conserva resultados al resincronizar', () => {
  const live = roomReducer(load(), { type: 'ROOM_UPDATED', room: { id: 'room', status: 'drawn' } });
  expect(live.status).toBe('revealing'); expect(live.room.host_name).toBe('Rosa');
  expect(roomReducer(live, { type: 'SYNCED', data: { room: { ...room, status: 'drawn' }, participants, turns: [{ id: 'turn' }], isMember: true } }).status).toBe('revealing');
  expect(roomReducer(live, { type: 'REVEAL_FINISHED' }).status).toBe('results');
});
it('elimina por PK, distingue la propia membresía y conserva los datos del anfitrión', () => {
  const otherRemoved = roomReducer(load(), { type: 'PARTICIPANT_DELETED', participantId: 'other' });
  expect(otherRemoved.status).toBe('lobby'); expect(otherRemoved.participants).toHaveLength(1);
  const ownRemoved = roomReducer(load(), { type: 'PARTICIPANT_DELETED', participantId: 'own' });
  expect(ownRemoved.status).toBe('removed'); expect(ownRemoved.room.host_name).toBe('Rosa');
  expect(roomReducer(load(), { type: 'SYNCED', data: { room, isMember: false } }).status).toBe('removed');
});
it('cancela desde lobby/borrador y limita el borrador a salas waiting', () => {
  const drafting = roomReducer(load(), { type: 'START_DRAFT' }); expect(drafting.status).toBe('drafting');
  expect(roomReducer(drafting, { type: 'CANCEL_DRAFT' }).status).toBe('lobby');
  expect(roomReducer(drafting, { type: 'ROOM_UPDATED', room: { id: 'room', status: 'cancelled' } }).status).toBe('cancelled');
  expect(roomReducer(load('drawn'), { type: 'START_DRAFT' }).status).toBe('results');
});
it('no duplica altas, no muta entradas e ignora eventos de otra sala', () => {
  fc.assert(fc.property(fc.array(fc.uuid(), { maxLength: 20 }), ids => {
    const initial = load();
    const final = ids.reduce((state, id) => roomReducer(state, { type: 'PARTICIPANT_INSERTED', participant: { id, room_id: 'room' } }), initial);
    expect(new Set(final.participants.map(p => p.id)).size).toBe(final.participants.length);
    expect(initial.participants).toEqual(participants);
  }));
  expect(roomReducer(load(), { type: 'ROOM_UPDATED', room: { id: 'foreign', status: 'cancelled' } }).status).toBe('lobby');
});
it('START_DRAFT exige anfitrión y al menos dos participantes', () => {
  const lobby = load();
  expect(roomReducer({ ...lobby, userId: 'outsider' }, { type: 'START_DRAFT' }).status).toBe('lobby');
  expect(roomReducer({ ...lobby, participants: participants.slice(0, 1) }, { type: 'START_DRAFT' }).status).toBe('lobby');
});
it('las marcas de nuevas altas se limpian tras la señal temporal', () => {
  const added = roomReducer(load(), { type: 'PARTICIPANT_INSERTED', participant: { id: 'new', room_id: 'room' } });
  expect(added.newParticipantIds).toEqual(['new']);
  expect(roomReducer(added, { type: 'PARTICIPANT_HIGHLIGHT_FINISHED', participantId: 'new' }).newParticipantIds).toEqual([]);
});
it('una sala cancelada no miembro se mantiene como pre-unión', () => {
  expect(load('cancelled', false).status).toBe('preview');
});

