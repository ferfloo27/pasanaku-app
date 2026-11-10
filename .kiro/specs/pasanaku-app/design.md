# Design Document — Pasanaku App

## Overview

Pasanaku organiza el sorteo de una tanda de ahorro: el anfitrión crea una sala (nombre, cuota, frecuencia, inicio), comparte un código o link, los participantes se unen, el anfitrión arma un borrador privado, lo confirma y todos ven la revelación en vivo y los resultados con fecha y monto.

**Stack:** React 19 + Vite + React Router en el frontend; Supabase (Auth anónimo + Google, PostgreSQL, Realtime) como backend. Sin servidor propio.

**Cambios principales frente a la versión anterior del diseño:**

1. **Escrituras por RPC transaccionales.** Crear sala, unirse, eliminar, cancelar y confirmar el sorteo son funciones PostgreSQL (`security definer`) que validan y escriben en una sola transacción. El cliente no tiene permisos directos de escritura. Esto elimina: confirmaciones a medias (turnos guardados sin cambiar el estado), carreras en el cupo de participantes, y anfitriones que puedan modificar columnas arbitrarias.
2. **Arquitectura por funcionalidad** (`features/*`) con tres capas: `domain` (lógica pura), `api` (Supabase) y `ui`/`hooks`.
3. **Pre-unión** para quien abre un link sin ser participante (`get_room_preview`).
4. **Modelo de datos ampliado:** nombre de sala, cuota, frecuencia, fecha y monto por turno.
5. **"Tus salas" desde la base de datos**, no desde `localStorage`, para que vincular Google recupere las salas en otro dispositivo.
6. **Sistema de diseño** definido en `docs/design-brief.md` y en el canvas "Pasanaku" de Claude Design.

---

## Architecture

```
┌──────────────────────────── Browser (React) ─────────────────────────────┐
│                                                                           │
│  app/  Router · AuthProvider · RequireSession/RequireProfile · Providers  │
│    │                                                                      │
│  pages/  (delgadas: componen features)                                    │
│    │                                                                      │
│  features/<feature>/                                                      │
│    ui/      componentes de la funcionalidad                               │
│    hooks/   estado + orquestación (useRoomSession, useDraft…)             │
│    api/     ÚNICO acceso a Supabase · traduce errores a códigos propios   │
│    domain/  funciones puras (sin React, sin Supabase) · tests de propiedad │
│                                                                           │
│  shared/  ui/ (sistema de diseño) · lib/supabase · format/ · errors/      │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ supabase-js: rpc() / select() / channel()
┌───────────────────────────────▼───────────────────────────────────────────┐
│ Supabase                                                                  │
│  Auth: anónimo + Google (linkIdentity)                                    │
│  PostgreSQL: tablas + RLS (solo lectura) + RPC security definer (escritura)│
│  Realtime: postgres_changes de rooms y participants                       │
└───────────────────────────────────────────────────────────────────────────┘
```

### Reglas de dependencia

- `domain` no importa nada de la app (ni React, ni Supabase).
- `api` importa `shared/lib/supabase` y `domain`; nunca componentes.
- `hooks` importan `api` y `domain`; `ui` importa `hooks`, `domain` (para formatear/validar) y `shared/ui`.
- Ningún componente importa `supabase` directamente. (Se puede reforzar con la regla `no-restricted-imports` de ESLint.)
- `pages` solo componen; no contienen lógica de datos.

---

## File Structure

