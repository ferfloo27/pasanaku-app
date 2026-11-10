import { expect, it } from 'vitest';
import fc from 'fast-check';
import { validateDisplayName } from './displayName';

it('normaliza espacios externos, conserva el nombre y cuenta caracteres Unicode', () => {
  expect(validateDisplayName('  Lucía Mamani  ')).toEqual({ ok: true, value: 'Lucía Mamani', error: null });
  expect(validateDisplayName('🦙'.repeat(50)).ok).toBe(true);
  expect(validateDisplayName('🦙'.repeat(51)).ok).toBe(false);
});
it('acepta exactamente los nombres con 1–50 caracteres después de trim', () => {
  fc.assert(fc.property(fc.string(), name => {
    const result = validateDisplayName(name);
    const size = Array.from(name.trim()).length;
    expect(result.ok).toBe(size >= 1 && size <= 50);
    if (result.ok) expect(result.value).toBe(name.trim());
  }));
  fc.assert(fc.property(fc.integer({ min: 51, max: 150 }), size => {
    expect(validateDisplayName(`  ${'a'.repeat(size)}  `).ok).toBe(false);
  }));
});
it.each(['', '   ', '\n\t', null, undefined, 3])('rechaza un nombre vacío o no textual: %s', value => {
  expect(validateDisplayName(value)).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
});
