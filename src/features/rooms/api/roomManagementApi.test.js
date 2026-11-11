import { beforeEach, expect, it, vi } from 'vitest';
import { cancelRoom, removeParticipant } from './roomManagementApi';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { rpc } }));
beforeEach(() => vi.resetAllMocks());
it('elimina solo mediante RPC con el id de la participación', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  expect(await removeParticipant('p-1')).toEqual({ data: null });
  expect(rpc).toHaveBeenCalledExactlyOnceWith('remove_participant', { participant_id: 'p-1' });
});
it('cancela solo mediante RPC con el id de la sala', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  await cancelRoom('r-1');
  expect(rpc).toHaveBeenCalledExactlyOnceWith('cancel_room', { room_id: 'r-1' });
});
it.each(['NOT_HOST', 'CANNOT_REMOVE_HOST', 'ROOM_NOT_WAITING'])('propaga el error de negocio %s', async code => {
  rpc.mockResolvedValue({ data: null, error: { message: code } });
  await expect(removeParticipant('p-1')).rejects.toMatchObject({ name: 'AppError', code });
});
