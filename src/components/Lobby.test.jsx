import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import Lobby from './Lobby';

// Mock Supabase client to prevent real network/Realtime connections
vi.mock('../lib/supabaseClient', () => {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(Promise.resolve({ data: [] })),
          }),
        }),
      }),
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
    },
  };
});

// Mock drawTurns so clicking the button doesn't trigger real async calls
vi.mock('../services/roomService', () => ({
  drawTurns: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

const baseRoom = {
  id: 'room-id-1',
  code: 'ABC123',
  start_month: '2026-01',
  status: 'waiting',
};

/**
 * Property 8: Visibilidad del botón de sorteo según client_id
 *
 * Para cualquier lista de participantes y cualquier clientId, el botón
 * "Sortear orden" debe ser visible si y sólo si el clientId del dispositivo
 * actual coincide con el client_id del participante anfitrión (participants[0]).
 *
 * Validates: Requirements 5.5, 5.6
 */
describe('Lobby — Property 8: Visibilidad del botón según client_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 8: el botón "Sortear orden" es visible si y sólo si clientId === participants[0].client_id', () => {
    // Arbitraries:
    // - a non-empty list of participants (minLength: 1), each with a client_id uuid
    // - a separate clientId uuid for the current device
    // We use at least 2 participants so the button would be enabled (not disabled) when shown,
    // giving us a clear signal about visibility vs. disabled state.
    const participantArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
      client_id: fc.uuid(),
    });

    const arb = fc.record({
      participants: fc.array(participantArb, { minLength: 2, maxLength: 10 }),
      clientId: fc.uuid(),
    });

    fc.assert(
      fc.property(arb, ({ participants, clientId }) => {
        const setParticipants = vi.fn();

        const { unmount } = render(
          <Lobby
            room={baseRoom}
            participants={participants}
            setParticipants={setParticipants}
            clientId={clientId}
          />
        );

        const button = screen.queryByRole('button', { name: /sortear orden/i });
        const isHost = clientId === participants[0].client_id;

        if (isHost) {
          // Button must be present in the DOM
          expect(button).not.toBeNull();
        } else {
          // Button must NOT be present in the DOM
          expect(button).toBeNull();
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('caso exacto: clientId coincide con participants[0].client_id → botón visible', () => {
    const hostClientId = '11111111-1111-4111-8111-111111111111';
    const participants = [
      { id: 'p1', name: 'Ana', client_id: hostClientId },
      { id: 'p2', name: 'Beto', client_id: '22222222-2222-4222-8222-222222222222' },
    ];

    render(
      <Lobby
        room={baseRoom}
        participants={participants}
        setParticipants={vi.fn()}
        clientId={hostClientId}
      />
    );

    expect(screen.getByRole('button', { name: /sortear orden/i })).toBeInTheDocument();
  });

  it('caso exacto: clientId NO coincide con participants[0].client_id → botón oculto', () => {
    const hostClientId = '11111111-1111-4111-8111-111111111111';
    const guestClientId = '33333333-3333-4333-8333-333333333333';
    const participants = [
      { id: 'p1', name: 'Ana', client_id: hostClientId },
      { id: 'p2', name: 'Beto', client_id: '22222222-2222-4222-8222-222222222222' },
    ];

    render(
      <Lobby
        room={baseRoom}
        participants={participants}
        setParticipants={vi.fn()}
        clientId={guestClientId}
      />
    );

    expect(screen.queryByRole('button', { name: /sortear orden/i })).toBeNull();
  });
});
