import { expect, it, vi } from 'vitest';
import { createRoom } from './createRoomApi';
import { callRoomRpc } from './rpc';
vi.mock('./rpc', () => ({ callRoomRpc: vi.fn() }));

it('envía los campos de creación normalizados a la RPC y devuelve su sala', async () => {
  callRoomRpc.mockResolvedValue({ data: { code: 'ABC123' } });
  await expect(createRoom({ name: '  Familia  ', contributionBs: '200', frequency: 'monthly', startDate: '2026-11', maxParticipants: '30' }))
    .resolves.toEqual({ data: { code: 'ABC123' } });
  expect(callRoomRpc).toHaveBeenCalledWith('create_room', { name: 'Familia', contribution_bs: 200, frequency: 'monthly', start_date: '2026-11-01', max_participants: 30 });
});

it('conserva el día semanal y propaga los errores de la RPC', async () => {
  const failure = new Error('NETWORK');
  callRoomRpc.mockRejectedValue(failure);
  await expect(createRoom({ name: 'Familia', contributionBs: 200, frequency: 'weekly', startDate: '2026-11-15', maxParticipants: 4 })).rejects.toBe(failure);
  expect(callRoomRpc).toHaveBeenLastCalledWith('create_room', expect.objectContaining({ start_date: '2026-11-15' }));
});
