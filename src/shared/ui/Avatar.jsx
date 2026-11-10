import './ui.css';

export default function Avatar({ name = '', label, variant = 'soft', className = '' }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length ? [words[0], ...(words.length > 1 ? [words.at(-1)] : [])].map(word => Array.from(word)[0]).join('').toLocaleUpperCase('es-BO') : '?';
  return <span className={`ui-avatar ui-avatar--${variant} ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label || undefined}>{initials}</span>;
}
