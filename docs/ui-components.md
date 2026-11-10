# Componentes compartidos

La galería interactiva está en `/dev/ui` al ejecutar `npm run dev`. Solo se
registra en desarrollo y no usa Supabase. Las páginas v1 conservan sus rutas;
la incorporación de estos componentes a los flujos v2 se hará por fases.

## Acciones y feedback

- `Button`: `variant="primary|secondary|text|danger"`, `loading`, `loadingText`,
  `disabled`, `fullWidth`, `compact` y props de botón nativo. Por defecto es
  `type="button"`; usar `type="submit"` al enviar un formulario.
- `IconButton`: `label` obligatorio para el nombre accesible, icono como hijo y
  props nativas, incluido `ref` (React 19).
- `Chip`: `variant="waiting|drawn|neutral|host|self"` y texto como hijo.
- `Avatar`: `name` genera iniciales; `variant="primary|soft|neutral"`. Es
  decorativo por defecto; pasar `label` si debe anunciarse de forma independiente.
- `ErrorBanner`: `message`, `onRetry`, `actionLabel` y `loading`. El mensaje se
  obtiene de `getErrorMessage(AppError)` en el punto que consume el error.
- `Toast`: `message`, `onDismiss` y `duration` en milisegundos (5000 por defecto;
  0 desactiva el cierre automático). Pausa el tiempo con foco o puntero encima.
  Mantener una sola instancia por pantalla/app y cambiar su mensaje.
- `Spinner`: `label`; `decorative` cuando otro texto ya anuncia la operación.
- `Skeleton`: `variant="line|avatar|card|participant"`, `label` y `lines`.
- `ReconnectingChip`: indicador no bloqueante con texto y spinner decorativo.

## Campos

- `TextField` admite props nativas de input, `label`, `help`, `error`, `prefix`
  y `ref`. Su `onChange` recibe el evento nativo de React. Las ayudas y errores
  quedan asociados por `aria-describedby` sin perder descripciones adicionales.
- `MoneyField` recibe `value` como texto y entrega `onChange(texto)` con dígitos
  o vacío. Usa teclado numérico y prefijo Bs. La validación de rango es del
  formulario/dominio; no convierte un decimal pegado en otra cantidad.
- `CodeInput` recibe `value` como código contiguo y `onChange(codigo)`. Normaliza
  a seis alfanuméricos en mayúsculas, permite pegar y usa flechas, Delete y
  Backspace. `label`, `help`, `error`, `disabled` y `name` son configurables.
  Adapta la cuadrícula si no hay ancho para seis objetivos táctiles de 44 px.
- `Segmented` usa radios nativos: `label`, `value`, `onChange(valor)`, `disabled`
  y `options=[{ value, label, disabled? }]`. Por defecto ofrece las tres
  frecuencias de la spec. Las flechas y la tabulación siguen el patrón nativo.
- `DateField` usa `type="month"` para mensual (`YYYY-MM`) y `type="date"` para
  semanal/quincenal (`YYYY-MM-DD`). El mínimo corresponde a `America/La_Paz`;
  admite `today` explícito para pruebas. El consumidor adapta el valor al cambiar
  de frecuencia y valida antes de enviar. No calcula calendarios de turnos.

## Contenedores

- `Card`: `as` opcional para elegir un elemento semántico y props nativas.
- `Sheet`: `open`, `title`, `description`, `onClose`, `dismissible` e
  `initialFocusRef`. Aísla el fondo, bloquea el scroll, retiene Tab y restaura
  el foco al cerrar. `dismissible={false}` permite pedir el perfil sin cerrarlo.
- `Menu`: `label` e `items=[{ label, onSelect, disabled?, danger?, icon? }]`.
  Admite flechas, Home, End, Tab, Escape y cierre al pulsar fuera.
- `EmptyState`: `title`, `description` y `action` como elemento de React.
- `AguayoStripe`: `variant="diamonds|stripes|steps"` y `height` (8–12 px).

## Tokens, formato y accesibilidad

Todos los colores salen de `shared/styles/tokens.css`. El modo oscuro está
definido bajo `[data-theme="dark"]`; la app no aplica ese atributo ni sigue
automáticamente la preferencia del sistema todavía.

Los bordes de controles activos y el placeholder usan tokens de mayor contraste
que los decorativos del canvas para cumplir el requisito 11.6 (AA). Se mantienen
la paleta y la geometría del diseño. La reducción de movimiento desactiva las
animaciones de carga y las transiciones.

`formatMoney` recibe enteros no negativos y produce `Bs 1.600`.
`formatTurnDate` recibe una fecha ISO válida y frecuencia, sin desplazamiento
horario: `Enero 2027` o `15 ene 2027`. Ambos rechazan valores inválidos con
`RangeError`. `formatMonth` se conserva para v1.

`AppError(code, cause)` conserva el diagnóstico; `getErrorMessage(error)` devuelve
solo mensajes conocidos en español o el genérico. La futura capa `api` será
responsable de traducir errores de Supabase a estos códigos.
