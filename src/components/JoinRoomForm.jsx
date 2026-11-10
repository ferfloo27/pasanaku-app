import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../services/roomService';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useProfile } from '../features/profile/hooks/useProfile';
import { validateDisplayName } from '../features/profile/domain/displayName';

export default function JoinRoomForm({ onBack }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const name = validateDisplayName(profile?.display_name);
    if (!name.ok) {
      setError('Guarda tu nombre desde el inicio antes de continuar.');
      return;
    }
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length !== 6) {
      setError('El código debe tener exactamente 6 caracteres.');
      return;
    }

    const clientId = user?.id;
    if (!clientId) { setError('No pudimos iniciar tu sesión. Reintenta para continuar.'); return; }
    setLoading(true);
    const { data, error: svcError } = await joinRoom({ code: normalizedCode, name: name.value, clientId });
    setLoading(false);

    if (svcError) {
      setError(svcError.message || 'Error al unirse a la sala.');
      return;
    }

    navigate(`/room/${data.code}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Unirse a sala</h2>
      <p>Entrarás como <strong>{profile?.display_name}</strong>.</p>
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
