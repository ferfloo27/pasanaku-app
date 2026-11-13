import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';

export default function GoogleSignInButton({ disabled = false }) {
  const { signIn, signingIn, error } = useGoogleSignIn();
  return <div className="account-signin">
    <p>¿Ya usas Pasanaku con Google? Recupera tu cuenta y tus salas.</p>
    {error && <ErrorBanner message={getErrorMessage(error)} />}
    <Button variant="secondary" fullWidth disabled={disabled} loading={signingIn} loadingText="Abriendo Google…" onClick={signIn}>Ya tengo cuenta: entrar con Google</Button>
  </div>;
}
