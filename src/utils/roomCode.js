const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a random 6-character alphanumeric uppercase code.
 * @returns {string}
 */
export function generateRoomCode() {
  return Array.from({ length: 6 }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join('');
}
