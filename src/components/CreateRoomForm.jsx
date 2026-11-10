import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/roomService';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useProfile } from '../features/profile/hooks/useProfile';
import { validateDisplayName } from '../features/profile/domain/displayName';

export default function CreateRoomForm({ onBack }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [startMonth, setStartMonth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const minMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const name = validateDisplayName(profile?.display_name);
    if (!name.ok) {
      setError('Guarda tu nombre desde el inicio antes de continuar.');
      return;
    }
    if (!startMonth) {
      setError('Selecciona un mes de inicio.');
      return;
    }

    const clientId = user?.id;
    if (!clientId) { setError('No pudimos iniciar tu sesión. Reintenta para continuar.'); return; }
    setLoading(true);
    const { data, error: svcError } = await createRoom({ hostName: name.value, startMonth: startMonth + '-01', clientId });
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
      <p>Entrarás como <strong>{profile?.display_name}</strong>.</p>
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
