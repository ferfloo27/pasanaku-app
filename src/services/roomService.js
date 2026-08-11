import { supabase } from '../lib/supabaseClient';
import { generateRoomCode } from '../utils/roomCode';
import { shuffle } from '../utils/fisherYates';

/**
 * Creates a new room and inserts the host as first participant.
 * Retries code generation if a collision is detected (max 5 attempts).
 *
 * @param {{ hostName: string, startMonth: string, clientId: string }} params
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createRoom({ hostName, startMonth, clientId }) {
  let roomData = null;
  let lastError = null;

  // Retry up to 5 times on code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({ code, host_name: hostName, start_month: startMonth, status: 'waiting' })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation (code collision)
      if (error.code === '23505') {
        lastError = error;
        continue;
      }
      return { data: null, error };
    }
    roomData = data;
    break;
  }

  if (!roomData) {
    return { data: null, error: lastError || new Error('No se pudo generar un código único') };
  }

  // Insert host as first participant
  const { error: participantError } = await supabase
    .from('participants')
    .insert({ room_id: roomData.id, name: hostName, client_id: clientId });

  if (participantError) {
    return { data: null, error: participantError };
  }

  return { data: roomData, error: null };
}

/**
 * Finds a room by code (case-insensitive) and joins as participant.
 *
 * @param {{ code: string, name: string, clientId: string }} params
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function joinRoom({ code, name, clientId }) {
  const { data: rooms, error: fetchError } = await supabase
    .from('rooms')
    .select()
    .ilike('code', code)
    .limit(1);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  if (!rooms || rooms.length === 0) {
    return { data: null, error: { message: 'Sala no encontrada' } };
  }

  const room = rooms[0];

  if (room.status === 'drawn') {
    return { data: null, error: { message: 'El sorteo ya fue realizado en esta sala' } };
  }

  const { error: participantError } = await supabase
    .from('participants')
    .insert({ room_id: room.id, name, client_id: clientId });

  if (participantError) {
    return { data: null, error: participantError };
  }

  return { data: room, error: null };
}

/**
 * Fetches a single room by its code.
 *
 * @param {string} code
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function fetchRoom(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .ilike('code', code)
    .single();

  return { data: data ?? null, error: error ?? null };
}

/**
 * Fetches all turns for a room joined with participant names, ordered by position.
 *
 * @param {string} roomId
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function fetchTurns(roomId) {
  const { data, error } = await supabase
    .from('turns')
    .select('*, participants(name)')
    .eq('room_id', roomId)
    .order('position', { ascending: true });

  return { data: data ?? null, error: error ?? null };
}

/**
 * Adds n months to a date string and returns a new ISO date string (YYYY-MM-01).
 * Internal helper — not exported.
 *
 * @param {string} dateStr - e.g. "2026-01-01" or "2026-01"
 * @param {number} n - number of months to add
 * @returns {string} e.g. "2026-03-01"
 */
function addMonths(dateStr, n) {
  const [year, month] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1 + n, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Runs the draw: shuffles participants, calculates positions and months,
 * inserts all turns in a batch, then updates room status to 'drawn'.
 *
 * @param {{ roomId: string, participants: Array<{ id: string }>, startMonth: string }} params
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function drawTurns({ roomId, participants, startMonth }) {
  const shuffled = shuffle(participants);

  const turns = shuffled.map((p, i) => ({
    room_id: roomId,
    participant_id: p.id,
    position: i + 1,
    assigned_month: addMonths(startMonth, i),
  }));

  const { error: turnsError } = await supabase
    .from('turns')
    .insert(turns);

  if (turnsError) {
    return { data: null, error: turnsError };
  }

  const { error: statusError } = await supabase
    .from('rooms')
    .update({ status: 'drawn' })
    .eq('id', roomId);

  if (statusError) {
    return { data: null, error: statusError };
  }

  return { data: turns, error: null };
}
