import { callRoomRpc } from './rpc';

export function removeParticipant(participantId) {
  return callRoomRpc('remove_participant', { participant_id: participantId });
}
export function cancelRoom(roomId) {
  return callRoomRpc('cancel_room', { room_id: roomId });
}
