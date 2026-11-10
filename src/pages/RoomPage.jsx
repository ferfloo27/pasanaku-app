import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchRoom } from '../services/roomService';
import { supabase } from '../shared/lib/supabase';
import { useAuth } from '../features/auth/hooks/useAuth';
import Lobby from '../components/Lobby';
import ResultsView from '../components/ResultsView';

export default function RoomPage() {
  const { user } = useAuth();
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const clientId = user?.id;

  // Load room on mount
  useEffect(() => {
    fetchRoom(code).then(({ data, error: err }) => {
      if (err || !data) {
        setError('Sala no encontrada.');
      } else {
        setRoom(data);
      }
      setLoading(false);
    });
  }, [code]);

  // Subscribe to room status changes once room is loaded
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  if (loading) return <p>Cargando sala...</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!room) return null;

  if (room.status === 'drawn') {
    return <ResultsView room={room} />;
  }

  return (
    <Lobby
      room={room}
      participants={participants}
      setParticipants={setParticipants}
      clientId={clientId}
    />
  );
}
