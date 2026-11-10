import './ui.css';

export default function IconButton({ label, children, className = '', type = 'button', ...props }) {
  return <button {...props} type={type} aria-label={label} className={`ui-icon-button ${className}`}>{children}</button>;
}
