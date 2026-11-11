import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isValidCode, normalizeCode } from '../domain/roomCode';
import { getErrorMessage } from '../../../shared/errors/appError';
import Button from '../../../shared/ui/Button';
import CodeInput from '../../../shared/ui/CodeInput';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import Icon from '../../../shared/ui/Icon';
import './joinCodeForm.css';

export default function JoinCodeForm({ onSearch }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clipboardError, setClipboardError] = useState('');
  const searching = useRef(false);
  const clipboardTicket = useRef(null);
  useEffect(() => () => { clipboardTicket.current = null; }, []);
  function changeCode(value) {
    clipboardTicket.current = null;
    setCode(normalizeCode(value));
    setError(null);
    setClipboardError('');
  }
  async function submit(event) {
    event.preventDefault();
    if (!isValidCode(code) || searching.current) return;
    clipboardTicket.current = null;
    searching.current = true;
    setLoading(true);
    setError(null);
    try {
      if (onSearch) await onSearch(code);
      else navigate(`/room/${code}`);
    } catch (failure) {
      setError(failure);
    } finally {
      searching.current = false;
      setLoading(false);
    }
  }
  async function pasteCode() {
    const ticket = Symbol();
    clipboardTicket.current = ticket;
    try {
      const value = await navigator.clipboard.readText();
      if (clipboardTicket.current === ticket && !searching.current) changeCode(value);
    } catch {
      if (clipboardTicket.current === ticket && !searching.current) setClipboardError('No pudimos leer el portapapeles. Mantén presionada una casilla y elige Pegar.');
    }
  }
  const missing = 6 - code.length;
  return <main className="join-code-page">
    <header className="join-code-page__header">
      <Link to="/" className="join-code-page__back" aria-label="Volver al inicio"><span aria-hidden="true">←</span></Link>
      <h1>Unirme a una sala</h1>
    </header>
    <form className="join-code-form" onSubmit={submit}>
      <div className="join-code-form__body">
        <p>Escribe el código de 6 caracteres que te pasó quien organiza.</p>
        <CodeInput value={code} onChange={changeCode} disabled={loading}
          help="Las minúsculas se convierten solas." error={error?.code === 'ROOM_NOT_FOUND' ? getErrorMessage(error) : undefined} />
        <Button variant="secondary" compact className="join-code-form__paste" onClick={pasteCode} disabled={loading}>Pegar código</Button>
        <ErrorBanner message={clipboardError || (error && error.code !== 'ROOM_NOT_FOUND' ? getErrorMessage(error) : '')} />
        <aside className="join-code-form__tip"><Icon name="error" size={18} /><span>¿Te pasaron un link? Ábrelo y entrarás directo a la sala, sin escribir nada.</span></aside>
      </div>
      <footer className="join-code-form__footer">
        <Button type="submit" fullWidth disabled={!isValidCode(code)} loading={loading} loadingText="Buscando…">Buscar sala</Button>
        {missing > 0 && <p aria-live="polite">{missing === 1 ? 'Falta 1 carácter' : `Faltan ${missing} caracteres`}</p>}
      </footer>
    </form>
  </main>;
}
