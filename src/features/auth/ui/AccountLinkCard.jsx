import Button from '../../../shared/ui/Button';
import Card from '../../../shared/ui/Card';
import Icon from '../../../shared/ui/Icon';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import './identity.css';

export default function AccountLinkCard({ isAnonymous, email, linking, error, onLink }) {
  if (!isAnonymous) return <div className="account-linked"><Icon name="check" /><span>Cuenta vinculada: {email}</span></div>;
  return <Card className="account-link-card">
    <p>Estás usando Pasanaku sin cuenta. Vincula Google para ver tus salas en otro celular.</p>
    {error && <ErrorBanner message={getErrorMessage(error)} />}
    <Button variant="secondary" fullWidth compact loading={linking} loadingText="Vinculando…" onClick={onLink}>Vincular cuenta de Google</Button>
  </Card>;
}
