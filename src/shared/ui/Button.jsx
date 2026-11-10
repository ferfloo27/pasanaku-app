import Spinner from './Spinner';
import './ui.css';

export default function Button({ children, variant = 'primary', loading = false, loadingText = 'Cargando…', disabled = false, fullWidth = false, compact = false, className = '', type = 'button', ...props }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`ui-button ui-button--${variant} ${fullWidth ? 'ui-button--full' : ''} ${compact ? 'ui-button--compact' : ''} ${className}`}>
    {loading && <Spinner decorative />}{loading ? loadingText : children}
  </button>;
}
