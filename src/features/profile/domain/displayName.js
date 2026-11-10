export function validateDisplayName(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  const length = Array.from(value).length;
  return length >= 1 && length <= 50
    ? { ok: true, value, error: null }
    : { ok: false, value, error: 'INVALID_INPUT' };
}
