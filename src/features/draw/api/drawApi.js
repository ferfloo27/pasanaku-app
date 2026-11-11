import { callRoomRpc } from '../../rooms/api/rpc';
import { AppError } from '../../../shared/errors/appError';

export async function confirmDraw(roomId, order) {
  try { return await callRoomRpc('confirm_draw', { room_id: roomId, participant_ids: order }); }
  catch (cause) {
    if (['PARTICIPANTS_CHANGED', 'ROOM_NOT_WAITING', 'NOT_ENOUGH_PARTICIPANTS'].includes(cause.code)) throw cause;
    throw new AppError('DRAW_FAILED', cause);
  }
}
