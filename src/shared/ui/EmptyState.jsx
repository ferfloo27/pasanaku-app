import './ui.css';

export default function EmptyState({ title = 'Aún no tienes salas', description = 'Crea una y comparte el código, o pide el código a quien organiza.', action }) {
  return <div className="ui-empty">
    <svg width="120" height="96" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
      <path d="M60 6 104 48 60 90 16 48Z" fill="var(--color-accent-soft)" /><path d="M60 22 88 48 60 74 32 48Z" fill="var(--color-accent-border)" />
      <path d="M60 34 74 48 60 62 46 48Z" fill="var(--color-accent)" /><path d="M60 42 66 48 60 54 54 48Z" fill="var(--color-aguayo-base)" />
      <path d="M8 48 16 40V56ZM112 48 104 40V56Z" fill="var(--color-aguayo-detail)" />
    </svg><h3>{title}</h3><p>{description}</p>{action}
  </div>;
}
