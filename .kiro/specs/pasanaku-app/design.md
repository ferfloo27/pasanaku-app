# Design Document — Pasanaku App

## Overview

Pasanaku es una aplicación web de tanda de ahorro grupal (rotating savings group) construida con React + Vite y Supabase como backend. No requiere registro: la identidad se gestiona con un UUID por dispositivo almacenado en `localStorage`. El flujo principal es: crear sala → compartir código → participantes se unen → anfitrión sortea → todos ven resultados en tiempo real.

---

## Architecture

La aplicación sigue una arquitectura de cliente único sin servidor propio. Toda la lógica de datos pasa por el cliente Supabase JS. El estado de la UI es local (React state/hooks) y se sincroniza con Supabase Realtime para actualizaciones en tiempo real.

```
┌────────────────────────────────────────────────────────┐
│                     Browser (React)                     │
│                                                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Router  │  │   Pages /    │  │   Pure Utils     │ │
│  │ (React   │  │  Components  │  │  (clientId,      │ │
│  │  Router) │  │              │  │   codeGen,       │ │
│  └────┬─────┘  └──────┬───────┘  │   fisher-yates,  │ │
│       │               │          │   formatMonth)   │ │
│       │               │          └──────────────────┘ │
│       │         ┌─────▼──────┐                         │
│       │         │  Supabase  │  ←── Realtime subs      │
│       │         │  Service   │                         │
│       └─────────┤  (src/lib) │                         │
│                 └─────┬──────┘                         │
└───────────────────────┼────────────────────────────────┘
                        │ HTTPS / WebSocket
                 ┌──────▼──────┐
                 │  Supabase   │
                 │  (Postgres  │
                 │  + Realtime)│
                 └─────────────┘
```

---

## File Structure

```
src/
├── lib/
│   └── supabaseClient.js          # ya existe — cliente Supabase
├── utils/
│   ├── clientId.js                # getOrCreateClientId()
│   ├── roomCode.js                # generateRoomCode()
│   ├── fisherYates.js             # shuffle()
│   └── formatMonth.js            # formatMonth(dateStr)
├── services/
│   └── roomService.js             # createRoom(), joinRoom(), drawTurns(), fetchRoom(), fetchTurns()
├── pages/
│   ├── HomePage.jsx               # ruta /
│   └── RoomPage.jsx               # ruta /room/:code
├── components/
│   ├── CreateRoomForm.jsx
│   ├── JoinRoomForm.jsx
│   ├── Lobby.jsx
│   └── ResultsView.jsx
├── App.jsx                        # configura React Router
├── main.jsx
└── index.css
```

---

## Components & Interfaces

### `App.jsx`

Configura `BrowserRouter` con dos rutas:

```jsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/room/:code" element={<RoomPage />} />
</Routes>
```

---

### `utils/clientId.js`

```js
/**
 * Retrieves the client UUID from localStorage, or generates and stores a new one.
 * @returns {string} UUID v4
 */
export function getOrCreateClientId() {
  const KEY = 'pasanaku_client_id';
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}
```

---

### `utils/roomCode.js`

```js
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a random 6-character alphanumeric uppercase code.
 * @returns {string}
 */
export function generateRoomCode() {
  return Array.from({ length: 6 }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join('');
}
```

---

### `utils/fisherYates.js`

```js
/**
 * Returns a shuffled copy of the array using Fisher-Yates algorithm.
 * @param {Array} arr
 * @returns {Array}
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

---

### `utils/formatMonth.js`

```js
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Formats an ISO date string (YYYY-MM-DD or YYYY-MM) as "Mes YYYY" in Spanish.
 * @param {string} dateStr - e.g. "2026-01-01" or "2026-01"
 * @returns {string} e.g. "Enero 2026"
 */
export function formatMonth(dateStr) {
  const [year, month] = dateStr.split('-').map(Number);
  return `${MONTHS_ES[month - 1]} ${year}`;
}
```

---

### `services/roomService.js`

Centraliza todas las interacciones con Supabase para mantener los componentes limpios.

```js
import { supabase } from '../lib/supabaseClient';
import { generateRoomCode } from '../utils/roomCode';
import { shuffle } from '../utils/fisherYates';

/**
 * Creates a new room and inserts the host as first participant.
 * Retries code generation if collision detected (max 5 attempts).
 */
