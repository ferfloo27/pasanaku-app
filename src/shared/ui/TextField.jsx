import { useId } from 'react';
import Field from './Field';

export default function TextField({ id: suppliedId, label, help, error, prefix, className = '', 'aria-describedby': describedBy, ...props }) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  const description = [help && `${id}-help`, error && `${id}-error`, describedBy].filter(Boolean).join(' ') || undefined;
  return <Field id={id} label={label} help={help} error={error}>
    <div className={`ui-field__control ${error ? 'ui-field__control--error' : ''}`}>
      {prefix && <span className="ui-field__prefix" aria-hidden="true">{prefix}</span>}
      <input {...props} id={id} className={`ui-input ${className}`} aria-invalid={error ? true : undefined} aria-describedby={description} />
    </div>
  </Field>;
}
