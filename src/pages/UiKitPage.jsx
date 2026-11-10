import { useEffect, useState } from 'react';
import Button from '../shared/ui/Button';
import IconButton from '../shared/ui/IconButton';
import Icon from '../shared/ui/Icon';
import Chip from '../shared/ui/Chip';
import Avatar from '../shared/ui/Avatar';
import TextField from '../shared/ui/TextField';
import CodeInput from '../shared/ui/CodeInput';
import MoneyField from '../shared/ui/MoneyField';
import Segmented from '../shared/ui/Segmented';
import DateField from '../shared/ui/DateField';
import Card from '../shared/ui/Card';
import Sheet from '../shared/ui/Sheet';
import Menu from '../shared/ui/Menu';
import EmptyState from '../shared/ui/EmptyState';
import AguayoStripe from '../shared/ui/AguayoStripe';
import ErrorBanner from '../shared/ui/ErrorBanner';
import Toast from '../shared/ui/Toast';
import Skeleton from '../shared/ui/Skeleton';
import Spinner from '../shared/ui/Spinner';
import ReconnectingChip from '../shared/ui/ReconnectingChip';
import { formatMoney } from '../shared/format/money';
import { formatTurnDate } from '../shared/format/dates';
import { AppError, getErrorMessage } from '../shared/errors/appError';
import './UiKitPage.css';
import ProfilePreview from './ProfilePreview';

const variants = [
  { variant: 'primary', name: 'Primario', text: 'Crear sala', loading: 'Creando…' },
  { variant: 'secondary', name: 'Secundario', text: 'Unirme con código', loading: 'Buscando…' },
  { variant: 'text', name: 'Texto', text: 'Editar nombre', loading: 'Guardando…' },
  { variant: 'danger', name: 'Peligro', text: 'Cancelar sala', loading: 'Cancelando…' },
];
const palette = [
  ['primary', 'Vino · marca'], ['bg', 'Crema · fondo'], ['accent-soft', 'Rosa · destacado'],
  ['accent', 'Oro · decorativo'], ['text', 'Tinta · texto'], ['surface', 'Blanco · superficie'],
];

function Showcase({ id, title, note, children, className = '' }) {
  return <Card as="section" id={id} className={`ui-kit-section ${className}`} aria-labelledby={`${id}-title`}>
    <header className="ui-kit-section__header"><h2 id={`${id}-title`}>{title}</h2>{note && <p>{note}</p>}</header>{children}
  </Card>;
}

