import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getOrCreateClientId } from './clientId';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = 'pasanaku_client_id';

describe('getOrCreateClientId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates a valid UUID v4 on first call', () => {
    const id = getOrCreateClientId();
    expect(id).toMatch(UUID_V4_REGEX);
  });

  it('stores the UUID in localStorage under pasanaku_client_id', () => {
    const id = getOrCreateClientId();
    expect(localStorage.getItem(KEY)).toBe(id);
  });

  it('returns the same UUID on subsequent calls (idempotent)', () => {
    const first = getOrCreateClientId();
    const second = getOrCreateClientId();
    const third = getOrCreateClientId();
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('reuses an existing UUID already stored in localStorage', () => {
    const preExisting = '123e4567-e89b-42d3-a456-426614174000';
    localStorage.setItem(KEY, preExisting);
    expect(getOrCreateClientId()).toBe(preExisting);
  });

  /**
   * Property 2: Client ID es UUID v4 válido en primer uso
   * Validates: Requirements 1.1
   */
  it('property: always returns a valid UUID v4 and stores it when localStorage is empty', () => {
    fc.assert(
      fc.property(fc.boolean(), () => {
        localStorage.clear();
        const id = getOrCreateClientId();
        // Must match UUID v4 pattern
        expect(id).toMatch(UUID_V4_REGEX);
        // Must be persisted in localStorage
        expect(localStorage.getItem(KEY)).toBe(id);
        // Clean up for next iteration
        localStorage.clear();
      })
    );
  });
});

/**
 * Property 1: Client ID idempotencia
 * Validates: Requirements 1.2
 *
 * For any UUID string pre-stored in localStorage, repeated calls to
 * getOrCreateClientId() must always return that exact same value.
 */
describe('getOrCreateClientId — property tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Property 1: always returns the same stored UUID across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (storedUuid) => {
          // Arrange: pre-populate localStorage with a known UUID
          localStorage.setItem(KEY, storedUuid);

          // Act: call the function multiple times
          const first = getOrCreateClientId();
          const second = getOrCreateClientId();
          const third = getOrCreateClientId();

          // Assert: all calls return the pre-stored UUID unchanged
          return first === storedUuid && second === storedUuid && third === storedUuid;
        }
      )
    );
  });
});