export async function createRoom({ hostName, startMonth, clientId }) { ... }

/**
 * Finds a room by code (case-insensitive) and joins as participant.
 */
export async function joinRoom({ code, name, clientId }) { ... }

/**
 * Fetches a single room by its code.
 * @returns {{ data: Room | null, error }}
 */
export async function fetchRoom(code) { ... }

/**
 * Runs the draw: shuffles participants, inserts turns, updates room status.
 */
export async function drawTurns({ roomId, participants, startMonth }) { ... }

/**
 * Fetches all turns for a room joined with participant names, ordered by position.
 */
export async function fetchTurns(roomId) { ... }
```

---

### `pages/HomePage.jsx`

Controla qué formulario mostrar (`null | 'create' | 'join'`).

```jsx
function HomePage() {
  const [view, setView] = useState(null); // null | 'create' | 'join'
  return (
    <main>
      {view === null && (
        <>
          <button onClick={() => setView('create')}>Crear sala</button>
          <button onClick={() => setView('join')}>Unirse a sala</button>
        </>
      )}
      {view === 'create' && <CreateRoomForm onBack={() => setView(null)} />}
      {view === 'join' && <JoinRoomForm onBack={() => setView(null)} />}
    </main>
  );
}
```

---

### `pages/RoomPage.jsx`

Carga la sala por código al montar, suscribe al canal Realtime de `rooms` para detectar el cambio de `status`. Renderiza `<Lobby>` o `<ResultsView>` según `room.status`.

```jsx
function RoomPage() {
  const { code } = useParams();
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const clientId = getOrCreateClientId();

  // Load room + subscribe to status changes
  useEffect(() => {
    fetchRoom(code).then(({ data }) => setRoom(data));
    const channel = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room?.id}` },
        (payload) => setRoom(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [code]);

  if (!room) return <p>Cargando...</p>;
  if (room.status === 'drawn') return <ResultsView room={room} />;
  return <Lobby room={room} participants={participants} setParticipants={setParticipants} clientId={clientId} />;
}
```

---

### `components/Lobby.jsx`

- Muestra código de sala prominente.
- Suscribe al canal Realtime de `participants` filtrando por `room_id`.
- Muestra botón "Sortear orden" sólo si `clientId` coincide con el `client_id` del anfitrión en la lista.
- Deshabilita el botón si `participants.length < 2`.

---

### `components/ResultsView.jsx`

- Carga turns con `fetchTurns(room.id)` al montar.
- Renderiza tabla ordenada por `position` con columnas: Posición | Mes asignado | Participante.
- Formatea `assigned_month` con `formatMonth()`.

---

### `components/CreateRoomForm.jsx`

Inputs:
- Nombre del anfitrión: texto, requerido, max 50 chars.
- Mes de inicio: `<input type="month">`, requerido, `min` = mes actual.

Validación client-side antes de llamar a `createRoom()`.

---

### `components/JoinRoomForm.jsx`

Inputs:
- Nombre: texto, requerido, max 50 chars.
- Código de sala: texto, 6 chars, se normaliza a mayúsculas antes de enviar.

---

## Data Models

### Tabla `rooms`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Auto-generado por Supabase |
| code | text (unique) | 6 chars, mayúsculas, alfanumérico |
| host_name | text | Nombre del anfitrión |
| start_month | date | Primer mes del pasanaku |
| status | text | `'waiting'` \| `'drawn'` |

### Tabla `participants`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Auto-generado |
| room_id | uuid (FK → rooms.id) | |
| name | text | Nombre del participante |
| client_id | uuid | UUID del dispositivo |
| joined_at | timestamptz | Auto-generado |

### Tabla `turns`

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Auto-generado |
| room_id | uuid (FK → rooms.id) | |
| participant_id | uuid (FK → participants.id) | |
| position | int | 1..N |
| assigned_month | date | Mes asignado |

---

## Draw Algorithm

```
Input: participants[] (length N), room.start_month
1. shuffled = fisherYates(participants)
2. For each i in 0..N-1:
     position      = i + 1
     assigned_month = addMonths(start_month, i)   // e.g. start_month + i months
3. Build turns[] = shuffled.map((p, i) => ({
     room_id, participant_id: p.id,
     position: i + 1, assigned_month: addMonths(start_month, i)
   }))
4. INSERT turns[] in batch
5. UPDATE rooms SET status = 'drawn' WHERE id = room_id
```

`addMonths(dateStr, n)` suma `n` meses a una fecha ISO y devuelve una nueva fecha ISO.

---

## Realtime Subscriptions

| Canal | Tabla | Filtro | Evento | Acción |
|---|---|---|---|---|
| `participants-{roomId}` | `participants` | `room_id=eq.{roomId}` | INSERT | Añadir participante a la lista |
| `room-{roomId}` | `rooms` | `id=eq.{roomId}` | UPDATE | Actualizar `room.status` → transición a ResultsView |

---

## Error Handling

| Escenario | Respuesta |
|---|---|
| Sala no encontrada al unirse | Mostrar "Sala no encontrada" |
| Sala con `status='drawn'` al intentar unirse | Mostrar "El sorteo ya fue realizado en esta sala" |
| Error al insertar en `rooms` o `participants` | Mostrar mensaje descriptivo, no navegar |
| Error al insertar `turns` o actualizar `status` | Mostrar mensaje al anfitrión, mantener `status='waiting'` |
| Colisión de código de sala | Reintentar generación (máx. 5 intentos) |
| Menos de 2 participantes al sortear | Deshabilitar botón + texto explicativo |

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe cumplirse en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables automáticamente.*

### Property 1: Client ID idempotencia

*Para cualquier* UUID ya almacenado en `localStorage` bajo la clave `pasanaku_client_id`, llamar a `getOrCreateClientId()` múltiples veces debe retornar siempre el mismo UUID sin generar uno nuevo.

**Validates: Requirements 1.2**

---

### Property 2: Client ID es UUID v4 válido en primer uso

*Para cualquier* estado de `localStorage` que no contenga `pasanaku_client_id`, llamar a `getOrCreateClientId()` debe retornar un string que satisfaga el formato UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`) y almacenarlo en `localStorage`.

**Validates: Requirements 1.1**

---

### Property 3: Código de sala tiene formato correcto

*Para cualquier* llamada a `generateRoomCode()`, el valor retornado debe ser exactamente 6 caracteres y cada carácter debe pertenecer al conjunto `[A-Z0-9]`.

**Validates: Requirements 3.2**

---

### Property 4: Validación de nombre rechaza entradas inválidas

*Para cualquier* string de nombre que esté vacío, sea sólo espacios en blanco, o tenga más de 50 caracteres, el formulario de creación o unión a sala debe rechazar el envío sin llamar a Supabase.

**Validates: Requirements 3.1, 4.1**

---

### Property 5: Fisher-Yates produce permutación completa

*Para cualquier* array de participantes de longitud N, `shuffle(participants)` debe retornar un array de longitud N que contenga exactamente los mismos elementos que el input (sin duplicados ni omisiones).

**Validates: Requirements 6.1**

---

### Property 6: Posiciones y meses cubren todos los participantes sin duplicados

*Para cualquier* lista de N participantes y cualquier `start_month`, el cálculo de turnos debe producir exactamente N registros donde las posiciones cubren el rango `[1..N]` sin repetición, y cada `assigned_month` es `start_month + (position - 1)` meses.

**Validates: Requirements 6.2, 6.3**

---

### Property 7: Botón de sorteo habilitado sólo con ≥ 2 participantes

*Para cualquier* lista de participantes, el botón "Sortear orden" debe estar habilitado si y sólo si la longitud de la lista es mayor o igual a 2.

**Validates: Requirements 6.7**

---

### Property 8: Visibilidad del botón de sorteo según client_id

*Para cualquier* lista de participantes y cualquier `clientId`, el botón "Sortear orden" debe ser visible si y sólo si el `clientId` del dispositivo actual coincide con el `client_id` del participante anfitrión en la lista.

**Validates: Requirements 5.5, 5.6**

---

### Property 9: Formato de mes en español

*Para cualquier* fecha válida (año y mes dentro del rango representable), `formatMonth(dateStr)` debe retornar un string con el formato `"<NombreMesEspañol> <YYYY>"`, donde el nombre del mes corresponde al mes de la fecha y el año corresponde al año de la fecha.

**Validates: Requirements 8.4**
