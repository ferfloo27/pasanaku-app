import Button from './Button';
import Icon from './Icon';
import './ui.css';

export default function ErrorBanner({ message, onRetry, actionLabel = 'Reintentar', loading = false }) {
  if (!message) return null;
  return <div role="alert" className="ui-error-banner"><Icon name="error" />
    <div className="ui-error-banner__body"><p>{message}</p>
      {onRetry && <Button compact variant="text" className="ui-error-banner__action" onClick={onRetry} loading={loading} loadingText="Reintentando…">{actionLabel}</Button>}
    </div>
  </div>;
}
