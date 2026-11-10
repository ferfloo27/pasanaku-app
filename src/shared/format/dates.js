const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Formats an ISO date string (YYYY-MM-DD or YYYY-MM) as "Mes YYYY" in Spanish.
 * @param {string} dateStr - e.g. "2026-01-01" or "2026-01"
 * @returns {string} e.g. "Enero 2026"
 */
export function formatMonth(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return `${MONTHS_ES[month - 1]} ${year}`;
}

const MONTHS_SHORT_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Formatea una fecha ISO sin depender de la zona horaria del navegador. */
export function formatTurnDate(dateStr, frequency) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new RangeError('Fecha ISO inválida.');
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateStr) throw new RangeError('Fecha ISO inválida.');
  const year = dateStr.slice(0, 4);
  if (frequency === 'monthly') return `${MONTHS_ES[date.getUTCMonth()]} ${year}`;
  if (frequency === 'weekly' || frequency === 'biweekly') return `${date.getUTCDate()} ${MONTHS_SHORT_ES[date.getUTCMonth()]} ${year}`;
  throw new RangeError('Frecuencia inválida.');
}
