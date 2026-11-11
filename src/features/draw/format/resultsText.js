import { formatMoney } from '../../../shared/format/money';
import { formatTurnDate } from '../../../shared/format/dates';

const frequencies = { monthly: 'Mensual', weekly: 'Semanal', biweekly: 'Quincenal' };
export function resultsText(room, rows) {
  return [room.name, `Código: ${room.code}`, `Cuota: ${formatMoney(room.contribution_bs)} · ${frequencies[room.frequency]}`,
    `Por turno: ${formatMoney(rows[0].payout_bs)}`, '', 'Orden de cobro',
    ...rows.map(row => `${row.position}. ${row.name} · ${formatTurnDate(row.turn_date, room.frequency)} · ${formatMoney(row.payout_bs)}`),
  ].join('\n');
}
