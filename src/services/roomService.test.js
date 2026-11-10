import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mock the Supabase client module BEFORE importing roomService so that
// roomService.js never calls createClient (which requires env vars).
// ---------------------------------------------------------------------------
vi.mock('../shared/lib/supabase', () => {
  // We'll replace these with fresh spies in beforeEach via the mutable ref below.
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

// Import after mock is in place
import { drawTurns } from './roomService';
import { supabase } from '../shared/lib/supabase';

// ---------------------------------------------------------------------------
// Helper: re-implement addMonths to compute expected assigned_month values
// (mirrors the private addMonths() in roomService.js)
// ---------------------------------------------------------------------------
function addMonths(dateStr, n) {
  const [year, month] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1 + n, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

// ---------------------------------------------------------------------------
// Builders for chainable Supabase mock
// ---------------------------------------------------------------------------

/**
 * Creates a mock for the `turns` table insert that captures rows and resolves ok.
 * The captured rows are stored in the `captured` array passed in.
 */
function makeTurnsMock(captured) {
  return {
    insert: vi.fn((rows) => {
      captured.push(...rows);
      return Promise.resolve({ error: null });
    }),
  };
}

/**
 * Creates a mock for the `rooms` table update chain that resolves ok.
 */
function makeRoomsMock() {
  const eqFn = vi.fn(() => Promise.resolve({ error: null }));
  return {
    update: vi.fn(() => ({ eq: eqFn })),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('drawTurns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 6: Posiciones y meses cubren todos los participantes sin duplicados
   * Validates: Requirements 6.2, 6.3
   *
   * For any list of N participants (1..20) and any startMonth string,
   * drawTurns must produce:
   *   - Exactly N turn records
   *   - Positions that form the set {1, 2, …, N} (no duplicates, no gaps)
   *   - assigned_month equal to addMonths(startMonth, position - 1) for each turn
   */
  it('Property 6: posiciones y meses cubren todos los participantes sin duplicados', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1..20 participant objects
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        // Generate a valid start month as "YYYY-MM-01"
        fc.record({
          year: fc.integer({ min: 2000, max: 2100 }),
          month: fc.integer({ min: 1, max: 12 }),
        }),
        async (participants, { year, month }) => {
          const startMonth = `${year}-${String(month).padStart(2, '0')}-01`;
          const roomId = 'room-test-id';

          // Set up fresh mocks for this iteration
          const captured = [];
          supabase.from = vi.fn((table) => {
            if (table === 'turns') return makeTurnsMock(captured);
            if (table === 'rooms') return makeRoomsMock();
            throw new Error(`Unexpected table: ${table}`);
          });

          const { data, error } = await drawTurns({ roomId, participants, startMonth });

          // No error
          expect(error).toBeNull();

          // Exactly N records were inserted
          expect(captured).toHaveLength(participants.length);

          // Positions form the set {1..N} — sort and compare
          const positions = captured.map((t) => t.position).sort((a, b) => a - b);
          const expected = Array.from({ length: participants.length }, (_, i) => i + 1);
          expect(positions).toEqual(expected);

          // assigned_month is correct for each position
          for (const turn of captured) {
            const expectedMonth = addMonths(startMonth, turn.position - 1);
            expect(turn.assigned_month).toBe(expectedMonth);
          }

          // data returned matches what was built
          expect(data).toHaveLength(participants.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});
