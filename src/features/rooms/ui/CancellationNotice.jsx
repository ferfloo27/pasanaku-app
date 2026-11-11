import Icon from '../../../shared/ui/Icon';
import IconButton from '../../../shared/ui/IconButton';
export default function CancellationNotice({ room, onClose }) {
  return <div role="status" className="home-cancellation"><Icon name="error" />
    <p>{room.host_name} canceló la sala “{room.name}”. Ya no aparece en tus salas.</p>
    <IconButton label="Cerrar aviso" onClick={onClose}><Icon name="close" /></IconButton>
  </div>;
}
