import { useAuth } from '../hooks/useAuth';
import { useGoogleLink } from '../hooks/useGoogleLink';
import AccountLinkCard from './AccountLinkCard';

export default function GoogleAccount() {
  const { user, isAnonymous } = useAuth();
  const { link, linking, error } = useGoogleLink();
  return <AccountLinkCard isAnonymous={isAnonymous} email={user?.email} linking={linking} error={error} onLink={link} />;
}