export default function UiKitPage() {
  const [name, setName] = useState('Pasanaku Familia Mamani');
  const [code, setCode] = useState('K7Q');
  const [money, setMoney] = useState('200');
  const [frequency, setFrequency] = useState('monthly');
  const [date, setDate] = useState('2027-01');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    if (!retrying) return;
    const timer = setTimeout(() => { setRetrying(false); setToast('Reintento de muestra completado.'); }, 900);
    return () => clearTimeout(timer);
  }, [retrying]);
  const sampleAction = () => setToast('Esta es una acción de muestra.');
  function changeFrequency(next) {
    setFrequency(next);
    setDate(next === 'monthly' ? date.slice(0, 7) : date.length === 7 ? `${date}-01` : date);
  }
  return <div className="ui-kit">
    <AguayoStripe />
    <a className="ui-kit-skip" href="#acciones">Saltar a los componentes</a>
    <main className="ui-kit__main">
      <header className="ui-kit-header">
        <div><p className="ui-kit-eyebrow">Pasanaku · Biblioteca visual</p><h1>Componentes y estados</h1>
          <p className="ui-kit-intro">Una base cálida para organizar el ahorro entre todos. Prueba los controles, recorre sus estados y revisa cada detalle.</p></div>
        <Chip variant="self">Solo en desarrollo</Chip>
      </header>
      <nav className="ui-kit-nav" aria-label="Secciones de componentes">
        <a href="#sistema">Sistema</a><a href="#acciones">Acciones</a><a href="#campos">Formularios</a><a href="#contenedores">Contenedores</a><a href="#feedback">Feedback</a><a href="#formatos">Formatos</a>
      </nav>

      <Showcase id="sistema" title="Nuestra base visual" note="Vino, crema y acentos de aguayo. Colores semánticos compartidos por todos los componentes.">
        <div className="ui-kit-palette">{palette.map(([token, label]) => <div key={token}><span className="ui-kit-swatch" style={{ background: `var(--color-${token})` }} /><strong>{label}</strong></div>)}</div>
        <div className="ui-kit-type"><div><span className="ui-kit-eyebrow">Nunito · texto</span><p className="ui-kit-display">Hola, Lucía</p><p>Organiza el sorteo con tu familia, amigos o trabajo.</p></div><div><span className="ui-kit-eyebrow">JetBrains Mono · códigos</span><p className="ui-kit-code">K7QM3P</p><span className="ui-kit-muted">Legible, fácil de copiar y compartir.</span></div></div>
        <p className="ui-kit-muted">El modo oscuro queda definido en los tokens y desactivado en esta versión.</p>
      </Showcase>

      <Showcase id="acciones" title="Acciones" note="Reposo, presionado, foco, deshabilitado y cargando. Usa Tab para recorrer los controles.">
        <div className="ui-kit-action-table"><div className="ui-kit-action-head"><span>Variante</span><span>Reposo</span><span>Presionado</span><span>Foco</span><span>Deshabilitado</span><span>Cargando</span></div>
          {variants.map(item => <div key={item.variant} className="ui-kit-action-row"><h3>{item.name}</h3>
            <div><span className="ui-kit-mobile-label">Reposo</span><Button variant={item.variant} onClick={sampleAction}>{item.text}</Button></div>
            <div className="ui-kit-state-pressed"><span className="ui-kit-mobile-label">Presionado</span><Button variant={item.variant} onClick={sampleAction}>{item.text}</Button></div>
            <div className="ui-kit-state-focus"><span className="ui-kit-mobile-label">Foco</span><Button variant={item.variant} onClick={sampleAction}>{item.text}</Button></div>
            <div><span className="ui-kit-mobile-label">Deshabilitado</span><Button variant={item.variant} disabled>{item.text}</Button></div>
            <div><span className="ui-kit-mobile-label">Cargando</span><Button variant={item.variant} loading loadingText={item.loading}>{item.text}</Button></div>
          </div>)}
        </div>
        <div className="ui-kit-inline"><IconButton label="Editar tu nombre" onClick={sampleAction}><Icon name="edit" /></IconButton><IconButton label="Agregar participante" onClick={sampleAction}><Icon name="plus" /></IconButton><IconButton label="Acción deshabilitada" disabled><Icon name="close" /></IconButton></div>
        <div className="ui-kit-inline"><Chip variant="waiting">En espera</Chip><Chip variant="drawn">Sorteada</Chip><Chip variant="neutral">Cancelada</Chip><Chip variant="host">Anfitrión</Chip><Chip variant="self">Tú</Chip></div>
        <div className="ui-kit-inline"><Avatar name="Rosa Mamani" variant="primary" label="Rosa Mamani" /><Avatar name="Lucía Mamani" label="Lucía Mamani" /><Avatar name="Juan Quispe" variant="neutral" label="Juan Quispe" /><Avatar label="Sin nombre" /></div>
      </Showcase>

      <div className="ui-kit-grid">
        <Showcase id="campos" title="Formularios" note="Etiquetas visibles, ayudas y errores junto a cada campo.">
          <form className="ui-kit-stack" onSubmit={event => { event.preventDefault(); setToast('Formulario de muestra listo.'); }}>
            <TextField label="Nombre de la sala" value={name} onChange={event => setName(event.target.value)} help="Ej. Pasanaku de la oficina" />
            <TextField label="Nombre con error" defaultValue="" error="Ponle un nombre a la sala." />
            <TextField label="Máx. participantes" value="30" disabled />
            <MoneyField value={money} onChange={setMoney} help="Monto entero en bolivianos." />
            <Segmented value={frequency} onChange={changeFrequency} />
            <DateField value={date} onChange={event => setDate(event.target.value)} frequency={frequency} help={frequency === 'monthly' ? 'Elige mes y año, desde el mes actual.' : 'Elige un día, desde hoy en Bolivia.'} />
            <CodeInput value={code} onChange={setCode} help="Pega un código o escribe en las seis casillas." />
            <Button type="submit" fullWidth>Probar formulario</Button>
          </form>
          <details className="ui-kit-details"><summary>Ver errores y campos deshabilitados</summary><div className="ui-kit-stack">
            <MoneyField label="Cuota con error" value="0" onChange={() => {}} error="Escribe una cuota entre Bs 1 y Bs 100.000." />
            <MoneyField label="Cuota deshabilitada" value="200" disabled />
            <DateField label="Fecha con error" value="2025-01" onChange={() => {}} error="Elige el mes actual o uno posterior." />
            <DateField label="Fecha deshabilitada" value="2027-01" disabled />
            <Segmented label="Frecuencia deshabilitada" value="monthly" disabled />
            <CodeInput label="Código con error" value="K7QM9X" onChange={() => {}} error="Ese código no existe. Revísalo e intenta de nuevo." />
            <CodeInput label="Código deshabilitado" value="K7QM3P" disabled />
          </div></details>
        </Showcase>

        <Showcase id="contenedores" title="Contenedores" note="Superficies tranquilas, bordes suaves y acentos donde importan.">
          <Card className="ui-kit-room"><div className="ui-kit-between"><h3>Pasanaku Familia Mamani</h3><Chip variant="waiting">En espera</Chip></div><p className="ui-kit-muted">8 participantes · Organiza Rosa Mamani</p></Card>
          <Card className="ui-kit-code-card"><AguayoStripe variant="stripes" height={8} /><div className="ui-kit-code-card__body"><p className="ui-kit-muted">Código de la sala</p><p className="ui-kit-code">K7QM3P</p><Button variant="secondary" compact onClick={sampleAction}>Probar botón secundario</Button></div></Card>
          <div className="ui-kit-participants"><div><Avatar name="Rosa Mamani" variant="primary" /><strong>Rosa Mamani</strong><Chip variant="host">Anfitrión</Chip></div><div><Avatar name="Lucía Mamani" /><strong>Lucía Mamani</strong><Chip variant="self">Tú</Chip></div></div>
          <div className="ui-kit-between"><Button variant="secondary" compact onClick={() => setSheet('remove')}>Abrir hoja inferior</Button><Menu items={[
            { label: 'Compartir link', onSelect: () => setToast('Elegiste Compartir link.') },
            { label: 'Cancelar sala', danger: true, icon: <Icon name="close" size={18} />, onSelect: () => setSheet('cancel') },
          ]} /></div>
          <EmptyState action={<Button variant="secondary" compact onClick={sampleAction}>Unirme con código</Button>} />
          <div className="ui-kit-stack"><AguayoStripe /><AguayoStripe variant="stripes" height={8} /><AguayoStripe variant="steps" /></div>
        </Showcase>
      </div>

      <div className="ui-kit-grid">
        <Showcase id="feedback" title="Feedback" note="Qué pasó y qué hacer. Un solo estilo para errores, avisos y carga.">
          <ErrorBanner message="No pudimos conectarte. Revisa tu internet e intenta de nuevo." onRetry={() => setRetrying(true)} loading={retrying} />
          <div className="ui-kit-inline"><Button variant="secondary" compact onClick={() => setToast('Link copiado · aviso de muestra')}>Mostrar toast</Button><ReconnectingChip /><Spinner label="Cargando sala…" /></div>
          <Skeleton variant="participant" label="Cargando participantes…" /><Skeleton variant="participant" label="Cargando otro participante…" /><Skeleton variant="card" label="Cargando sala…" />
        </Showcase>
        <Showcase id="formatos" title="Formatos y mensajes" note="Bolivianos y fechas en español. Las fechas conservan su día en cualquier zona horaria.">
          <dl className="ui-kit-formats"><div><dt>Monto por turno</dt><dd>{formatMoney(1600)}</dd></div><div><dt>Mensual</dt><dd>{formatTurnDate('2027-01-01', 'monthly')}</dd></div><div><dt>Semanal y quincenal</dt><dd>{formatTurnDate('2027-01-15', 'biweekly')}</dd></div></dl>
          <p className="ui-kit-muted">Ejemplo de error de la aplicación:</p><ErrorBanner message={getErrorMessage(new AppError('ROOM_FULL'))} />
        </Showcase>
      </div>
      <Showcase id="perfil" title="Nombre de perfil" note="Primer uso obligatorio y edición del nombre, con datos de muestra."><ProfilePreview /></Showcase>
      <footer className="ui-kit-footer"><AguayoStripe variant="steps" height={8} /><p>Pasanaku · Componentes compartidos · Diseño base a 360 px</p></footer>
    </main>
    <div className="ui-kit-toast-region"><Toast message={toast} onDismiss={() => setToast('')} /></div>
    <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'cancel' ? '¿Cancelar esta sala?' : '¿Eliminar a Juan Quispe?'} description="Esta es una vista de muestra. No se modificará ninguna sala.">
      <p className="ui-kit-muted">{sheet === 'cancel' ? 'Todos verán que la sala fue cancelada.' : 'Saldrá de la sala. Puede volver a unirse con el código mientras no hagas el sorteo.'}</p>
      <Button variant="danger" fullWidth onClick={() => { setSheet(null); setToast('Acción de ejemplo completada.'); }}>{sheet === 'cancel' ? 'Cancelar sala' : 'Eliminar de la sala'}</Button>
      <Button variant="text" fullWidth onClick={() => setSheet(null)}>Volver</Button>
    </Sheet>
  </div>;
}
