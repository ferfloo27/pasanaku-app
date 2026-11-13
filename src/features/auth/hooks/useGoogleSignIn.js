import { useCallback, useEffect, useRef, useState } from 'react';
import { startGoogleSignIn, cancelGoogleSignIn } from '../api/googleSignInApi';
import { AppError } from '../../../shared/errors/appError';

export function useGoogleSignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  useEffect(() => {
    const returned = event => {
      if (event.persisted && pending.current) {
        cancelGoogleSignIn(); pending.current = false;
        setSigningIn(false); setError(new AppError('AUTH_SIGN_IN_FAILED'));
      }
    };
    window.addEventListener('pageshow', returned);
    return () => {
      window.removeEventListener('pageshow', returned);
      if (pending.current) cancelGoogleSignIn();
    };
  }, []);
  const signIn = useCallback(async () => {
    if (pending.current) return;
    pending.current = true; setSigningIn(true); setError(null);
    try { await startGoogleSignIn(); }
    catch (failure) { pending.current = false; setSigningIn(false); setError(failure); }
  }, []);
  return { signIn, signingIn, error };
}
