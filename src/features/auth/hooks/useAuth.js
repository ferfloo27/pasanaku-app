import { useContext } from 'react';
import { AuthContext } from '../../../app/authContext';

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth requiere AuthProvider');
  return auth;
}
