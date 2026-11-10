import { supabase } from '../shared/lib/supabase';

/**
 * Finds a room by code (case-insensitive) and joins as participant.
 *
 * @param {{ code: string, name: string, clientId: string }} params
 * @returns {Promise<{ data: { room: object, participant: object } | null, error: { message: string } | null }>}
 */
export async function joinRoom({ code, name, clientId }) {
  // Find room by code (case-insensitive)
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .ilike('code', code)
    .single();

  if (roomError || !room) {
    return { data: null, error: { message: 'Sala no encontrada' } };
  }

  if (room.status === 'drawn') {
    return { data: null, error: { message: 'El sorteo ya fue realizado en esta sala' } };
  }

  // Insert participant
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({ room_id: room.id, name, client_id: clientId })
    .select()
    .single();

  if (participantError) {
    return { data: null, error: { message: participantError.message || 'Error al unirse a la sala' } };
  }

  return { data: { room, participant }, error: null };
}
