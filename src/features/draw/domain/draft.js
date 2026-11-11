import { shuffle } from './shuffle';
import { turnDate } from './schedule';

const scheduleRows = (rows, room) => rows.map((row, i) => ({ ...row, position: i + 1, turnDate: turnDate(room.start_date, room.frequency, i + 1) }));
export function buildDraft(participants, room, random = Math.random) {
  return scheduleRows(shuffle(participants, random).map(person => ({ participantId: person.id, name: person.name })), room);
}
export function moveDraftItem(draft, fromIndex, toIndex, room) {
  const rows = [...draft];
  const [item] = rows.splice(fromIndex, 1);
  rows.splice(toIndex, 0, item);
  return scheduleRows(rows, room);
}
export const draftToOrder = draft => draft.map(row => row.participantId);
