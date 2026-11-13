import { supabase } from '../../../shared/lib/supabase';
import { AppError } from '../../../shared/errors/appError';

let pendingSession;
const invalidSessionCodes = new Set([
  'user_not_found', 'session_not_found', 'bad_jwt',
  'refresh_token_not_found', 'refresh_token_already_used',
]);
function invalidSession(error) {
  return invalidSessionCodes.has(error?.code) || error?.name === 'AuthSessionMissingError';
}
async function newGuest() {
  const result = await supabase.auth.signInAnonymously();
  if (result.error) throw result.error;
  if (!result.data?.session?.user) throw new Error('Session required');
  return { data: result.data.session };
}

// StrictMode y varios consumidores comparten solo la petición en curso.
export function ensureSession() {
  if (!pendingSession) {
    pendingSession = (async () => {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase.auth.getSession();
          if (error && !invalidSession(error)) throw error;
          const session = data?.session;
          if (!error && !session) return await newGuest();
          if (!error) {
            // Verifica el token concreto sin que una respuesta antigua limpie otra sesión.
            const verified = await supabase.auth.getUser(session.access_token);
            if (!verified.error) {
              if (!verified.data?.user || verified.data.user.id !== session.user?.id) throw new Error('Invalid user response');
              return { data: { ...session, user: verified.data.user } };
            }
            if (!invalidSession(verified.error)) throw verified.error;
          }
          // Solo recuperar ante un rechazo definitivo; nunca por offline, 429 o 5xx.
          const latest = await supabase.auth.getSession();
          if (latest.error && !invalidSession(latest.error)) throw latest.error;
          if (latest.data?.session && (!session || latest.data.session.access_token !== session.access_token)) continue;
          const cleared = await supabase.auth.signOut({ scope: 'local' });
          if (cleared.error && !invalidSession(cleared.error)) throw cleared.error;
          return await newGuest();
        }
        throw new Error('Session changed during validation');
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
