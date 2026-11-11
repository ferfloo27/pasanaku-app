import { supabase } from '../../../shared/lib/supabase';
import { AppError } from '../../../shared/errors/appError';
import { getRoomPreview, fetchMemberRoom } from './previewApi';

/** Sala visible por RLS, participantes y turnos; nunca escribe directamente. */
export async function fetchRoomState(roomId) {
  try {
    const [roomResult, peopleResult, turnsResult] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('participants').select('id, room_id, user_id, name, joined_at').eq('room_id', roomId).order('joined_at', { ascending: true }),
      supabase.from('turns').select('id, room_id, participant_id, position, turn_date, payout_bs').eq('room_id', roomId).order('position', { ascending: true }),
    ]);
    for (const result of [roomResult, peopleResult, turnsResult]) if (result.error) throw result.error;
    if (!roomResult.data) throw new AppError('ROOM_NOT_FOUND');
    return { data: { room: roomResult.data, participants: peopleResult.data || [], turns: turnsResult.data || [], isMember: true } };
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError(/fetch|network|load failed/i.test(cause?.message || '') ? 'NETWORK' : 'UNKNOWN', cause);
  }
}
const previewData = room => ({ data: { room, participants: [], turns: [], isMember: false } });
export async function loadRoomSession(code) {
  const { data: preview } = await getRoomPreview(code);
  if (!preview.is_member) return previewData(preview);
  try {
    const { data } = await fetchMemberRoom(code);
    return await fetchRoomState(data.room.id);
  } catch (cause) {
    // La membresía puede desaparecer entre preview y SELECT protegido por RLS.
    if (cause.code === 'ROOM_NOT_FOUND') {
      const { data: current } = await getRoomPreview(code);
      if (!current.is_member) return previewData(current);
    }
    throw cause;
  }
}
