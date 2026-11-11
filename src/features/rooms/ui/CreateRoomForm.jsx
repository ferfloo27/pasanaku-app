import { useRef, useState } from 'react';
import { payoutPerTurn, validateRoomForm } from '../domain/roomForm';
import TextField from '../../../shared/ui/TextField';
import MoneyField from '../../../shared/ui/MoneyField';
import DateField from '../../../shared/ui/DateField';
import Segmented from '../../../shared/ui/Segmented';
import Button from '../../../shared/ui/Button';
import IconButton from '../../../shared/ui/IconButton';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import { formatMoney } from '../../../shared/format/money';
import { formatTurnDate } from '../../../shared/format/dates';
import './roomPresentation.css';

function boliviaToday() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const fieldMessages = {
  name: 'Escribe un nombre de 1 a 60 caracteres.', contributionBs: 'Ingresa un entero entre Bs 1 y Bs 100.000.',
  startDate: 'Elige una fecha válida que no sea pasada.', maxParticipants: 'Ingresa un entero entre 2 y 30.',
};

export default function CreateRoomForm({ onSubmit, onBack, today: suppliedToday }) {
  const today = suppliedToday || boliviaToday();
  const [values, setValues] = useState({ name: '', contributionBs: '', frequency: 'monthly', startDate: '', maxParticipants: '30' });
  const [touched, setTouched] = useState({});
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saving = useRef(false);
  const validation = validateRoomForm(values, today);
  const change = (field, value) => { setValues(previous => ({ ...previous, [field]: value })); setError(null); };
  const fieldError = field => touched[field] && validation.errors[field] ? fieldMessages[field] : undefined;
  const blur = field => () => setTouched(previous => ({ ...previous, [field]: true }));
  const quotaValid = !validation.errors.contributionBs;
  const exampleCount = Number(values.maxParticipants);
  async function submit(event) {
    event.preventDefault();
    setTouched({ name: true, contributionBs: true, startDate: true, maxParticipants: true });
    if (!validation.ok || saving.current) return;
    saving.current = true; setSaving(true); setError(null);
    try { await onSubmit(values); }
    catch (failure) { setError(failure); }
    finally { saving.current = false; setSaving(false); }
  }
  return <section className="room-create">
    <header className="room-create__header">
      {onBack && <IconButton label="Volver al inicio" disabled={isSaving} onClick={onBack}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m12 19-7-7 7-7M19 12H5" /></svg></IconButton>}
      <h1>Crear sala</h1>
    </header>
    <form className="room-create__form" noValidate onSubmit={submit}>
      <TextField label="Nombre de la sala" value={values.name} disabled={isSaving} onChange={e => change('name', e.target.value)} onBlur={blur('name')} error={fieldError('name')} autoComplete="off" />
      <MoneyField value={values.contributionBs} disabled={isSaving} onChange={value => change('contributionBs', value)} onBlur={blur('contributionBs')} error={fieldError('contributionBs')} />
      <Segmented value={values.frequency} disabled={isSaving} onChange={frequency => {
        setValues(previous => ({ ...previous, frequency, startDate: '' })); setError(null);
      }} />
      <DateField frequency={values.frequency} today={today} value={values.startDate} disabled={isSaving} onChange={e => change('startDate', e.target.value)} onBlur={blur('startDate')} error={fieldError('startDate')} help="Mensual: eliges mes y año. Semanal o quincenal: eliges el día." />
      <TextField label="Máx. participantes" type="text" inputMode="numeric" value={values.maxParticipants} disabled={isSaving} onChange={e => change('maxParticipants', e.target.value)} onBlur={blur('maxParticipants')} error={fieldError('maxParticipants')} help="Entre 2 y 30." />
      <div className="room-create__summary" aria-live="polite">
        <span>Resumen</span>
        <strong>{quotaValid ? `Cada turno recibe ${formatMoney(Number(values.contributionBs))} × participantes` : 'Ingresa la cuota para ver el resumen.'}</strong>
        {quotaValid && !validation.errors.maxParticipants && <span>Con {exampleCount} personas: {formatMoney(payoutPerTurn(Number(values.contributionBs), exampleCount))} por turno{!validation.errors.startDate ? `, desde ${formatTurnDate(values.frequency === 'monthly' ? `${values.startDate}-01` : values.startDate, values.frequency)}` : ''}.</span>}
      </div>
      {error && <ErrorBanner message={getErrorMessage(error)} />}
      <div className="room-create__footer"><Button type="submit" fullWidth loading={isSaving} loadingText="Creando…">Crear sala</Button></div>
    </form>
  </section>;
}
