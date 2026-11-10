import './ui.css';

export default function Chip({ variant = 'neutral', children, className = '', ...props }) {
  return <span {...props} className={`ui-chip ui-chip--${variant} ${className}`}>{children}</span>;
}
