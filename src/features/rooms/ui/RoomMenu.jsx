import Menu from '../../../shared/ui/Menu';

export default function RoomMenu({ onCancelRoom, busy = false }) {
  return <Menu label="Más acciones de la sala" items={[{
    label: 'Cancelar sala', danger: true, disabled: busy || !onCancelRoom, onSelect: onCancelRoom,
  }]} />;
}
