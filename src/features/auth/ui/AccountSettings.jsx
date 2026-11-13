import { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../../profile/hooks/useProfile';
import { signOutLocal } from '../api/googleSignInApi';
import { getErrorMessage } from '../../../shared/errors/appError';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import ProfileNameSheet from '../../profile/ui/ProfileNameSheet';
import GoogleAccount from './GoogleAccount';
import AccountDetails from './AccountDetails';

export default function AccountSettings({ onHome }) {
  const { user, isAnonymous } = useAuth();
  const { profile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  async function signOut() {
    if (pending.current) return;
    pending.current = true; setSigningOut(true); setError(null);
    try { await signOutLocal(); onHome(); }
    catch (failure) { setError(failure); }
    finally { pending.current = false; setSigningOut(false); }
  }
  return <>
    <AccountDetails name={profile.display_name} email={user.email} isAnonymous={isAnonymous} onEdit={() => setEditing(true)} />
    {isAnonymous ? <GoogleAccount /> : <section className="account-session" aria-label="Sesión">
      <p>Tus salas quedan guardadas en tu cuenta. Puedes volver a entrar con Google desde otro dispositivo.</p>
      {error && <ErrorBanner message={getErrorMessage(error)} />}
      <Button variant="secondary" fullWidth loading={signingOut} loadingText="Cerrando sesión…" onClick={signOut}>Cerrar sesión</Button>
      <p>Se cerrará solo en este navegador.</p>
    </section>}
    <ProfileNameSheet open={editing} initialName={profile.display_name} onClose={() => setEditing(false)} />
  </>;
}
