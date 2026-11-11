import { beforeEach, expect, it, vi } from 'vitest';
import { fetchMemberRoom, getRoomPreview, joinRoom } from './previewApi';
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { rpc, from } }));
beforeEach(() => vi.resetAllMocks());

it('obtiene una pre-unión única desde el resultado SETOF sin enviar identidad', async () => {
  const room = { code: 'ABC123', name: 'Familia', is_member: false };
  rpc.mockResolvedValue({ data: [room], error: null });
  expect(await getRoomPreview('abc123')).toEqual({ data: room });
  expect(rpc).toHaveBeenCalledWith('get_room_preview', { code: 'ABC123' });
});
it('rechaza códigos incompletos antes de consultar y resultados vacíos como inexistentes', async () => {
  await expect(getRoomPreview('abc')).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValue({ data: [], error: null });
  await expect(getRoomPreview('ABC123')).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
});
it('no transforma un link inválido en el código de otra sala', async () => {
  rpc.mockResolvedValue({ data: [{ code: 'ABC123' }], error: null });
  for (const code of ['ABC123evil', 'ABC-123', 'ABC12!', null, 123456]) {
    await expect(getRoomPreview(code)).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
  }
  expect(rpc).not.toHaveBeenCalled();
});
it('se une solo por RPC y traduce la carrera por el último cupo', async () => {
  rpc.mockResolvedValueOnce({ data: { id: 'room' }, error: null });
  expect(await joinRoom('ABC123')).toEqual({ data: { id: 'room' } });
  expect(rpc).toHaveBeenCalledWith('join_room', { code: 'ABC123' });
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'ROOM_FULL' } });
  await expect(joinRoom('ABC123')).rejects.toMatchObject({ code: 'ROOM_FULL' });
});
it('lee solo la sala del código y sus participantes mediante RLS', async () => {
  const roomEq = vi.fn().mockReturnValue({ maybeSingle: async () => ({ data: { id: 'room', code: 'ABC123' }, error: null }) });
  const participantEq = vi.fn().mockReturnValue({ order: async () => ({ data: [{ id: 'p', name: 'Ana' }], error: null }) });
  from.mockImplementation(table => ({ select: () => ({ eq: table === 'rooms' ? roomEq : participantEq }) }));
  expect(await fetchMemberRoom('ABC123')).toEqual({ data: { room: { id: 'room', code: 'ABC123' }, participants: [{ id: 'p', name: 'Ana' }] } });
  expect(roomEq).toHaveBeenCalledWith('code', 'ABC123');
  expect(participantEq).toHaveBeenCalledWith('room_id', 'room');
});
