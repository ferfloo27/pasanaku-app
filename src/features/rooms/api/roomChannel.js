import { supabase } from '../../../shared/lib/supabase';

// Un canal físico por sala, compartido entre consumidores y retirado al último.
const rooms = new Map();
export function subscribeRoomChannel(roomId, handlers) {
  let entry = rooms.get(roomId);
  const listener = { ...handlers };
  if (!entry) {
    entry = { listeners: new Set(), status: null, channel: null };
    rooms.set(roomId, entry);
    const emit = (name, value) => entry.listeners.forEach(callbacks => callbacks[name]?.(value));
    entry.listeners.add(listener);
    entry.channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, payload => emit('onRoomUpdated', payload.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` }, payload => emit('onParticipantInserted', payload.new))
      // DELETE no admite filtro; bajo RLS old puede contener solo la PK.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'participants' }, payload => emit('onParticipantDeleted', payload.old))
      .subscribe(status => { entry.status = status; emit('onStatus', status); });
  } else {
    entry.listeners.add(listener);
    if (entry.status) listener.onStatus?.(entry.status);
  }
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    entry.listeners.delete(listener);
    if (!entry.listeners.size) {
      rooms.delete(roomId);
      void supabase.removeChannel(entry.channel);
    }
  };
}