```
src/
├── app/
│   ├── App.jsx                 # Router
│   ├── routes.jsx              # /, /new, /join, /room/:code
│   ├── AuthProvider.jsx        # sesión + perfil en contexto
│   └── guards.jsx              # RequireSession, RequireProfile
├── features/
│   ├── auth/
│   │   ├── api/authApi.js              # ensureSession, linkGoogle, onAuthChange
│   │   └── hooks/useAuth.js
│   ├── profile/
│   │   ├── api/profileApi.js           # getProfile, saveDisplayName
│   │   ├── domain/displayName.js       # validateDisplayName
│   │   ├── hooks/useProfile.js
│   │   └── ui/ProfileNameSheet.jsx
│   ├── rooms/
│   │   ├── api/roomsApi.js             # createRoom, getRoomPreview, joinRoom, cancelRoom,
│   │   │                               # removeParticipant, fetchRoomState, listMyRooms
│   │   ├── api/roomChannel.js          # suscripción Realtime única por sala
│   │   ├── domain/roomForm.js          # validateRoomForm, payoutPerTurn
│   │   ├── domain/roomCode.js          # normalizeCode, isValidCode
│   │   ├── domain/roomMachine.js       # reducer de la máquina de estados de la sala
│   │   ├── hooks/useRoomSession.js     # carga + realtime + resync + máquina de estados
│   │   ├── hooks/useMyRooms.js
│   │   └── ui/ (RoomCard, RoomCodeBlock, RoomSummary, ParticipantList,
│   │           CreateRoomForm, RoomReady, JoinCodeForm, RoomPreview, Lobby,
│   │           RoomMenu, RemoveParticipantSheet, CancelRoomSheet)
│   └── draw/
│       ├── api/drawApi.js              # confirmDraw
│       ├── domain/shuffle.js           # Fisher-Yates
│       ├── domain/schedule.js          # turnDate(start, frequency, position)
│       ├── domain/draft.js             # buildDraft, moveDraftItem, draftToOrder
│       ├── hooks/useDraft.js
│       ├── hooks/useReveal.js          # temporizador, saltar, reduced-motion
│       └── ui/ (DraftEditor, ConfirmDrawSheet, Reveal, Results, TurnRow)
├── shared/
│   ├── ui/ (Button, IconButton, TextField, CodeInput, MoneyField, Segmented,
│   │        DateField, Chip, Card, Avatar, Sheet, Menu, ErrorBanner, Toast,
│   │        Skeleton, Spinner, ReconnectingChip, EmptyState, AguayoStripe)
│   ├── styles/tokens.css       # tokens primitivos y semánticos (claro + oscuro)
│   ├── styles/base.css
│   ├── lib/supabase.js
│   ├── errors/appError.js      # códigos de error y mensajes en español
│   └── format/ (money.js, dates.js)
├── pages/ (HomePage, NewRoomPage, JoinPage, RoomPage)
└── main.jsx
supabase/
├── migrations/
│   ├── 0001_schema.sql
│   ├── 0002_rls.sql
│   └── 0003_rpc.sql
└── tests/                      # pruebas de RLS/RPC (pgTAP o scripts con supabase-js)
```

**Eliminado:** `utils/clientId.js`, `services/fetchService.js`, `services/joinRoomService.js` (duplicados) y el `drawTurns` actual.

---

## Data Models

```sql
create type room_status as enum ('waiting', 'drawn', 'cancelled');
create type room_frequency as enum ('weekly', 'biweekly', 'monthly');

create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table rooms (
  id               uuid primary key default gen_random_uuid(),
  code             char(6) unique not null check (code ~ '^[A-Z0-9]{6}$'),
  name             text not null check (char_length(btrim(name)) between 1 and 60),
  host_user_id     uuid not null references auth.users(id),
  host_name        text not null,                       -- snapshot del display_name
  contribution_bs  integer not null check (contribution_bs between 1 and 100000),
  frequency        room_frequency not null default 'monthly',
  start_date       date not null,                       -- mensual: día 1 del mes
  max_participants integer not null default 30 check (max_participants between 2 and 30),
  status           room_status not null default 'waiting',
  drawn_at         timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now()
);

create table participants (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references rooms(id) on delete cascade,
  user_id   uuid not null references auth.users(id),
  name      text not null,                              -- snapshot del display_name
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table turns (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id),
  position       integer not null check (position >= 1),
  turn_date      date not null,
  payout_bs      integer not null,                       -- contribution_bs × N
  unique (room_id, position),
  unique (room_id, participant_id)
);
```

Notas:

- `host_name` y `participants.name` son una copia del nombre al momento de crear/unirse; cambiar el Perfil no renombra participaciones existentes (Requirement 1.10).
- `turns.participant_id` no usa `on delete cascade`: tras el sorteo no se puede eliminar participantes (`remove_participant` lo impide).
- `assigned_month` se reemplaza por `turn_date` para soportar frecuencias semanales y quincenales.

