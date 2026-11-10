import TextField from './TextField';

export default function DateField({ frequency = 'monthly', label = 'Fecha de inicio', today, ...props }) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type) => parts.find(value => value.type === type).value;
  const minimum = today || `${part('year')}-${part('month')}-${part('day')}`;
  const monthly = frequency === 'monthly';
  return <TextField {...props} label={label} type={monthly ? 'month' : 'date'} min={monthly ? minimum.slice(0, 7) : minimum} />;
}
