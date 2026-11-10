import AguayoStripe from '../../../shared/ui/AguayoStripe';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import Spinner from '../../../shared/ui/Spinner';
import { getErrorMessage } from '../../../shared/errors/appError';
import './identity.css';

export default function IdentityStatus({ error, retry, naming = false }) {
  return <div className="identity-page"><AguayoStripe /><main className="identity-page__body">
    <h1>Pasanaku</h1><p>Organiza el sorteo de tu tanda en minutos.</p>
    {naming ? <><Button fullWidth disabled>Crear sala</Button><Button variant="secondary" fullWidth disabled>Unirme con código</Button></>
      : error ? <ErrorBanner message={getErrorMessage(error)} onRetry={retry} /> : <Spinner label="Preparando tu sesión…" />}
  </main></div>;
}
