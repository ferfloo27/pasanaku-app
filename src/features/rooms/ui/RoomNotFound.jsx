import EmptyState from '../../../shared/ui/EmptyState';
import Button from '../../../shared/ui/Button';
import './roomEntry.css';

export default function RoomNotFound({ onHome, onEnterCode }) {
  return <section className="room-entry__missing"><EmptyState headingAs="h1" title="No encontramos esta sala"
    description="El link puede estar incompleto o la sala ya no existe. Pide el código otra vez a quien organiza."
    action={<div className="room-entry__missing-actions"><Button fullWidth onClick={onEnterCode}>Escribir un código</Button><Button fullWidth variant="text" onClick={onHome}>Volver al inicio</Button></div>} /></section>;
}
