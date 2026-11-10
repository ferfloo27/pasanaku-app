import { expect, it } from 'vitest';
import fc from 'fast-check';
import { suggestedDisplayName } from './googleName';

it('propiedad 13: vincular Google conserva exactamente todo nombre existente no vacío', () => {
  fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 50 }).filter(name => name.trim().length > 0), fc.string(), (name, googleName) => {
    expect(suggestedDisplayName({ display_name: name }, { user_metadata: { full_name: googleName } })).toBe(name);
  }));
});
it('sugiere el nombre de Google solo cuando falta el perfil, sin guardarlo', () => {
  expect(suggestedDisplayName(null, { user_metadata: { full_name: ' Lucía Mamani ' } })).toBe('Lucía Mamani');
  expect(suggestedDisplayName({ display_name: '' }, { user_metadata: { name: 'Rosa' } })).toBe('Rosa');
  expect(suggestedDisplayName(null, null)).toBe('');
});
