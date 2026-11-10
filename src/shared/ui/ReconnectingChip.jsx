import Chip from './Chip';
import Spinner from './Spinner';

export default function ReconnectingChip() {
  return <Chip variant="waiting" role="status" aria-live="polite"><Spinner decorative />Reconectando…</Chip>;
}
