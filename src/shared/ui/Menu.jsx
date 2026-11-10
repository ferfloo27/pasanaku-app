import { useEffect, useId, useRef, useState } from 'react';
import IconButton from './IconButton';
import Icon from './Icon';
import './ui.css';

export default function Menu({ label = 'Más acciones', items = [] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null); const trigger = useRef(null); const menu = useRef(null);
  const id = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    menu.current.querySelector('[role="menuitem"]:not(:disabled)')?.focus();
    const outside = event => { if (!wrapper.current.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function keyDown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { close(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = [...menu.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!options.length) return;
    const current = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next].focus();
  }
  return <div className="ui-menu-wrap" ref={wrapper} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <IconButton ref={trigger} label={label} aria-haspopup="menu" aria-controls={open ? id : undefined} aria-expanded={open}
      onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}><Icon name="more" /></IconButton>
    {open && <div id={id} className="ui-menu" role="menu" aria-label={label} ref={menu} onKeyDown={keyDown}>
      {items.map(item => <button type="button" role="menuitem" tabIndex={-1} key={item.label} disabled={item.disabled} className={item.danger ? 'ui-menu__danger' : ''}
        onClick={() => { close(); item.onSelect?.(); }}>{item.icon}{item.label}</button>)}
    </div>}
  </div>;
}
