import { beforeEach, expect, it, vi } from 'vitest';
import { listMyRooms } from './roomsApi';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { rpc } }));
beforeEach(() => vi.resetAllMocks());
it('consulta la RPC sin identidad enviada por el cliente y conserva el orden de actividad', async () => {
  const rooms = [{ id: 'recent', status: 'drawn' }, { id: 'old', status: 'waiting' }];
  rpc.mockResolvedValue({ data: rooms, error: null });
  expect(await listMyRooms()).toEqual({ data: rooms });
  expect(rpc).toHaveBeenCalledWith('list_my_rooms');
});
it('convierte errores de conexión en AppError sin mostrar el texto técnico', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'internal database detail' } });
  await expect(listMyRooms()).rejects.toMatchObject({ name: 'AppError', code: 'UNKNOWN' });
  rpc.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(listMyRooms()).rejects.toMatchObject({ code: 'NETWORK' });
});
it('traduce códigos exactos de PostgreSQL y conserva argumentos de la RPC', async () => {
  const { callRoomRpc } = await import('./rpc');
  rpc.mockResolvedValue({ data: null, error: { message: 'ROOM_FULL' } });
  await expect(callRoomRpc('join_room', { code: 'ABC123' })).rejects.toMatchObject({ code: 'ROOM_FULL' });
  expect(rpc).toHaveBeenCalledWith('join_room', { code: 'ABC123' });
});