---

## Security: RLS + RPC

### Permisos de tabla

```sql
revoke insert, update, delete on rooms, participants, turns from anon, authenticated;
alter table rooms enable row level security;   -- ídem participants, turns, profiles
```

### Función helper

```sql
create function is_room_participant(target_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from participants
                 where room_id = target_room and user_id = auth.uid());
$$;
```

### Políticas de lectura

| Tabla | SELECT permitido si… |
|---|---|
| `profiles` | `user_id = auth.uid()` (también INSERT/UPDATE propios) |
| `rooms` | `is_room_participant(id)` |
| `participants` | `is_room_participant(room_id)` |
| `turns` | `is_room_participant(room_id)` |

No existe política que permita listar salas ajenas. La información previa a unirse sale solo de `get_room_preview`.

### RPC (todas `security definer`, `set search_path = public`, usan `auth.uid()`)

| Función | Valida | Escribe | Errores (`raise exception '<CODE>'`) |
|---|---|---|---|
| `create_room(name, contribution_bs, frequency, start_date, max_participants)` → `rooms` | sesión, perfil con nombre, campos, fecha no pasada | genera código único (bucle con reintento), inserta sala e inserta al anfitrión como participante | `PROFILE_REQUIRED`, `INVALID_INPUT`, `CODE_GENERATION_FAILED` |
| `get_room_preview(code)` → registro con nombre, anfitrión, conteo, máx., cuota, frecuencia, inicio, estado, `is_member` | código válido | — | `ROOM_NOT_FOUND` |
| `join_room(code)` → `rooms` | `select … for update` de la sala; estado `waiting`; cupo; ya es miembro → devuelve la sala sin insertar | inserta participante con `display_name` | `ROOM_NOT_FOUND`, `ROOM_DRAWN`, `ROOM_CANCELLED`, `ROOM_FULL`, `PROFILE_REQUIRED` |
| `remove_participant(participant_id)` | es anfitrión; sala `waiting`; no se elimina a sí mismo | borra participante | `NOT_HOST`, `ROOM_NOT_WAITING`, `CANNOT_REMOVE_HOST` |
| `cancel_room(room_id)` | es anfitrión; sala `waiting` | `status = 'cancelled'`, `cancelled_at` | `NOT_HOST`, `ROOM_NOT_WAITING` |
| `confirm_draw(room_id, participant_ids uuid[])` | es anfitrión; `for update`; sala `waiting`; el arreglo contiene exactamente a los participantes actuales, sin repetidos; N ≥ 2 | inserta N `turns` con `position`, `turn_date`, `payout_bs`; `status = 'drawn'`, `drawn_at` | `NOT_HOST`, `ROOM_NOT_WAITING`, `PARTICIPANTS_CHANGED`, `NOT_ENOUGH_PARTICIPANTS` |
| `list_my_rooms()` → salas `waiting`/`drawn` con conteo y rol; y salas `cancelled` de los últimos 30 días para el aviso | — | — | — |

`turn_date` se calcula en SQL con la misma regla que `domain/schedule.js` (mensual `+ (p-1) month`, semanal `+ 7*(p-1)`, quincenal `+ 15*(p-1)` días), para que el borrador y lo persistido coincidan. Un test compara ambas implementaciones.

**Unirse tras ser eliminado:** como `join_room` solo exige `waiting` y cupo, una persona eliminada puede volver mientras no haya sorteo; después del sorteo no (Requirement 5.8). No se necesita lista de bloqueados.

---

## Domain (funciones puras)

```js
// features/draw/domain/shuffle.js
export function shuffle(items, random = Math.random) { /* Fisher-Yates sobre copia */ }

// features/draw/domain/schedule.js
export function turnDate(startDate, frequency, position) { /* ISO 'YYYY-MM-DD', en UTC */ }

// features/draw/domain/draft.js
export function buildDraft(participants, room, random) {
  // -> [{ participantId, name, position, turnDate }]
}
export function moveDraftItem(draft, fromIndex, toIndex, room) {
  // reordena y recalcula position + turnDate de todos
}
export const draftToOrder = (draft) => draft.map((d) => d.participantId);

// features/rooms/domain/roomForm.js
export function validateRoomForm(values, today) { /* -> { ok, errors: { field: CODE } } */ }
export const payoutPerTurn = (contributionBs, n) => contributionBs * n;

// features/rooms/domain/roomCode.js
export const normalizeCode = (s) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const isValidCode = (s) => /^[A-Z0-9]{6}$/.test(s);

// shared/format
formatMoney(1600)                      // "Bs 1.600"
formatTurnDate('2027-01-01', 'monthly') // "Enero 2027"
formatTurnDate('2027-01-15', 'weekly')  // "15 ene 2027"
```

