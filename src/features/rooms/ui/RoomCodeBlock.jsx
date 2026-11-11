import { useRef, useState } from 'react';
import AguayoStripe from '../../../shared/ui/AguayoStripe';
import Button from '../../../shared/ui/Button';
import Toast from '../../../shared/ui/Toast';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import './roomPresentation.css';

export default function RoomCodeBlock({ room }) {
  const [message, setMessage] = useState('');
  const [noticeId, setNoticeId] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function act(share) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await navigator.clipboard.writeText(share ? `${window.location.origin}/room/${room.code}` : room.code);
      setMessage(share ? 'Link copiado para compartir' : 'Código copiado');
      setNoticeId(id => id + 1);
    } catch {
      setError('No pudimos copiar. Intenta de nuevo.');
    } finally { pending.current = false; setBusy(false); }
  }
  return <>
    <div className="room-code-block"><AguayoStripe />
      <div className="room-code-block__body"><strong>{room.name}</strong><span>Código de la sala</span><b className="room-code-block__code">{room.code}</b>
        <div className="room-code-block__actions"><Button compact variant="secondary" disabled={busy} onClick={() => act(false)}>Copiar código</Button><Button compact variant="secondary" disabled={busy} onClick={() => act(true)}>Compartir link</Button></div>
      </div><AguayoStripe />
    </div>
    {error && <ErrorBanner message={error} />}
    <Toast key={noticeId} message={message} onDismiss={() => setMessage('')} />
  </>;
}
