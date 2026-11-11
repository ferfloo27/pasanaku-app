/** Fecha ISO sin hora: el calendario del sorteo se calcula siempre en UTC. */
export function turnDate(startDate, frequency, position) {
  if (!Number.isInteger(position) || position < 1) throw new RangeError('INVALID_POSITION');
  const date = new Date(`${startDate}T00:00:00Z`);
  if (frequency === 'monthly') date.setUTCMonth(date.getUTCMonth() + position - 1);
  else if (frequency === 'weekly' || frequency === 'biweekly') date.setUTCDate(date.getUTCDate() + (position - 1) * (frequency === 'weekly' ? 7 : 15));
  else throw new RangeError('INVALID_FREQUENCY');
  return date.toISOString().slice(0, 10);
}
