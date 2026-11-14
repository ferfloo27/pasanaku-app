import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { finishGoogleSignIn, cancelGoogleSignIn } from '../features/auth/api/googleSignInApi';
import { getErrorMessage } from '../shared/errors/appError';
import AguayoStripe from '../shared/ui/AguayoStripe';
import Spinner from '../shared/ui/Spinner';
import ErrorBanner from '../shared/ui/ErrorBanner';
import Button from '../shared/ui/Button';
import '../features/auth/ui/identity.css';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    finishGoogleSignIn().then(() => { if (active) navigate('/', { replace: true }); })
      .catch(failure => { if (active) setError(failure); });
    return () => {
      active = false; mounted.current = false;
      // StrictMode vuelve a montar en el mismo turno; salir de la ruta sí cancela el flujo.
      queueMicrotask(() => { if (!mounted.current) cancelGoogleSignIn(); });
    };
  }, [attempt, navigate]);
  function back() { cancelGoogleSignIn(); navigate('/', { replace: true }); }
  return <div className="identity-page"><AguayoStripe /><main className="identity-page__body">
    <h1>Entrar con Google</h1>
    {error ? <ErrorBanner message={getErrorMessage(error)} onRetry={() => { setError(null); setAttempt(value => value + 1); }} />
      : <Spinner label="Comprobando tu cuenta…" />}
    <Button variant="secondary" fullWidth onClick={back}>Volver al inicio</Button>
  </main></div>;
}
