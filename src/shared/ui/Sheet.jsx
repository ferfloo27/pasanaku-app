import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import IconButton from './IconButton';
import Icon from './Icon';
import './ui.css';

const focusable = 'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';

export default function Sheet({ open, title, description, children, onClose, dismissible = true, initialFocusRef }) {
  const id = useId();
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    const background = [...document.body.children].filter(element => element !== panel.current.parentElement);
    const inertBefore = background.map(element => element.hasAttribute('inert'));
    background.forEach(element => element.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden';
    (initialFocusRef?.current || panel.current.querySelector(focusable) || panel.current).focus();
    return () => {
      background.forEach((element, index) => { if (!inertBefore[index]) element.removeAttribute('inert'); });
      document.body.style.overflow = oldOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, initialFocusRef]);
  if (!open) return null;
  function keyDown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (dismissible) onClose?.(); }
    if (event.key !== 'Tab') return;
    const controls = [...panel.current.querySelectorAll(focusable)];
    if (!controls.length) { event.preventDefault(); panel.current.focus(); return; }
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return createPortal(<div className="ui-sheet-backdrop" onClick={event => { if (event.target === event.currentTarget && dismissible) onClose?.(); }}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
      tabIndex={-1} className="ui-sheet" onKeyDown={keyDown}>
      <div className="ui-sheet__handle" aria-hidden="true" />
      <header className="ui-sheet__header"><h2 id={`${id}-title`}>{title}</h2>{dismissible && <IconButton label="Cerrar" onClick={onClose}><Icon name="close" /></IconButton>}</header>
      {description && <p id={`${id}-description`} className="ui-sheet__description">{description}</p>}
      {children}
    </section>
  </div>, document.body);
}
