import { supabase } from '../lib/supabaseClient';

/**
 * Fetches a single room by its code.
 * @param {string} code
 * @returns {{ data: Room | null, error }}
 */
export async function fetchRoom(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();
  return { data: data ?? null, error };
}

/**
 * Fetches all turns for a room joined with participant names, ordered by position asc.
 * @param {string} roomId
 * @returns {{ data: Turn[] | null, error }}
 */
export async function fetchTurns(roomId) {
  const { data, error } = await supabase
    .from('turns')
    .select('position, assigned_month, participants(name)')
    .eq('room_id', roomId)
    .order('position', { ascending: true });
  return { data: data ?? null, error };
}
