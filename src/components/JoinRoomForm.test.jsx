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

// Mock joinRoom from joinRoomService
vi.mock('../services/joinRoomService', () => ({
  joinRoom: vi.fn(),
}));

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock getOrCreateClientId so it doesn't touch localStorage
vi.mock('../utils/clientId', () => ({
  getOrCreateClientId: () => 'test-client-id',
}));

import { joinRoom } from '../services/joinRoomService';

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
    const tooLong = fc.string({ minLength: 51, maxLength: 200 });
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
