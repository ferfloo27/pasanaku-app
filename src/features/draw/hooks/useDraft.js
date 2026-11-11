import { useState } from 'react';
import { buildDraft, moveDraftItem } from '../domain/draft';

export function useDraft(participants, room, random = Math.random) {
  const [draft, setDraft] = useState(() => buildDraft(participants, room, random));
  const ids = new Set(participants.map(person => person.id));
  const participantsChanged = draft.length !== ids.size || draft.some(row => !ids.has(row.participantId));
  const move = (from, to) => setDraft(current => moveDraftItem(current, from, to, room));
  const reshuffle = () => setDraft(buildDraft(participants, room, random));
  return { draft, participantsChanged, move, reshuffle };
}
