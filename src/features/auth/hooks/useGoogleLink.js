import { useCallback, useEffect, useRef, useState } from 'react';
import { linkGoogle } from '../api/authApi';
import { useAuth } from './useAuth';
import { AppError } from '../../../shared/errors/appError';
import { googleLinkError } from '../domain/googleLinkError';

const pendingKey = 'pasanaku_google_link_pending';
function pendingLink(action) {
  try {
    if (action === 'set') sessionStorage.setItem(pendingKey, '1');
    else if (action === 'clear') sessionStorage.removeItem(pendingKey);
    else return sessionStorage.getItem(pendingKey) === '1';
  } catch { /* Un bloqueo del almacenamiento no debe impedir vincular Google. */ }
  return false;
}
function consumeReturn(isAnonymous, pendingInMemory = false) {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const keys = ['error', 'error_code', 'error_description', 'error_uri'];
  const hasError = keys.some(key => url.searchParams.has(key) || hash.has(key));
  // Solo se clasifica un código conocido; nunca se muestra la descripción cruda del callback.
  const failure = hasError ? googleLinkError({ code: url.searchParams.get('error_code') || hash.get('error_code') }) : null;
  const wasPending = pendingLink('get') || pendingInMemory;
  pendingLink('clear');
  if (hasError) {
    keys.forEach(key => { url.searchParams.delete(key); hash.delete(key); });
    url.hash = hash.toString();
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return failure || (wasPending && isAnonymous ? new AppError('AUTH_LINK_FAILED') : null);
}

export function useGoogleLink() {
  const { user, isAnonymous } = useAuth();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const receive = event => {
      if (!active || (!event && pending.current && isAnonymous)) return;
      const failure = consumeReturn(isAnonymous, Boolean(event && pending.current));
      if (failure || !isAnonymous) {
        pending.current = false; setLinking(false); setError(failure);
      }
    };
    Promise.resolve().then(receive);
    window.addEventListener('pageshow', receive);
    return () => { active = false; window.removeEventListener('pageshow', receive); };
  }, [user?.id, isAnonymous]);

  const link = useCallback(async () => {
    if (!isAnonymous || pending.current) return;
    pending.current = true; setError(null); setLinking(true); pendingLink('set');
    try { await linkGoogle(); }
    catch (failure) {
      pendingLink('clear'); pending.current = false; setLinking(false); setError(failure);
    }
  }, [isAnonymous]);
  return { link, linking, error };
}
