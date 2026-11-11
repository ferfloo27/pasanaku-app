import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { hasSeenCancellation, markCancellationSeen } from '../hooks/cancelledNotices';
import Button from '../../../shared/ui/Button';
import CancellationNotice from './CancellationNotice';
import './roomManagement.css';

export function CancelledRoom({ room, onHome }) {
  return <section className="room-state-view"><span className="room-state-view__symbol" aria-hidden="true">×</span>
    <h1>{room.host_name} canceló la sala</h1><p>“{room.name}” ya no está activa. Te llevamos al inicio.</p>
    <Button fullWidth onClick={onHome}>Ir al inicio</Button>
  </section>;
}
export function RemovedRoom({ room, onHome }) {
  return <section className="room-state-view"><span className="room-state-view__symbol" aria-hidden="true">−</span>
    <h1>Ya no estás en esta sala</h1><p>{room.host_name} te quitó de “{room.name}”. Si fue un error, pídele el código y vuelve a unirte.</p>
    <Button fullWidth onClick={onHome}>Ir al inicio</Button>
  </section>;
}
export function CancellationArrivalNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const incoming = location.state?.roomNotice;
  const [notice, setNotice] = useState(() => incoming?.type === 'cancelled' && incoming.room && !hasSeenCancellation(user.id, incoming.room.id) ? incoming : null);
  useEffect(() => {
    if (incoming?.type !== 'cancelled' || !incoming.room) return;
    markCancellationSeen(user.id, incoming.room.id);
    const rest = { ...location.state };
    delete rest.roomNotice;
    // Consumir la navegación evita repetir el aviso al recargar o volver atrás.
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: rest });
  }, [incoming, user.id, location, navigate]);
  return notice ? <CancellationNotice room={notice.room} onClose={() => setNotice(null)} /> : null;
}
