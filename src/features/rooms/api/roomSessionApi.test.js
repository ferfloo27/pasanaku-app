import { beforeEach, expect, it, vi } from 'vitest';
import { fetchRoomState, loadRoomSession } from './roomSessionApi';
const { from, getRoomPreview, fetchMemberRoom } = vi.hoisted(() => ({ from: vi.fn(), getRoomPreview: vi.fn(), fetchMemberRoom: vi.fn() }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { from } }));
vi.mock('./previewApi', () => ({ getRoomPreview, fetchMemberRoom }));
let answers;
beforeEach(() => {
  vi.resetAllMocks(); answers = {};
  from.mockImplementation(table => { const query = { select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query), maybeSingle: vi.fn(() => Promise.resolve(answers[table])), then: (resolve, reject) => Promise.resolve(answers[table]).then(resolve, reject) }; return query; });
});
it('carga sala, participantes y turnos en orden sin escrituras', async () => {
  answers.rooms = { data: { id: 'r', status: 'drawn' } }; answers.participants = { data: [{ id: 'p' }] }; answers.turns = { data: [{ id: 't' }] };
  expect(await fetchRoomState('r')).toEqual({ data: { room: { id: 'r', status: 'drawn' }, participants: [{ id: 'p' }], turns: [{ id: 't' }], isMember: true } });
  expect(from.mock.calls.map(([name]) => name).sort()).toEqual(['participants', 'rooms', 'turns']);
});
it('usa el preview para no miembros y evita consultas privadas', async () => {
  getRoomPreview.mockResolvedValue({ data: { code: 'ABC123', is_member: false, status: 'waiting' } });
  expect((await loadRoomSession('ABC123')).data.isMember).toBe(false);
  expect(from).not.toHaveBeenCalled(); expect(fetchMemberRoom).not.toHaveBeenCalled();
});
it('resuelve membresía con RLS y traduce fallos de red o membresía perdida', async () => {
  getRoomPreview.mockResolvedValue({ data: { is_member: true } }); fetchMemberRoom.mockResolvedValue({ data: { room: { id: 'r' } } });
  answers.rooms = { data: null }; answers.participants = { data: [] }; answers.turns = { data: [] };
  await expect(loadRoomSession('ABC123')).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  answers.rooms = { error: new TypeError('Failed to fetch') };
  await expect(fetchRoomState('r')).rejects.toMatchObject({ code: 'NETWORK' });
});
