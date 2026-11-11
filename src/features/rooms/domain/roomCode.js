const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function normalizeCode(value) {
  return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : '';
}

export function isValidCode(value) {
  return typeof value === 'string' && /^[A-Z0-9]{6}$/.test(value);
}

/**
 * Generates a random 6-character alphanumeric uppercase code.
 * @returns {string}
 */
export function generateRoomCode() {
  return Array.from({ length: 6 }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join('');
}
