/**
 * Retrieves the client UUID from localStorage, or generates and stores a new one.
 * @returns {string} UUID v4
 */
export function getOrCreateClientId() {
  const KEY = 'pasanaku_client_id';
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}
