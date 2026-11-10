import { useId, useRef } from 'react';
import './ui.css';

export default function CodeInput({ value = '', onChange, label = 'Código de sala', help, error, disabled = false, name = 'code' }) {
  const id = useId();
  const fields = useRef([]);
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const description = [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const focus = (index) => { fields.current[Math.max(0, Math.min(5, index))]?.focus(); };
  function write(raw, index, pasted = false) {
    const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!chars) return;
    const position = pasted && chars.length === 6 ? 0 : Math.min(index, code.length);
    const next = (code.slice(0, position) + chars + code.slice(position + chars.length)).slice(0, 6);
    onChange?.(next);
    focus(Math.min(position + chars.length, 5));
  }
  function keyDown(event, index) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); focus(index + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const position = event.key === 'Backspace' && !code[index] ? index - 1 : index;
      if (position >= 0) onChange?.(code.slice(0, position) + code.slice(position + 1));
      focus(Math.max(0, position));
    }
  }
  return <fieldset className="ui-field ui-code-field" disabled={disabled} aria-describedby={description}>
    <legend className="ui-field__label">{label}</legend>
    <input type="hidden" name={name} value={code} disabled={disabled} />
    <div className="ui-code-input">
      {Array.from({ length: 6 }, (_, index) => <input key={index} ref={element => { fields.current[index] = element; }}
        type="text" inputMode="text" autoCapitalize="characters" autoComplete={index === 0 ? 'one-time-code' : 'off'} spellCheck={false}
        aria-label={`${label}: carácter ${index + 1} de 6`} aria-invalid={error ? true : undefined} aria-describedby={description}
        value={code[index] || ''} maxLength={6} disabled={disabled} className="ui-code-input__cell"
        onFocus={event => event.target.select()}
        onChange={event => { if (event.target.value === '') { onChange?.(code.slice(0, index) + code.slice(index + 1)); } else { write(event.target.value, index); } }}
        onKeyDown={event => keyDown(event, index)}
        onPaste={event => { event.preventDefault(); write(event.clipboardData.getData('text'), index, true); }} />)}
    </div>
    {help && <span id={`${id}-help`} className="ui-field__help">{help}</span>}
    {error && <span id={`${id}-error`} className="ui-field__error">{error}</span>}
  </fieldset>;
}