`random` se inyecta para poder hacer tests deterministas.

La validación de la fecha de creación usa el día y el mes actuales en
`America/La_Paz` (decisión del 10-11-2026), independientemente de la zona de la
sesión PostgreSQL. Las fechas de turno siguen siendo fechas ISO sin hora.

---

## API layer y errores

Cada función de `api/` devuelve `{ data }` o lanza un `AppError` con un código propio:

```js
// shared/errors/appError.js
export class AppError extends Error { constructor(code, cause) { super(code); this.code = code; this.cause = cause; } }

export const MESSAGES = {
  ROOM_NOT_FOUND: 'Ese código no existe. Revísalo e intenta de nuevo.',
  ROOM_DRAWN: 'Esta sala ya hizo su sorteo, así que no entran más personas.',
  ROOM_CANCELLED: 'Esta sala fue cancelada.',
  ROOM_FULL: 'La sala llegó a su máximo de participantes.',
  PARTICIPANTS_CHANGED: 'Alguien entró o salió de la sala. Vuelve a sortear.',
  DRAW_FAILED: 'No pudimos anunciar el sorteo. Tu borrador sigue aquí; intenta de nuevo.',
  NETWORK: 'Sin conexión. Te mostramos lo último que vimos.',
  UNKNOWN: 'Algo salió mal. Intenta de nuevo.',
};
```

`api/` traduce `error.message` de Postgres (los códigos de `raise exception`) y los errores de red a estos códigos. La UI nunca muestra mensajes técnicos.

---

## Room session: máquina de estados

`useRoomSession(code)` encapsula la carga inicial, la suscripción Realtime única, la resincronización y un `useReducer` con `domain/roomMachine.js`.

```
              ┌─────────┐
              │ loading │
              └────┬────┘
   ┌───────────┬───┴──────┬─────────────┬───────────────┐
   ▼           ▼          ▼             ▼               ▼
not_found   preview     lobby        results        cancelled
            (no soy     (waiting,    (drawn,        (aviso → "/")
             miembro)    miembro)     al cargar)
               │ unirme     │
               └──────────► │ ── status→drawn (realtime) ──► revealing ──► results
                            │
                            ├── host: "Sortear" ──► drafting (local) ── confirmar ──► revealing
                            │                         └── cancelar borrador ──► lobby
                            └── me eliminaron (realtime DELETE) ──► removed (aviso → "/")
```

- `drafting` es solo del anfitrión y nunca se sincroniza; recargar lo descarta.
- `revealing` solo se entra por una transición en vivo `waiting → drawn`; al cargar una sala `drawn` se va directo a `results`.

---

## Realtime

Un canal por sala: `room:{roomId}`.

| Evento | Filtro | Acción |
|---|---|---|
| `UPDATE rooms` | `id=eq.{roomId}` | `drawn` → `revealing` (si estaba en lobby/drafting); `cancelled` → `cancelled` |
| `INSERT participants` | `room_id=eq.{roomId}` | agregar a la lista (marcar como nuevo para el destaque) |
| `DELETE participants` | `room_id=eq.{roomId}` | quitar de la lista; si es el usuario → `removed` |

Requisitos de Supabase: tablas en la publicación `supabase_realtime` y `replica identity full` en `participants` (para recibir `room_id`/`user_id` en el DELETE).

**Resync:** ante `visibilitychange` a visible, o cuando el canal vuelve a `SUBSCRIBED` tras `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED`, se llama `fetchRoomState(roomId)` (sala + participantes + turnos) y se despacha `SYNCED`. Mientras el canal no esté `SUBSCRIBED` se muestra `ReconnectingChip`.

