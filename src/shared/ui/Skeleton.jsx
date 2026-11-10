import './ui.css';

export default function Skeleton({ variant = 'line', label = 'Cargando…', lines = 3 }) {
  return <div role="status" className={`ui-skeleton ui-skeleton--${variant}`}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="ui-skeleton__content">
      {(variant === 'participant' || variant === 'avatar') && <span className="ui-skeleton__avatar" />}
      {variant !== 'avatar' && <div className="ui-skeleton__lines">{Array.from({ length: variant === 'participant' ? 2 : lines }, (_, index) => <span key={index} className="ui-skeleton__line" />)}</div>}
    </div>
  </div>;
}
