import { useAuth } from '../../auth/hooks/useAuth';

export function useProfile() {
  return useAuth().profileState;
}
