import { useState, useEffect } from 'react';
import { fetchTurns } from '../services/roomService';
import { formatMonth } from '../utils/formatMonth';

export default function ResultsView({ room }) {
  const [turns, setTurns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTurns(room.id).then(({ data, error: err }) => {
      if (err) {
        setError('Error al cargar los resultados.');
      } else {
        setTurns((data ?? []).sort((a, b) => a.position - b.position));
      }
      setLoading(false);
    });
  }, [room.id]);

  if (loading) return <p>Cargando resultados...</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <section>
      <h2>Resultados del sorteo — Sala {room.code}</h2>
      <table>
        <thead>
          <tr>
            <th>Posición</th>
            <th>Mes asignado</th>
            <th>Participante</th>
          </tr>
        </thead>
        <tbody>
          {turns.map((turn) => (
            <tr key={turn.position}>
              <td>{turn.position}</td>
              <td>{formatMonth(turn.assigned_month)}</td>
              <td>{turn.participants?.name ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
