import './ui.css';

export default function Spinner({ label = 'Cargando…', decorative = false, className = '' }) {
  return <span className={`ui-spinner-wrap ${className}`} role={decorative ? undefined : 'status'} aria-hidden={decorative || undefined}>
    <svg className="ui-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>
    {!decorative && <span className="sr-only">{label}</span>}
  </span>;
}
