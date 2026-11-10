import { useId } from 'react';
import './ui.css';

export default function AguayoStripe({ variant = 'diamonds', height = 12 }) {
  const id = `aguayo-${useId().replaceAll(':', '')}`;
  return <svg width="100%" height={height} aria-hidden="true" focusable="false" className="ui-aguayo">
    <defs><pattern id={id} width={variant === 'stripes' ? 8 : 24} height="12" patternUnits="userSpaceOnUse">
      <rect width="24" height="12" fill="var(--color-aguayo-base)" />
      {variant === 'stripes' ? <>
        <rect y="2" width="8" height="1" fill="var(--color-accent)" /><rect y="3" width="8" height="6" fill="var(--color-aguayo-detail)" />
        <path d="M0 9 4 3 8 9Z" fill="var(--color-aguayo-soft)" /><path d="m2.5 9 1.5-2.5L5.5 9Z" fill="var(--color-aguayo-green)" /><rect y="9" width="8" height="1" fill="var(--color-accent)" />
      </> : variant === 'steps' ? <>
        <rect width="24" height="12" fill="var(--color-accent)" /><path d="M0 12V9H4V6H8V3H10V0H14V3H16V6H20V9H24V12Z" fill="var(--color-aguayo-base)" /><rect x="11" y="4" width="2" height="2" fill="var(--color-aguayo-soft)" />
      </> : <>
        <path d="m12 1 6 5-6 5-6-5Z" fill="var(--color-accent)" /><path d="m12 4 2 2-2 2-2-2Z" fill="var(--color-aguayo-base)" />
        <path d="M0 0 3 6 0 12ZM24 0 21 6 24 12Z" fill="var(--color-aguayo-detail)" />
      </>}
    </pattern></defs><rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>;
}
