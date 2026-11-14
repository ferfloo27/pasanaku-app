import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import AccountSettings from '../features/auth/ui/AccountSettings';
import AguayoStripe from '../shared/ui/AguayoStripe';

export default function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return <div className="identity-page"><AguayoStripe /><main className="identity-page__body">
    <Link className="account-back" to="/">← Volver al inicio</Link>
    <h1>Cuenta y ajustes</h1>
    <AccountSettings key={user.id} onHome={() => navigate('/', { replace: true })} />
  </main></div>;
}
