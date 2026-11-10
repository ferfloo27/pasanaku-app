/**
 * Property-based tests for JoinRoomForm name validation.
 *
 * **Validates: Requirements 4.1**
 *
 * Property 4: Validación de nombre rechaza entradas inválidas
 * Verifies that `joinRoom` is never invoked when the name input is invalid:
 *   (a) empty strings
 *   (b) whitespace-only strings
 *   (c) strings with length > 50 characters
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as fc from 'fast-check';
import JoinRoomForm from './JoinRoomForm';

// Mock joinRoom from roomService
vi.mock('../services/roomService', () => ({
  joinRoom: vi.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock getOrCreateClientId so it doesn't touch localStorage
vi.mock('../utils/clientId', () => ({
  getOrCreateClientId: () => 'test-client-id',
}));

import { joinRoom } from '../services/roomService';

const VALID_CODE = 'ABCDEF';

function renderForm() {
  const onBack = vi.fn();
  render(<JoinRoomForm onBack={onBack} />);
}

async function submitWithName(name) {
  const nameInput = screen.getByLabelText(/tu nombre/i);
  const codeInput = screen.getByLabelText(/código de sala/i);
  const submitButton = screen.getByRole('button', { name: /unirse/i });

  await act(async () => {
    fireEvent.change(nameInput, { target: { value: name } });
    fireEvent.change(codeInput, { target: { value: VALID_CODE } });
    fireEvent.click(submitButton);
  });
}

describe('JoinRoomForm — Property 4: validación de nombre rechaza entradas inválidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no llama joinRoom con string vacío', async () => {
    renderForm();
    await submitWithName('');
    expect(joinRoom).not.toHaveBeenCalled();
  });

  it('navega a la sala devuelta por el servicio compartido al unirse', async () => {
    joinRoom.mockResolvedValue({ data: { code: VALID_CODE }, error: null });
    renderForm();

    await submitWithName('Lucía');

    expect(joinRoom).toHaveBeenCalledWith({
      code: VALID_CODE,
      name: 'Lucía',
      clientId: 'test-client-id',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/room/ABCDEF');
  });

  it('no llama joinRoom con string de sólo espacios', async () => {
    renderForm();
    await submitWithName('   ');
    expect(joinRoom).not.toHaveBeenCalled();
  });

  it('no llama joinRoom con nombre de más de 50 caracteres', async () => {
    renderForm();
    await submitWithName('a'.repeat(51));
    expect(joinRoom).not.toHaveBeenCalled();
  });

  it('[PBT] nunca llama joinRoom con cualquier nombre inválido generado por fast-check', async () => {
    /**
     * Arbitraries for invalid names:
     *   (a) empty string
     *   (b) whitespace-only strings (spaces, tabs, newlines)
     *   (c) strings longer than 50 characters
     */
    const whitespaceOnly = fc.string({
      unit: fc.constantFrom(' ', '\t', '\n', '\r'),
      minLength: 1,
      maxLength: 100,
    });
    const tooLong = fc.string({ minLength: 51, maxLength: 200 }).filter(s => s.trim().length > 50);
    const invalidName = fc.oneof(
      fc.constant(''),
      whitespaceOnly,
      tooLong,
    );

    await fc.assert(
      fc.asyncProperty(invalidName, async (name) => {
        vi.clearAllMocks();
        renderForm();

        await submitWithName(name);

        expect(joinRoom).not.toHaveBeenCalled();

        // Clean up DOM between iterations
        document.body.innerHTML = '';
      }),
      { numRuns: 100 }
    );
  });
});
