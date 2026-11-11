import { useEffect, useRef, useState } from 'react';
import { resultsText } from '../format/resultsText';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import Toast from '../../../shared/ui/Toast';

export default function ResultsActions({ room, rows }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const pending = useRef(false), active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function perform(action) {
    if (pending.current || !rows.length) return;
    pending.current = true; setBusy(action); setError(null); setMessage('');
    const nativeShare = action === 'share' && typeof navigator.share === 'function';
    try {
      const text = resultsText(room, rows);
      if (nativeShare) await navigator.share({ title: room.name, text });
      else await navigator.clipboard.writeText(text);
      if (active.current) setMessage(nativeShare ? 'Resultados compartidos' : 'Resultados copiados');
    } catch (failure) {
      if (active.current && failure?.name !== 'AbortError') setError({ action, message: nativeShare ? 'No pudimos compartir los resultados. Intenta de nuevo.' : 'No pudimos copiar los resultados. Intenta de nuevo.' });
    } finally { pending.current = false; if (active.current) setBusy(null); }
  }
  return <>
    {error && <ErrorBanner message={error.message} onRetry={() => perform(error.action)} loading={Boolean(busy)} />}
    <div className="draw-results__actions"><Button variant="secondary" disabled={Boolean(busy) || !rows.length} loading={busy === 'copy'} loadingText="Copiando…" onClick={() => perform('copy')}>Copiar resultados</Button>
      <Button disabled={Boolean(busy) || !rows.length} loading={busy === 'share'} loadingText="Compartiendo…" onClick={() => perform('share')}>Compartir</Button></div>
    <Toast message={message} onDismiss={() => setMessage('')} />
  </>;
}
