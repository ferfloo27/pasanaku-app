import { useId } from 'react';
import './ui.css';

const frequencies = [{ value: 'weekly', label: 'Semanal' }, { value: 'biweekly', label: 'Quincenal' }, { value: 'monthly', label: 'Mensual' }];

export default function Segmented({ label = 'Frecuencia', name, options = frequencies, value, onChange, disabled = false }) {
  const id = useId();
  return <fieldset className="ui-field ui-segmented-field" disabled={disabled}>
    <legend className="ui-field__label">{label}</legend>
    <div className="ui-segmented">
      {options.map(option => <label key={option.value} className="ui-segmented__option">
        <input type="radio" name={name || id} value={option.value} checked={value === option.value}
          disabled={disabled || option.disabled} onChange={() => onChange?.(option.value)} />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}
