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

vi.mock('../features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'auth-user-id' } }) }));
const { profileMock } = vi.hoisted(() => ({ profileMock: { profile: null } }));
vi.mock('../features/profile/hooks/useProfile', () => ({ useProfile: () => profileMock }));

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
   * Helper: renders with a profile name, fills in a valid month, and submits.
   * Returns after all async state updates have settled.
   */
  async function submitWithName(name) {
    vi.clearAllMocks();
    profileMock.profile = { display_name: name };
    const { unmount } = render(<CreateRoomForm onBack={vi.fn()} />);

    const monthInput = document.querySelector('input[type="month"]');
    const submitButton = screen.getByRole('button', { name: /crear sala/i });

    await act(async () => {
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
  it('usa el uid de Auth al crear, sin generar ni guardar una identidad local', async () => {
    mockCreateRoom.mockResolvedValue({ data: { code: 'ABC123' }, error: null });
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    try {
      await submitWithName('Lucía');
      expect(mockCreateRoom).toHaveBeenCalledWith({ hostName: 'Lucía', startMonth: '2099-12-01', clientId: 'auth-user-id' });
      expect(storage).not.toHaveBeenCalled();
    } finally { storage.mockRestore(); }
  });

  it('Property 4b — whitespace-only strings: createRoom is never called', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate strings containing only space characters (length 1–100)
        fc.string({ unit: fc.constant(' '), minLength: 1, maxLength: 100 }),
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
        // La validación cuenta los caracteres después de quitar espacios exteriores.
        fc.string({ minLength: 51, maxLength: 200 }).filter(s => s.trim().length > 50),
        async (name) => {
          await submitWithName(name);
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
      fc.string({ unit: fc.constant(' '), minLength: 1, maxLength: 100 }),
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
  }, 15000); // 100 montajes reales de React necesitan margen en equipos con carga.
});
