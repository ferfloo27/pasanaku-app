/** Conserva los datos persistidos y resuelve nombres e identidades por participación. */
export function resultRows(turns, participants) {
  const people = new Map(participants.map(person => [person.id, person]));
  return [...turns].sort((a, b) => a.position - b.position).map(turn => ({
    ...turn, name: people.get(turn.participant_id)?.name || 'Participante', user_id: people.get(turn.participant_id)?.user_id ?? null,
  }));
}

/** No empezar una animación con la lectura parcial que precede al resync. */
export function hasCompleteDraw(turns, participants) {
  const ids = new Set(participants.map(person => person.id));
  if (ids.size < 2 || ids.size !== participants.length || turns.length !== ids.size) return false;
  const ordered = [...turns].sort((a, b) => a.position - b.position);
  return new Set(turns.map(turn => turn.participant_id)).size === ids.size
    && ordered.every((turn, i) => ids.has(turn.participant_id) && turn.position === i + 1);
}
