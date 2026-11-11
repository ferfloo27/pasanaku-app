import { resultRows } from '../domain/results';
import { formatMoney } from '../../../shared/format/money';
import { formatTurnDate } from '../../../shared/format/dates';
import AguayoStripe from '../../../shared/ui/AguayoStripe';
import Button from '../../../shared/ui/Button';
import Chip from '../../../shared/ui/Chip';
import Skeleton from '../../../shared/ui/Skeleton';
import RoomSummary from '../../rooms/ui/RoomSummary';
import ResultsActions from './ResultsActions';
import './results.css';

export default function Results({ room, turns, participants, userId, onHome }) {
  const rows = resultRows(turns, participants);
  const own = rows.find(row => row.user_id === userId);
  return <section className="draw-results"><AguayoStripe variant="steps" />
    <div className="draw-results__body"><Button variant="text" onClick={onHome}>Volver al inicio</Button>
      <header><h1>{room.name}</h1><div className="draw-results__meta"><Chip variant="drawn">Sorteada</Chip><b>{room.code}</b></div></header>
      {own && <section className="draw-results__own" aria-label="Tu turno"><b className="draw-results__position">{own.position}</b><div>
        <span>Tu turno</span><h2>{formatTurnDate(own.turn_date, room.frequency)}</h2><span>Recibes {formatMoney(own.payout_bs)}</span></div></section>}
      {rows.length ? <><RoomSummary room={room} payoutBs={rows[0].payout_bs} />
        <section className="draw-results__list"><h2>Orden de cobro</h2><ol aria-label="Orden de cobro">{rows.map(row => <li key={row.id} className={`draw-results__row${row.user_id === userId ? ' draw-results__row--own' : ''}`}>
          <b className="draw-results__number">{row.position}</b><div><strong>{row.name}{row.user_id === userId ? ' · Tú' : ''}</strong><span>{formatTurnDate(row.turn_date, room.frequency)}</span></div><b>{formatMoney(row.payout_bs)}</b>
        </li>)}</ol></section></> : <Skeleton label="Cargando resultados…" lines={3} />}
      <ResultsActions room={room} rows={rows} />
    </div><AguayoStripe variant="steps" />
  </section>;
}
