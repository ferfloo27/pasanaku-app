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
