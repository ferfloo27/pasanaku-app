import { useCallback, useEffect, useRef, useState } from 'react';
import { getProfile, saveDisplayName } from '../api/profileApi';
import { AppError } from '../../../shared/errors/appError';

const empty = { profile: null, error: null, saveError: null, isSaving: false };

export function useProfileState(user) {
  const userId = user?.id;
  const [state, setState] = useState({ ...empty, userId: null, status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(null);
  const saving = useRef(null);
  useEffect(() => {
    const ticket = Symbol();
    sequence.current = ticket;
    if (userId) {
      getProfile(userId).then(({ data }) => {
        if (ticket === sequence.current) setState({ ...empty, userId, profile: data, status: 'ready' });
      }).catch(error => {
        if (ticket === sequence.current) setState({ ...empty, userId, status: 'error', error });
      });
    }
    return () => { sequence.current = null; saving.current = null; };
  }, [userId, attempt]);

  const retry = useCallback(() => {
    setState(current => ({ ...current, status: 'loading', error: null }));
    setAttempt(value => value + 1);
  }, []);
  const save = useCallback(name => {
    if (!userId) return Promise.reject(new AppError('AUTH_FAILED'));
    if (state.userId !== userId || state.status !== 'ready') return Promise.reject(new AppError('PROFILE_REQUIRED'));
    if (saving.current) return saving.current;
    const ticket = Symbol();
    sequence.current = ticket;
    setState(current => ({ ...current, isSaving: true, saveError: null }));
    saving.current = saveDisplayName(userId, name).then(({ data }) => {
      if (ticket === sequence.current) setState({ ...empty, userId, profile: data, status: 'ready' });
      return { data };
    }).catch(error => {
      if (ticket === sequence.current) setState(current => ({ ...current, isSaving: false, saveError: error }));
      throw error;
    }).finally(() => { if (ticket === sequence.current) saving.current = null; });
    return saving.current;
  }, [userId, state.userId, state.status]);

  const visible = state.userId === userId ? state : { ...empty, status: userId ? 'loading' : 'idle' };
  return { ...visible, save, retry };
}

