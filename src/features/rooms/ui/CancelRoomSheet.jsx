import Sheet from '../../../shared/ui/Sheet';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import './roomManagement.css';

export default function CancelRoomSheet({ open, room, onClose, onConfirm, loading = false, error }) {
  return <Sheet open={open && Boolean(room)} title="¿Cancelar la sala?"
    description={`“${room?.name || ''}” dejará de estar activa para todas las personas. Esta acción no se puede deshacer.`}
    dismissible={!loading} onClose={onClose}>
    <div className="room-management__actions">
      {error && <ErrorBanner message={getErrorMessage(error)} />}
      <Button fullWidth variant="danger" onClick={onConfirm} loading={loading} loadingText="Cancelando…">Cancelar sala</Button>
      <Button fullWidth variant="text" disabled={loading} onClick={onClose}>Volver</Button>
    </div>
  </Sheet>;
}
