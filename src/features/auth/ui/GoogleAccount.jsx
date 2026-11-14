import { useAuth } from '../hooks/useAuth';
import { useGoogleLink } from '../hooks/useGoogleLink';
import AccountLinkCard from './AccountLinkCard';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

export default function GoogleAccount() {
  const { user, isAnonymous } = useAuth();
  const { link, linking, error } = useGoogleLink();
  const { signIn, signingIn, error: signInError } = useGoogleSignIn();
  return <AccountLinkCard isAnonymous={isAnonymous} email={user?.email} linking={linking} error={error || signInError} onLink={link} onSignIn={signIn} signingIn={signingIn} />;
}
