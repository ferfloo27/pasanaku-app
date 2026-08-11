import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as fc from 'fast-check';
import CreateRoomForm from './CreateRoomForm';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock createRoom from roomService
const mockCreateRoom = vi.fn();
vi.mock('../services/roomService', () => ({
  createRoom: (...args) => mockCreateRoom(...args),
}));

// Mock getOrCreateClientId
vi.mock('../utils/clientId', () => ({
  getOrCreateClientId: () => 'test-client-id',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Property 4: Validación de nombre rechaza entradas inválidas
 * Validates: Requirements 3.1
 *
 * Para cualquier string de nombre que esté vacío, sea sólo espacios en blanco,
 * o tenga más de 50 caracteres, el formulario debe rechazar el envío sin llamar a createRoom.
 */
describe('CreateRoomForm — Property 4: Validación de nombre rechaza entradas inválidas', () => {
  // Arbitrary that generates a valid month value (current or future)
  const validMonth = '2099-12';

  /**
   * Helper: renders the form, types a name, fills in a valid month, and submits.
   * Returns after all async state updates have settled.
   */
  async function submitWithName(name) {
    const { unmount } = render(<CreateRoomForm onBack={vi.fn()} />);

    const nameInput = screen.getByRole('textbox', { name: /tu nombre/i });
    const monthInput = document.querySelector('input[type="month"]');
    const submitButton = screen.getByRole('button', { name: /crear sala/i });

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: name } });
      fireEvent.change(monthInput, { target: { value: validMonth } });
      fireEvent.click(submitButton);
    });

    unmount();
  }

  it('Property 4a — empty string: createRoom is never called', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(''),
        async (name) => {
          await submitWithName(name);
          expect(mockCreateRoom).not.toHaveBeenCalled();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 1 }
    );
  });

  it('Property 4b — whitespace-only strings: createRoom is never called', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings containing only space characters (length 1–100)
        fc.stringOf(fc.constant(' '), { minLength: 1, maxLength: 100 }),
        async (name) => {
          await submitWithName(name);
          expect(mockCreateRoom).not.toHaveBeenCalled();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 4c — strings longer than 50 chars: createRoom is never called', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings with length strictly > 50 (51–200 chars, no whitespace-only restriction)
        fc.string({ minLength: 51, maxLength: 200 }),
        async (name) => {
          // Ensure the string has at least one non-space character so it's not whitespace-only
          // (that edge case is tested separately above). We pad with 'x' if needed.
          const testName = name.trim().length === 0 ? 'x'.repeat(51) : name;
          // Only run this sub-test if the raw string is > 50 chars
          // (trimming could reduce it, but the input itself exceeds the max)
          await submitWithName(testName.length > 50 ? testName : 'x'.repeat(51));
          expect(mockCreateRoom).not.toHaveBeenCalled();
          vi.clearAllMocks();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4 — combined: all invalid name variants never call createRoom', async () => {
    // Combine all three invalid categories into one property
    const invalidNameArb = fc.oneof(
      // Empty string
      fc.constant(''),
      // Whitespace-only (1–100 spaces)
      fc.stringOf(fc.constant(' '), { minLength: 1, maxLength: 100 }),
      // Strings longer than 50 characters (with at least one non-space char to avoid overlap)
      fc.string({ minLength: 51, maxLength: 200 }).filter(s => s.trim().length > 50)
    );

    await fc.assert(
      fc.asyncProperty(invalidNameArb, async (name) => {
        await submitWithName(name);
        expect(mockCreateRoom).not.toHaveBeenCalled();
        vi.clearAllMocks();
      }),
      { numRuns: 100 }
    );
  });
});
