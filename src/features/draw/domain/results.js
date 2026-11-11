/** Conserva los datos persistidos y resuelve nombres e identidades por participación. */
export function resultRows(turns, participants) {
  const people = new Map(participants.map(person => [person.id, person]));
  return [...turns].sort((a, b) => a.position - b.position).map(turn => ({
    ...turn, name: people.get(turn.participant_id)?.name || 'Participante', user_id: people.get(turn.participant_id)?.user_id ?? null,
  }));
}
