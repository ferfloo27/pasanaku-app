import { supabase } from '../../../shared/lib/supabase';
import { AppError } from '../../../shared/errors/appError';
import { isValidCode } from '../domain/roomCode';
import { callRoomRpc } from './rpc';

function validCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!isValidCode(code)) throw new AppError('ROOM_NOT_FOUND');
  return code;
}
export async function getRoomPreview(value) {
  const { data } = await callRoomRpc('get_room_preview', { code: validCode(value) });
  const preview = Array.isArray(data) ? data[0] : data;
  if (!preview) throw new AppError('ROOM_NOT_FOUND');
  return { data: preview };
}
export async function joinRoom(value) {
  return callRoomRpc('join_room', { code: validCode(value) });
}
export async function fetchMemberRoom(value) {
  const code = validCode(value);
  try {
    const { data: room, error } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle();
    if (error) throw error;
    if (!room) throw new AppError('ROOM_NOT_FOUND');
    const { data: participants, error: participantsError } = await supabase.from('participants')
      .select('id, user_id, name, joined_at').eq('room_id', room.id).order('joined_at', { ascending: true });
    if (participantsError) throw participantsError;
    return { data: { room, participants: participants || [] } };
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError(/fetch|network|load failed/i.test(cause?.message || '') ? 'NETWORK' : 'UNKNOWN', cause);
  }
}
