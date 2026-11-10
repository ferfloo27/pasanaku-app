import { useEffect, useRef, useState } from 'react';
import IconButton from './IconButton';
import Icon from './Icon';
import './ui.css';

export default function Toast({ message, onDismiss, duration = 5000 }) {
  const [paused, setPaused] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (!message || paused || duration <= 0) return;
    const timer = setTimeout(() => dismiss.current?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, paused]);
  if (!message) return null;
  return <div className="ui-toast" role="status" aria-live="polite" aria-atomic="true"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <span className="ui-toast__icon"><Icon name="check" size={18} /></span><span>{message}</span>
    {onDismiss && <IconButton label="Cerrar aviso" className="ui-toast__close" onClick={onDismiss}><Icon name="close" size={18} /></IconButton>}
  </div>;
}
