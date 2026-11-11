import { useCallback, useEffect, useReducer, useSyncExternalStore } from 'react';

const motionQuery = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function subscribeMotion(listener) {
  const query = motionQuery();
  query?.addEventListener('change', listener);
  return () => query?.removeEventListener('change', listener);
}
const motionSnapshot = () => motionQuery()?.matches ?? false;
const initial = { index: 0, done: false, run: 0 };
function revealReducer(state, action) {
  if (action.type === 'RESET') return { ...initial, run: state.run + 1 };
  if (action.type === 'SKIP') return { ...state, index: Math.max(0, action.count - 1), done: true };
  if (action.type === 'NEXT') return state.index + 1 < action.count ? { ...state, index: state.index + 1, done: false } : { ...state, done: true };
  return state;
}
export function useReveal(count, { intervalMs = 1500 } = {}) {
  const [state, dispatch] = useReducer(revealReducer, initial);
  const reducedMotion = useSyncExternalStore(subscribeMotion, motionSnapshot, () => false);
  useEffect(() => {
    if (!count || state.done) return;
    const timer = setTimeout(() => dispatch({ type: 'NEXT', count }), intervalMs);
    return () => clearTimeout(timer);
  }, [count, state.index, state.done, state.run, intervalMs]);
  const skip = useCallback(() => dispatch({ type: 'SKIP', count }), [count]);
  const replay = useCallback(() => dispatch({ type: 'RESET' }), []);
  return { visibleCount: Math.min(count, state.index + 1), done: state.done, skip, replay, reducedMotion };
}
