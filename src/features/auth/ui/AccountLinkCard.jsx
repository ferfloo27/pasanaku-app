import Button from '../../../shared/ui/Button';
import Card from '../../../shared/ui/Card';
import Icon from '../../../shared/ui/Icon';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import './identity.css';

export default function AccountLinkCard({ isAnonymous, email, linking, error, onLink, onSignIn, signingIn }) {
  if (!isAnonymous) return <div className="account-linked"><Icon name="check" /><span>Cuenta vinculada: {email}</span></div>;
  return <Card className="account-link-card">
    <h2>Guarda tus salas con Google</h2>
    <p>Conserva el nombre y las salas de este invitado para recuperarlos desde otro dispositivo. Usa una cuenta Google que todavía no hayas registrado en Pasanaku.</p>
    {error && <ErrorBanner message={getErrorMessage(error)} />}
    <Button variant="secondary" fullWidth compact disabled={signingIn} loading={linking} loadingText="Abriendo Google…" onClick={onLink}>Guardar mis salas con Google</Button>
    {onSignIn && <>
      <h3>¿Ya usaste Google en Pasanaku?</h3>
      <p>Entra con esa cuenta para recuperar su nombre y sus salas.</p>
      <Button variant="text" fullWidth compact disabled={linking} loading={signingIn} loadingText="Abriendo Google…" onClick={onSignIn}>Entrar con Google</Button>
    </>}
  </Card>;
}
