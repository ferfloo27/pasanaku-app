import { formatMoney } from '../../../shared/format/money';
import { formatTurnDate } from '../../../shared/format/dates';
import './roomPresentation.css';

const labels = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
export default function RoomSummary({ room, payoutBs }) {
  return <dl className="room-summary">
    <div><dt>Cuota</dt><dd>{formatMoney(room.contribution_bs)}</dd></div>
    <div><dt>Frecuencia</dt><dd>{labels[room.frequency]}</dd></div>
    <div><dt>{payoutBs === undefined ? 'Inicio' : 'Por turno'}</dt><dd>{payoutBs === undefined ? formatTurnDate(room.start_date, room.frequency) : formatMoney(payoutBs)}</dd></div>
  </dl>;
}
