import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import IconButton from './IconButton';
import Icon from './Icon';
import './ui.css';

function TimedToast({ message, onDismiss, duration }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const remaining = useRef(duration);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (paused || duration <= 0) return;
    const started = Date.now();
    const timer = setTimeout(() => dismiss.current?.(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [duration, paused]);
  return <div className="ui-toast" role="status" aria-live="polite" aria-atomic="true"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <span className="ui-toast__icon"><Icon name="check" size={18} /></span><span>{message}</span>
    {onDismiss && <IconButton label="Cerrar aviso" className="ui-toast__close" onClick={onDismiss}><Icon name="close" size={18} /></IconButton>}
    {duration > 0 && <span className="ui-toast__progress" aria-hidden="true" style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
  </div>;
}

export default function Toast({ message, onDismiss, duration = 5000 }) {
  return message ? createPortal(<TimedToast key={`${duration}:${message}`} message={message} duration={duration} onDismiss={onDismiss} />, document.body) : null;
}
