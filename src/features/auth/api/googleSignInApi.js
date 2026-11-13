import { supabase, createGoogleSignInClient } from '../../../shared/lib/supabase';
import { hasRoomMembership } from '../../rooms/api/membershipApi';
import { AppError } from '../../../shared/errors/appError';

const pendingKey = 'pasanaku-google-signin:pending';
const lifetime = 15 * 60 * 1000;
let temporary;
let temporaryKey;
let starting;
let finishing;
let generation = 0;

function assertCurrent(attempt) {
  if (attempt !== generation) throw new AppError('AUTH_SESSION_CHANGED');
}

function client(key) {
  if (temporaryKey !== key) {
    temporary?.auth.stopAutoRefresh();
    temporary = createGoogleSignInClient(key); temporaryKey = key;
  }
  return temporary;
}
function storage() {
  try {
    const value = crypto.randomUUID();
    sessionStorage.setItem(`${pendingKey}:probe`, value);
    if (sessionStorage.getItem(`${pendingKey}:probe`) !== value) throw new Error('Storage unavailable');
    sessionStorage.removeItem(`${pendingKey}:probe`);
    return sessionStorage;
  } catch (cause) { throw new AppError('AUTH_STORAGE_UNAVAILABLE', cause); }
}
function clearCallback() {
  if (window.location.pathname === '/auth/google') window.history.replaceState(window.history.state, '', '/auth/google');
}
function discard() {
  // No signOut: tras activar la cuenta ambos clientes comparten los mismos tokens.
  temporary?.auth.stopAutoRefresh();
  try {
    const pending = JSON.parse(sessionStorage.getItem(pendingKey));
    const key = pending?.storageKey;
    if (typeof key === 'string' && /^pasanaku-google-signin-[\w-]+$/.test(key)) {
      Object.keys(sessionStorage).filter(item => item === key || item.startsWith(`${key}-`))
        .forEach(item => sessionStorage.removeItem(item));
    }
    sessionStorage.removeItem(pendingKey);
  } catch { /* Se conserva la sesión primaria aunque el navegador bloquee el almacenamiento. */ }
  temporary = undefined; temporaryKey = undefined;
}
async function guestWithoutRooms(expectedId) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id || !data.user.is_anonymous || (expectedId && data.user.id !== expectedId)) {
    throw new AppError('AUTH_SESSION_CHANGED');
  }
  if (await hasRoomMembership(data.user.id)) throw new AppError('GUEST_HAS_ROOMS');
  return data.user.id;
}
function failure(cause) { return cause instanceof AppError ? cause : new AppError('AUTH_SIGN_IN_FAILED', cause); }

export function startGoogleSignIn() {
  if (!starting) {
    const attempt = ++generation;
    starting = (async () => {
    try {
      const available = storage();
      const guestUserId = await guestWithoutRooms();
      assertCurrent(attempt);
      discard();
      // Una clave por intento evita compartir sesiones temporales por BroadcastChannel entre pestañas.
      const storageKey = `pasanaku-google-signin-${crypto.randomUUID()}`;
      available.setItem(pendingKey, JSON.stringify({ guestUserId, storageKey, startedAt: Date.now() }));
      const { error } = await client(storageKey).auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}/auth/google` },
      });
      if (error) throw error;
    } catch (cause) { if (attempt === generation) discard(); throw failure(cause); }
  })().finally(() => { starting = undefined; });
  }
  return starting;
}

export function finishGoogleSignIn() {
  if (!finishing) finishing = (async () => {
    const attempt = generation;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('error') || new URLSearchParams(url.hash.slice(1)).has('error')) {
        discard(); clearCallback(); throw new AppError('AUTH_SIGN_IN_FAILED');
      }
      const pending = JSON.parse(storage().getItem(pendingKey));
      if (!pending?.guestUserId || !/^pasanaku-google-signin-[\w-]+$/.test(pending.storageKey)
        || !Number.isFinite(pending.startedAt) || Date.now() - pending.startedAt > lifetime || pending.startedAt > Date.now()) {
        discard(); throw new AppError('AUTH_SIGN_IN_FAILED');
      }
      const auth = client(pending.storageKey).auth;
      const existing = await auth.getSession();
      if (existing.error) throw existing.error;
      let session = existing.data?.session;
      if (!session) {
        const code = url.searchParams.get('code');
        if (!code) throw new AppError('AUTH_SIGN_IN_FAILED');
        const result = await auth.exchangeCodeForSession(code);
        if (result.error) throw result.error;
        session = result.data?.session;
      }
      const verified = await auth.getUser();
      if (verified.error) throw verified.error;
      if (!session?.access_token || !session.refresh_token || verified.data?.user?.id !== session.user?.id
        || verified.data.user.is_anonymous || !verified.data.user.identities?.some(identity => identity.provider === 'google')) {
        throw new AppError('AUTH_SIGN_IN_FAILED');
      }
      await guestWithoutRooms(pending.guestUserId);
      // Una comprobación adicional detecta cambios durante la consulta de participaciones.
      const current = await supabase.auth.getUser();
      if (current.error) throw current.error;
      if (current.data?.user?.id !== pending.guestUserId || !current.data.user.is_anonymous) throw new AppError('AUTH_SESSION_CHANGED');
      assertCurrent(attempt);
      const result = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
      if (result.error) throw result.error;
      discard(); clearCallback();
    } catch (cause) { throw failure(cause); }
  })().finally(() => { finishing = undefined; });
  return finishing;
}

export function cancelGoogleSignIn() { generation += 1; discard(); clearCallback(); }

export async function signOutLocal() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user || data.user.is_anonymous) throw error || new Error('Google session required');
    const result = await supabase.auth.signOut({ scope: 'local' });
    if (result.error) throw result.error;
  } catch (cause) { throw new AppError('AUTH_SIGN_OUT_FAILED', cause); }
}
