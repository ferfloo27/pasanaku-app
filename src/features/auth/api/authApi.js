import { supabase } from '../../../shared/lib/supabase';
import { AppError } from '../../../shared/errors/appError';

let pendingSession;

// StrictMode y varios consumidores comparten solo la petición en curso.
export function ensureSession() {
  if (!pendingSession) {
    pendingSession = (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session?.user) return { data: data.session };
        const result = await supabase.auth.signInAnonymously();
        if (result.error) throw result.error;
        if (!result.data?.session?.user) throw new Error('Session required');
        return { data: result.data.session };
      } catch (cause) {
        throw new AppError('AUTH_FAILED', cause);
      }
    })().finally(() => { pendingSession = undefined; });
  }
  return pendingSession;
}

export async function linkGoogle() {
  try {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'google', options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    return { data };
  } catch (cause) {
    throw new AppError('AUTH_LINK_FAILED', cause);
  }
}

export function onAuthChange(listener) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(listener);
  return () => subscription.unsubscribe();
}
