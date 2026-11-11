import { callRoomRpc } from './rpc';

export function createRoom(values) {
  return callRoomRpc('create_room', {
    name: values.name.trim(), contribution_bs: Number(values.contributionBs),
    frequency: values.frequency,
    start_date: values.frequency === 'monthly' ? `${values.startDate}-01` : values.startDate,
    max_participants: Number(values.maxParticipants),
  });
}