---

## Routes and screens

| Ruta | Guard | Pantallas (artboards del canvas) |
|---|---|---|
| `/` | sesión + perfil | 6.1 Nombre de perfil (sheet), 6.2 Inicio, 6.2 Inicio vacío + aviso de sala cancelada |
| `/new` | sesión + perfil | 6.3 Crear sala → 6.3 Sala lista |
| `/join` | sesión + perfil | 6.4 Unirse, 6.4 Errores al unirse |
| `/room/:code` | sesión + perfil | 6.4 Pre-unión, 6.5 Lobby (anfitrión / participante / menos de 2 + menú), 6.5 Eliminar participante, 6.6 Borrador, 6.6 Confirmar, 6.7 Revelación, 6.8 Resultados, 6.9 Estados (no encontrada, cancelada, eliminado, reconectando, cargando, sin conexión) |

Las rutas reemplazan el `useState` de vista actual de `HomePage`, para que el botón "atrás" funcione.

---

## Design System

Fuente de verdad visual: el canvas "Pasanaku" de Claude Design (artboards "Sistema de diseño", "Componentes" y "Modo oscuro") y `docs/design-brief.md`. En código vive en `shared/styles/tokens.css`; los componentes de `shared/ui` solo usan tokens semánticos.

### Tokens semánticos

| Token | Claro | Oscuro |
|---|---|---|
| `--color-bg` | `#FBF3EC` | `#1C1416` |
| `--color-surface` | `#FFFFFF` | `#2A1F22` |
| `--color-surface-raised` | `#FFFFFF` | `#33262A` |
| `--color-border` | `#E8DCD2` | `#3D2E32` |
| `--color-field-border` | `#D9C8BE` | `#5A4449` |
| `--color-text` | `#2C2C2A` | `#F3ECE8` |
| `--color-text-muted` | `#6E5A55` | `#BFAFA9` |
| `--color-text-disabled` | `#9A8A84` | `#8A7A75` |
| `--color-primary` | `#8B1E2F` | `#D97789` |
| `--color-primary-pressed` | `#5C1220` | `#E8A0AD` |
| `--color-on-primary` | `#FFFFFF` | `#1C1416` |
| `--color-focus` | `#B5475A` | `#E8A0AD` |
| `--color-accent-soft` | `#F6DDE2` | `#4A2630` |
| `--color-accent-border` | `#E9B5C0` | `#6B3A47` |
| `--color-on-accent-soft` | `#5C1220` | `#F6DDE2` |
| `--color-accent` (oro, decorativo) | `#D9A441` | `#E0B45C` |
| `--color-danger` / `-soft` | `#B3261E` / `#FCEBEB` | `#F2867E` / `#4A1E1E` |
| `--color-success` / `-soft` | `#27500A` / `#E3F1E4` | `#9CCB7A` / `#1F3318` |
| `--color-warning` / `-soft` | `#633806` / `#FAEEDA` | `#F0C27A` / `#3D2A10` |

Modo oscuro: se activa con `[data-theme="dark"]` y `prefers-color-scheme`; queda **definido pero desactivado** en esta iteración.

### Tipografía, forma y espacio

- Nunito 400/600/700 (texto), JetBrains Mono 700 (códigos, `letter-spacing: 0.2em`).
- Escala: Display 28/34 · Título 22/28 · Subtítulo 17/24 · Cuerpo 15/22 · Nota 13/18 · Código 24–32.
- Radios: tarjeta 18 · campo 12 · botón/chip 999 · sheet 24 (solo arriba).
- Espaciado base 4 (4, 8, 12, 16, 20, 24, 32); margen lateral 16.
- Botones de 52px (primario de pantalla) y 44px (secundarios); área táctil mínima 44.
- Iconos de línea (Lucide), trazo 2.
- `AguayoStripe`: franja SVG de 8–12px (rombo oro sobre vino) en cabecera, bloque de código y revelación.
- Animaciones (entrada de participante, revelación, skeleton) envueltas en `prefers-reduced-motion`.

---

## Error Handling

