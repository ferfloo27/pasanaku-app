import { useAuth } from '../features/auth/hooks/useAuth';
import { useProfile } from '../features/profile/hooks/useProfile';
import { validateDisplayName } from '../features/profile/domain/displayName';
import ProfileNameSheet from '../features/profile/ui/ProfileNameSheet';
import IdentityStatus from '../features/auth/ui/IdentityStatus';

export function RequireSession({ children }) {
  const { user, status, error, retry } = useAuth();
  if (status !== 'ready' || !user) return <IdentityStatus error={error} retry={retry} />;
  return children;
}

export function RequireProfile({ children }) {
  const { profile, status, error, retry } = useProfile();
  if (status !== 'ready') return <IdentityStatus error={error} retry={retry} />;
  if (!validateDisplayName(profile?.display_name).ok) return <><IdentityStatus naming /><ProfileNameSheet open required /></>;
  return children;
}
