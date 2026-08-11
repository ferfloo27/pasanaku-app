import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/roomService';
import { getOrCreateClientId } from '../utils/clientId';

export default function CreateRoomForm({ onBack }) {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const minMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = hostName.trim();
    if (!trimmedName || trimmedName.length > 50) {
      setError('El nombre debe tener entre 1 y 50 caracteres.');
      return;
    }
    if (!startMonth) {
      setError('Selecciona un mes de inicio.');
      return;
    }

    setLoading(true);
    const clientId = getOrCreateClientId();
    const { data, error: svcError } = await createRoom({ hostName: trimmedName, startMonth: startMonth + '-01', clientId });
    setLoading(false);

    if (svcError) {
      setError(svcError.message || 'Error al crear la sala.');
      return;
    }

    navigate(`/room/${data.code}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear sala</h2>
      <label>
        Tu nombre
        <input
          type="text"
          value={hostName}
          onChange={e => setHostName(e.target.value)}
          maxLength={50}
          required
        />
      </label>
      <label>
        Mes de inicio
        <input
          type="month"
          value={startMonth}
          onChange={e => setStartMonth(e.target.value)}
          min={minMonth}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear sala'}
      </button>
      <button type="button" onClick={onBack}>Volver</button>
    </form>
  );
}
