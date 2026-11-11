import { useEffect, useRef, useState } from 'react';
import { resultsText } from '../format/resultsText';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import Toast from '../../../shared/ui/Toast';

export default function ResultsActions({ room, rows }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [noticeId, setNoticeId] = useState(0);
  const [error, setError] = useState(null);
  const pending = useRef(false), active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function perform(action) {
    if (pending.current || !rows.length) return;
    pending.current = true; setBusy(action); setError(null); setMessage('');
    try {
      await navigator.clipboard.writeText(action === 'share' ? `${window.location.origin}/room/${room.code}` : resultsText(room, rows));
      if (active.current) { setMessage(action === 'share' ? 'Link copiado para compartir' : 'Resultados copiados'); setNoticeId(id => id + 1); }
    } catch {
      if (active.current) setError({ action, message: action === 'share' ? 'No pudimos copiar el link. Intenta de nuevo.' : 'No pudimos copiar los resultados. Intenta de nuevo.' });
    } finally { pending.current = false; if (active.current) setBusy(null); }
  }
  return <>
    {error && <ErrorBanner message={error.message} onRetry={() => perform(error.action)} loading={Boolean(busy)} />}
    <div className="draw-results__actions"><Button variant="secondary" disabled={Boolean(busy) || !rows.length} loading={busy === 'copy'} loadingText="Copiando…" onClick={() => perform('copy')}>Copiar resultados</Button>
      <Button disabled={Boolean(busy) || !rows.length} loading={busy === 'share'} loadingText="Copiando…" onClick={() => perform('share')}>Compartir</Button></div>
    <Toast key={noticeId} message={message} onDismiss={() => setMessage('')} />
  </>;
}
