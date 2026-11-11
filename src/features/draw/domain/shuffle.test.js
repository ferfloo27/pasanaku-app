import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shuffle } from './shuffle';

it('usa el generador inyectado sin modificar la entrada', () => {
  const input = Object.freeze(['a', 'b', 'c']);
  expect(shuffle(input, () => 0)).toEqual(['b', 'c', 'a']);
  expect(shuffle(input, () => 0.999)).toEqual(['a', 'b', 'c']);
});

describe('shuffle', () => {
  it('returns an array of the same length', () => {
    expect(shuffle([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  it('contains exactly the same elements as the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result.sort()).toEqual([...input].sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single-element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

/**
 * Property 5: Fisher-Yates produce permutación completa
 * Validates: Requirements 6.1
 */
describe('shuffle — property-based tests', () => {
  it('Property 5: el resultado tiene la misma longitud y los mismos elementos que la entrada', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const result = shuffle(arr);

          // Misma longitud
          expect(result).toHaveLength(arr.length);

          // Mismos elementos (comparación ordenada)
          expect([...result].sort((a, b) => a - b)).toEqual(
            [...arr].sort((a, b) => a - b)
          );
        }
      )
    );
  });
});
