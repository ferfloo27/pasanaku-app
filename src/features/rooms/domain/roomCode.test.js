import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRoomCode } from './roomCode';

const VALID_CHARSET = /^[A-Z0-9]{6}$/;

describe('generateRoomCode', () => {
  it('returns a string of exactly 6 characters', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  it('only contains uppercase letters and digits', () => {
    expect(generateRoomCode()).toMatch(VALID_CHARSET);
  });

  it('produces different codes on successive calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    // With 36^6 ≈ 2.2 billion possible codes, 20 calls producing all the same value is impossible
    expect(codes.size).toBeGreaterThan(1);
  });

  /**
   * Property 3: Código de sala tiene formato correcto
   * Validates: Requirements 3.2
   *
   * Para cualquier número de invocaciones a generateRoomCode(), cada resultado
   * debe ser exactamente 6 caracteres y cada carácter debe pertenecer a [A-Z0-9].
   */
  it('Property 3 — every generated code has exactly 6 chars from [A-Z0-9]', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        (n) => {
          const count = n + 1; // at least 1 invocation
          for (let i = 0; i < count; i++) {
            const code = generateRoomCode();
            // Must be exactly 6 characters long
            if (code.length !== 6) return false;
            // Each character must belong to [A-Z0-9]
            for (const char of code) {
              if (!/^[A-Z0-9]$/.test(char)) return false;
            }
          }
          return true;
        }
      )
    );
  });
});
