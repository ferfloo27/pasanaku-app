import Sheet from '../../../shared/ui/Sheet';
import Avatar from '../../../shared/ui/Avatar';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import './roomManagement.css';

export default function RemoveParticipantSheet({ open, participant, onClose, onConfirm, loading = false, error }) {
  return <Sheet open={open && Boolean(participant)} title={<span className="room-management__title"><Avatar name={participant?.name || ''} />¿Eliminar a {participant?.name}?</span>}
    description="Saldrá de la sala y verá un aviso. Puede volver a unirse con el código mientras no hagas el sorteo."
    onClose={onClose} dismissible={!loading}>
    <div className="room-management__actions">
      {error && <ErrorBanner message={getErrorMessage(error)} />}
      <Button fullWidth variant="danger" onClick={onConfirm} loading={loading} loadingText="Eliminando…">Eliminar de la sala</Button>
      <Button fullWidth variant="text" disabled={loading} onClick={onClose}>Volver</Button>
    </div>
  </Sheet>;
}
