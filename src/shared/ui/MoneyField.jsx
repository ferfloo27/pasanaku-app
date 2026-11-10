import TextField from './TextField';

export default function MoneyField({ label = 'Cuota por persona', value, onChange, ...props }) {
  return <TextField {...props} label={label} prefix="Bs" type="text" inputMode="numeric" pattern="[0-9]*" value={value}
    onChange={event => { if (/^\d*$/.test(event.target.value)) onChange?.(event.target.value); }} />;
}
