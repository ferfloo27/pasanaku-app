const frequencies = ['weekly', 'biweekly', 'monthly'];

function isIntegerInRange(value, min, max) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function isMonth(value) {
  return typeof value === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !isMonth(value.slice(0, 7))) return false;
  // UTC round-trip rejects rolled-over dates (e.g. February 30), without local time zones.
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Fields: name, contributionBs, frequency, startDate, maxParticipants.
 * Numeric fields accept numbers or digit-only strings, as emitted by MoneyField.
 * Monthly startDate is YYYY-MM; weekly/biweekly is YYYY-MM-DD.
 * The caller supplies today as YYYY-MM-DD in America/La_Paz and converts
 * a validated monthly value to YYYY-MM-01 before calling the create_room RPC.
 */
export function validateRoomForm(values, today) {
  const errors = {};
  const nameLength = typeof values.name === 'string' ? Array.from(values.name.trim()).length : 0;
  if (nameLength < 1 || nameLength > 60) errors.name = 'INVALID_INPUT';
  if (!isIntegerInRange(values.contributionBs, 1, 100000)) errors.contributionBs = 'INVALID_INPUT';
  if (!frequencies.includes(values.frequency)) errors.frequency = 'INVALID_INPUT';

  const monthly = values.frequency === 'monthly';
  const validDate = monthly ? isMonth(values.startDate) : isDay(values.startDate);
  const minimum = monthly && isDay(today) ? today.slice(0, 7) : today;
  if (!isDay(today) || !validDate || values.startDate < minimum) errors.startDate = 'INVALID_INPUT';

  if (!isIntegerInRange(values.maxParticipants, 2, 30)) errors.maxParticipants = 'INVALID_INPUT';
  return { ok: Object.keys(errors).length === 0, errors };
}

export const payoutPerTurn = (contributionBs, n) => contributionBs * n;
