import { expect, it, vi } from 'vitest';
import { confirmDraw } from './drawApi';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { rpc } }));
it('confirma por RPC con el orden exacto de participaciones', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  await confirmDraw('room', ['c', 'a', 'b']);
  expect(rpc).toHaveBeenCalledWith('confirm_draw', { room_id: 'room', participant_ids: ['c', 'a', 'b'] });
});
it.each(['PARTICIPANTS_CHANGED', 'ROOM_NOT_WAITING', 'NOT_ENOUGH_PARTICIPANTS'])('conserva %s para recuperar el estado', async code => {
  rpc.mockResolvedValue({ error: { message: code } });
  await expect(confirmDraw('r', ['a', 'b'])).rejects.toMatchObject({ code });
});
it('convierte errores genéricos y de red en fallo que conserva borrador', async () => {
  rpc.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(confirmDraw('r', ['a', 'b'])).rejects.toMatchObject({ code: 'DRAW_FAILED' });
});
