import Sheet from '../../../shared/ui/Sheet';
import Button from '../../../shared/ui/Button';
import { formatMoney } from '../../../shared/format/money';
import { formatTurnDate } from '../../../shared/format/dates';

export default function ConfirmDrawSheet({ open, room, draft, onClose, onConfirm, loading = false }) {
  const first = draft[0];
  return <Sheet open={open && Boolean(first)} title="¿Anunciar el orden?" description="Todos verán el resultado. No se puede deshacer." onClose={onClose} dismissible={!loading}>
    <div className="draw-confirm__summary"><strong>{draft.length} participantes · {formatMoney(room.contribution_bs * draft.length)} por turno</strong>
      {first && <span>Primer turno: {first.name} · {formatTurnDate(first.turnDate, room.frequency)}</span>}</div>
    <div className="draft-editor__actions"><Button fullWidth loading={loading} loadingText="Anunciando…" onClick={onConfirm}>Anunciar a todos</Button>
      <Button fullWidth variant="text" disabled={loading} onClick={onClose}>Seguir revisando</Button></div>
  </Sheet>;
}
