import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRoomCode, normalizeCode, isValidCode } from './roomCode';

const VALID_CHARSET = /^[A-Z0-9]{6}$/;

describe('códigos de sala v2', () => {
  it('normaliza mayúsculas, descarta separadores y limita a seis caracteres', () => {
    expect(normalizeCode(' k7-qm3p-extra ')).toBe('K7QM3P');
    expect(normalizeCode('ab')).toBe('AB');
  });

  it('acepta solamente seis caracteres ASCII canónicos', () => {
    expect(isValidCode('K7QM3P')).toBe(true);
    for (const value of ['k7qm3p', ' ABC12', 'ABCDE', 'ABCDEFG', 'ABC!12', null, undefined, 123456, {}, Symbol('code')]) {
      expect(isValidCode(value)).toBe(false);
    }
  });

  it('trata los valores que no son cadenas como un código vacío', () => {
    for (const value of [null, undefined, 123456, {}, [], Symbol('code')]) {
      expect(normalizeCode(value)).toBe('');
    }
  });

  it('Propiedad 1: toda entrada con al menos seis alfanuméricos produce un código válido', () => {
    const ascii = fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
    fc.assert(fc.property(fc.array(ascii, { minLength: 6, maxLength: 100 }), chars => {
      const normalized = normalizeCode(` ${chars.join('-')} `);
      expect(normalized).toHaveLength(6);
      expect(isValidCode(normalized)).toBe(true);
      expect(normalizeCode(normalized)).toBe(normalized);
    }));
  });

  it('normaliza cualquier valor sin lanzar y nunca devuelve caracteres inválidos', () => {
    fc.assert(fc.property(fc.anything(), value => {
      expect(normalizeCode(value)).toMatch(/^[A-Z0-9]{0,6}$/);
    }));
  });
});

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
