import { callRoomRpc } from './rpc';

// La RPC limita la lectura a membresías de auth.uid(), incluye cancelaciones
// recientes y ordena por last_activity_at. No envía una identidad del cliente.
export function listMyRooms() { return callRoomRpc('list_my_rooms'); }
export { createRoom } from './createRoomApi';
