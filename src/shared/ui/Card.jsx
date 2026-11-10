import './ui.css';

export default function Card({ as: Element = 'div', children, className = '', ...props }) {
  return <Element {...props} className={`ui-card ${className}`}>{children}</Element>;
}
