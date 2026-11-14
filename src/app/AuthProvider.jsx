import { useCallback, useEffect, useState } from 'react';
import { ensureSession, onAuthChange } from '../features/auth/api/authApi';
import { AuthContext } from './authContext';
import { useProfileState } from '../features/profile/hooks/useProfileState';

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ user: null, status: 'loading', error: null });
  const [attempt, setAttempt] = useState(0);
  const profileState = useProfileState(auth.user);
  const retry = useCallback(() => {
    setAuth({ user: null, status: 'loading', error: null });
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    let active = true; let version = 0;
    const stop = onAuthChange((event, session) => {
      // INITIAL_SESSION proviene del almacenamiento; ensureSession lo valida antes de mostrarlo.
      if (!active || event === 'INITIAL_SESSION') return;
      version++;
      if (session?.user) setAuth({ user: session.user, status: 'ready', error: null });
      else retry(); // El efecto inicia la petición fuera del callback de Auth.
    });
    const initialVersion = version;
    ensureSession().then(({ data }) => {
      if (active && version === initialVersion) setAuth({ user: data.user, status: 'ready', error: null });
    }).catch(error => {
      if (active && version === initialVersion) setAuth({ user: null, status: 'error', error });
    });
    return () => { active = false; stop(); };
  }, [attempt, retry]);

  return <AuthContext.Provider value={{ ...auth, isAnonymous: auth.user?.is_anonymous === true, retry, profileState }}>{children}</AuthContext.Provider>;
}
