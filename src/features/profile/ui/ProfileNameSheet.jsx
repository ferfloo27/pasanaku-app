import { useRef, useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { validateDisplayName } from '../domain/displayName';
import Sheet from '../../../shared/ui/Sheet';
import TextField from '../../../shared/ui/TextField';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import './profile.css';

function NameForm({ initialName, required, onClose }) {
  const { save, isSaving } = useProfile();
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const input = useRef(null);
  const validation = validateDisplayName(name);
  async function submit(event) {
    event.preventDefault(); setTouched(true);
    if (!validation.ok || isSaving) return;
    setError(null);
    try { await save(validation.value); onClose?.(); }
    catch (failure) { setError(failure); }
  }
  const title = required ? <span className="profile-name-title"><svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><path d="M28 2 54 28 28 54 2 28Z" fill="var(--color-accent-soft)" /><path d="M28 12 44 28 28 44 12 28Z" fill="var(--color-accent)" /><path d="M28 20 36 28 28 36 20 28Z" fill="var(--color-primary)" /></svg>¿Cómo te llamas?</span> : 'Editar tu nombre';
  return <Sheet open title={title}
    description={required ? 'Así te verán en las salas.' : 'El cambio se usará en las salas a las que entres desde ahora.'}
    dismissible={!required && !isSaving} onClose={onClose} initialFocusRef={input}>
    <form className="profile-name-form" noValidate onSubmit={submit}>
      <TextField ref={input} label="Tu nombre" autoComplete="name" value={name} disabled={isSaving}
        onChange={event => { setName(event.target.value); setError(null); }} onBlur={() => { if (name !== initialName) setTouched(true); }}
        help="Puedes cambiarlo cuando quieras." error={touched && !validation.ok ? 'Escribe un nombre de 1 a 50 caracteres.' : undefined} />
      <span className="profile-name-count" aria-live="polite">{Array.from(name.trim()).length}/50</span>
      {error && <ErrorBanner message={getErrorMessage(error)} />}
      <Button type="submit" fullWidth disabled={!validation.ok} loading={isSaving} loadingText="Guardando…">{required ? 'Continuar' : 'Guardar nombre'}</Button>
      {!required && <Button variant="text" fullWidth disabled={isSaving} onClick={onClose}>Volver</Button>}
    </form>
  </Sheet>;
}

export default function ProfileNameSheet({ open, initialName = '', required = false, onClose }) {
  return open ? <NameForm initialName={initialName} required={required} onClose={onClose} /> : null;
}
