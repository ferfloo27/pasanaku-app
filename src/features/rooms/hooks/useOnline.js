import { useSyncExternalStore } from 'react';

function subscribe(listener) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); };
}
const snapshot = () => navigator.onLine !== false;
export function useOnline() { return useSyncExternalStore(subscribe, snapshot, () => true); }