| Escenario | Respuesta |
|---|---|
| Falla `signInAnonymously` | `ErrorBanner` + "Reintentar"; formularios bloqueados |
| Falla o se cancela `linkIdentity` | `ErrorBanner`; sesión anónima intacta |
| Código inexistente (`/join`) | Error bajo el campo |
| Link a sala inexistente | Vista "No encontramos esta sala" |
| Sala sorteada / cancelada / llena al unirse | Tarjeta de la sala con mensaje y "Volver al inicio" |
| Otro ocupó el último lugar entre la pre-unión y "Unirme" | `ROOM_FULL` desde `join_room` |
| Falla `create_room` | `ErrorBanner`, formulario conservado |
| Participantes cambiaron antes de confirmar | `PARTICIPANTS_CHANGED`: se pide volver a sortear |
| Falla `confirm_draw` | `ErrorBanner` en el borrador + "Reintentar"; borrador conservado |
| Doble confirmación (dos pestañas) | La segunda recibe `ROOM_NOT_WAITING`; se resincroniza y muestra resultados |
| Me eliminan / cancelan la sala estando dentro | Vista de estado con "Ir al inicio" |
| Realtime caído | `ReconnectingChip`; resync al reconectar |
| Sin internet | Banner "Sin conexión…" con datos en caché y "Reintentar" |

---

## Testing Strategy

| Capa | Herramienta | Qué |
|---|---|---|
| `domain` | Vitest + fast-check | Propiedades 1–7 (abajo). Sin mocks. |
| `api` | Vitest con cliente Supabase simulado | Traducción de errores a `AppError`, forma de las llamadas `rpc()` |
| `hooks` | Vitest + Testing Library | `roomMachine` (reducer puro), `useDraft`, `useReveal` con timers falsos |
| `ui` | Testing Library | Estados deshabilitado/cargando/error de formularios y controles del anfitrión |
| Base de datos | Supabase local (`supabase start`) + pgTAP o scripts | Propiedades 8–11: RLS y RPC |

### Correctness Properties

1. **Código de sala:** `generate`/`normalizeCode` producen siempre 6 caracteres `[A-Z0-9]`; `isValidCode(normalizeCode(x))` para toda entrada con ≥6 alfanuméricos.
2. **Shuffle:** devuelve una permutación del arreglo de entrada (mismos elementos, sin duplicados ni omisiones).
3. **Borrador válido:** para N ≥ 2 participantes, `buildDraft` produce N filas con posiciones `1..N` sin repetición y `turnDate = turnDate(start, frequency, position)`.
4. **Reordenar preserva la validez:** para todo borrador válido y todo `(from, to)` en rango, `moveDraftItem` devuelve un borrador que cumple la propiedad 3 y contiene los mismos participantes.
5. **Fechas monótonas:** para toda frecuencia y fecha de inicio, `turnDate(p + 1) > turnDate(p)`; en mensual, el día del mes se conserva como 1.
6. **Formato:** `formatTurnDate` y `formatMoney` producen el formato en español esperado para todo valor válido.
7. **Validación del formulario:** `validateRoomForm` rechaza todo nombre vacío o de más de 60 caracteres, toda cuota fuera de 1–100 000, todo máximo fuera de 2–30 y toda fecha pasada.
8. **Escritura solo por RPC:** para todo usuario autenticado, INSERT/UPDATE/DELETE directos sobre `rooms`, `participants` y `turns` son rechazados.
9. **Autorización del anfitrión:** `cancel_room`, `remove_participant` y `confirm_draw` fallan con `NOT_HOST` para cualquier `auth.uid()` distinto de `host_user_id`.
10. **Cupo atómico:** con la sala en `max_participants − 1` y dos `join_room` concurrentes de usuarios distintos, exactamente uno tiene éxito.
11. **Confirmación atómica e idempotente:** si `confirm_draw` falla, no queda ningún `turn` y la sala sigue `waiting`; si la sala ya está `drawn`, una nueva llamada no crea ni modifica `turns`.
12. **Paridad de fechas:** `turn_date` calculado en SQL coincide con `domain/schedule.js` para las tres frecuencias.
13. **Nombre al vincular Google:** un `display_name` no vacío no cambia tras `linkIdentity`.
