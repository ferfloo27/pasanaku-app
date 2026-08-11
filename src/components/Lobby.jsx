import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { drawTurns } from '../services/roomService';

export default function Lobby({ room, participants, setParticipants, clientId }) {
  const [drawError, setDrawError] = useState('');
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    // Fetch initial participants list
    supabase
      .from('participants')
      .select()
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true })
      .then(({ data }) => {
        if (data) setParticipants(data);
      });

    // Subscribe to new participants joining
    const channel = supabase
      .channel(`participants-${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setParticipants((prev) => {
            if (prev.some(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  const isHost = participants.length > 0 && participants[0].client_id === clientId;
  const canDraw = participants.length >= 2;

  async function handleDraw() {
    setDrawError('');
    setDrawing(true);
    const { error } = await drawTurns({
      roomId: room.id,
      participants,
      startMonth: room.start_month,
    });
    setDrawing(false);
    if (error) {
      setDrawError(error.message || 'Error al realizar el sorteo.');
    }
  }

  return (
    <section>
      <h2>Sala: <strong>{room.code}</strong></h2>
      <p>Comparte este código con los participantes.</p>
      <h3>Participantes ({participants.length})</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>

      {isHost && (
        <div>
          <button
            onClick={handleDraw}
            disabled={!canDraw || drawing}
          >
            {drawing ? 'Sorteando...' : 'Sortear orden'}
          </button>
          {!canDraw && (
            <p>Se requieren al menos 2 participantes para sortear.</p>
          )}
          {drawError && <p role="alert">{drawError}</p>}
        </div>
      )}
    </section>
  );
}
