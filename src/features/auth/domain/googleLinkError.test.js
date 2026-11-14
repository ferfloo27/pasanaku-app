import { expect, it } from 'vitest';
import fc from 'fast-check';
import { googleLinkError } from './googleLinkError';

it('solo identifica una cuenta existente mediante el código confirmado del proveedor', () => {
  expect(googleLinkError({ code: 'identity_already_exists' }).code).toBe('AUTH_IDENTITY_EXISTS');
  fc.assert(fc.property(fc.string().filter(code => code !== 'identity_already_exists'), code => {
    expect(googleLinkError({ code, message: 'identity_already_exists' }).code).toBe('AUTH_LINK_FAILED');
  }));
});
