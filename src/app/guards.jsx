import { useAuth } from '../features/auth/hooks/useAuth';
import { useProfile } from '../features/profile/hooks/useProfile';
import { validateDisplayName } from '../features/profile/domain/displayName';
import ProfileNameSheet from '../features/profile/ui/ProfileNameSheet';
import IdentityStatus from '../features/auth/ui/IdentityStatus';
import { suggestedDisplayName } from '../features/profile/domain/googleName';
import GoogleSignInButton from '../features/auth/ui/GoogleSignInButton';

export function RequireSession({ children }) {
  const { user, status, error, retry } = useAuth();
  if (status !== 'ready' || !user) return <IdentityStatus error={error} retry={retry} />;
  return children;
}

export function RequireProfile({ children }) {
  const { user } = useAuth();
  const { profile, status, error, retry, isSaving } = useProfile();
  if (status !== 'ready') return <IdentityStatus error={error} retry={retry} />;
  if (!validateDisplayName(profile?.display_name).ok) return <><IdentityStatus naming /><ProfileNameSheet open required initialName={suggestedDisplayName(profile, user)}>
    {user?.is_anonymous && <GoogleSignInButton disabled={isSaving} />}
  </ProfileNameSheet></>;
  return children;
}
