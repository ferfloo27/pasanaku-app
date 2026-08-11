import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../services/joinRoomService';
import { getOrCreateClientId } from '../utils/clientId';

export default function JoinRoomForm({ onBack }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 50) {
      setError('El nombre debe tener entre 1 y 50 caracteres.');
      return;
    }
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length !== 6) {
      setError('El código debe tener exactamente 6 caracteres.');
      return;
    }

    setLoading(true);
    const clientId = getOrCreateClientId();
    const { data, error: svcError } = await joinRoom({ code: normalizedCode, name: trimmedName, clientId });
    setLoading(false);

    if (svcError) {
      setError(svcError.message || 'Error al unirse a la sala.');
      return;
    }

    navigate(`/room/${data.room.code}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Unirse a sala</h2>
      <label>
        Tu nombre
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          required
        />
      </label>
      <label>
        Código de sala
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Uniéndose...' : 'Unirse'}
      </button>
      <button type="button" onClick={onBack}>Volver</button>
    </form>
  );
}
