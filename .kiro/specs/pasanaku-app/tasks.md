# Implementation Plan: Pasanaku App

## Overview

Plan de implementación incremental para la aplicación Pasanaku: una tanda de ahorro grupal sin registro, construida con React + Vite y Supabase como backend. Las tareas siguen el orden de dependencia: utilidades puras → servicio de datos → páginas y componentes → integración final.

## Tasks

- [x] 1. Configurar estructura de proyecto y dependencias base
  - Instalar `react-router-dom` como dependencia de producción
  - Instalar framework de pruebas: `vitest`, `@vitest/coverage-v8`, `fast-check` (property-based testing) y `@testing-library/react`
  - Configurar `vite.config.js` para incluir el bloque `test` de Vitest con `environment: 'jsdom'`
  - Crear los directorios `src/utils/`, `src/services/`, `src/pages/`, `src/components/`
  - Verificar que `src/lib/supabaseClient.js` expone el cliente Supabase correctamente
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implementar utilidades puras
  - [x] 2.1 Implementar `src/utils/clientId.js`
    - Escribir `getOrCreateClientId()` usando `crypto.randomUUID()` y `localStorage`
    - _Requirements: 1.1, 1.2_

  - [x]* 2.2 Escribir property test para `getOrCreateClientId` — Property 1
    - **Property 1: Client ID idempotencia**
    - Usar `fast-check` para generar UUIDs arbitrarios, almacenarlos en `localStorage` y verificar que llamadas sucesivas retornan el mismo valor
    - **Validates: Requirements 1.2**

  - [x]* 2.3 Escribir property test para `getOrCreateClientId` — Property 2
    - **Property 2: Client ID es UUID v4 válido en primer uso**
    - Usar `fast-check` para simular estado de `localStorage` vacío y verificar que el UUID retornado cumple el patrón `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
    - **Validates: Requirements 1.1**

  - [x] 2.4 Implementar `src/utils/roomCode.js`
    - Escribir `generateRoomCode()` usando el charset `[A-Z0-9]` y longitud 6
    - _Requirements: 3.2_

  - [x]* 2.5 Escribir property test para `generateRoomCode` — Property 3
    - **Property 3: Código de sala tiene formato correcto**
    - Usar `fast-check` con `fc.assert` para verificar que múltiples invocaciones retornan strings de exactamente 6 caracteres pertenecientes a `[A-Z0-9]`
    - **Validates: Requirements 3.2**

  - [x] 2.6 Implementar `src/utils/fisherYates.js`
    - Escribir `shuffle(arr)` que retorna una copia barajada con el algoritmo Fisher-Yates
    - _Requirements: 6.1_

  - [x]* 2.7 Escribir property test para `shuffle` — Property 5
    - **Property 5: Fisher-Yates produce permutación completa**
    - Usar `fast-check` con arrays de longitud variable; verificar que el resultado tiene la misma longitud y los mismos elementos (sin duplicados ni omisiones)
    - **Validates: Requirements 6.1**

  - [x] 2.8 Implementar `src/utils/formatMonth.js`
    - Escribir `formatMonth(dateStr)` usando el array `MONTHS_ES` para devolver `"Mes YYYY"` en español
    - _Requirements: 8.4_

  - [x]* 2.9 Escribir property test para `formatMonth` — Property 9
    - **Property 9: Formato de mes en español**
    - Usar `fast-check` con `fc.integer({ min: 1900, max: 2100 })` y `fc.integer({ min: 1, max: 12 })` para verificar que `formatMonth` retorna el formato `"<NombreMesEspañol> <YYYY>"` correcto para cualquier fecha válida
    - **Validates: Requirements 8.4**

- [x] 3. Checkpoint — verificar utilidades puras
  - Asegurar que todos los tests pasen con `vitest --run`, preguntar al usuario si hay dudas.

- [x] 4. Implementar `src/services/roomService.js`
  - [x] 4.1 Implementar función `createRoom({ hostName, startMonth, clientId })`
    - Generar código con reintento por colisión (máx. 5 intentos)
    - Insertar en `rooms` y luego en `participants`
    - Retornar `{ data, error }` con la sala creada
    - _Requirements: 3.2, 3.3, 3.4, 3.6_

  - [x] 4.2 Implementar función `joinRoom({ code, name, clientId })`
    - Buscar sala por código (case-insensitive usando `.ilike`)
    - Validar existencia y `status !== 'drawn'`
    - Insertar participante
    - Retornar `{ data, error }` con mensaje descriptivo en cada fallo
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 4.3 Implementar funciones `fetchRoom(code)` y `fetchTurns(roomId)`
    - `fetchRoom`: select en `rooms` filtrando por `code`
    - `fetchTurns`: join entre `turns` y `participants` ordenado por `position` asc
    - _Requirements: 5.1, 8.2, 8.3_

  - [x] 4.4 Implementar función `drawTurns({ roomId, participants, startMonth })`
    - Implementar `addMonths(dateStr, n)` internamente para calcular `assigned_month`
    - Barajar con `shuffle()`, calcular posición y mes por participante
    - Batch insert en `turns`, luego update `rooms.status = 'drawn'`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 4.5 Escribir property test para `drawTurns` — Property 6
    - **Property 6: Posiciones y meses cubren todos los participantes sin duplicados**
    - Mockear Supabase; usar `fast-check` con arrays de participantes de longitud N (1..20) y `start_month` arbitrario; verificar que los turnos generados tienen exactamente N registros, posiciones `[1..N]` sin repetición y `assigned_month` correcto para cada posición
    - **Validates: Requirements 6.2, 6.3**

- [x] 5. Implementar `App.jsx` con React Router
  - Configurar `BrowserRouter` con rutas `/` → `HomePage` y `/room/:code` → `RoomPage`
  - _Requirements: 2.1_

- [x] 6. Implementar componentes de formulario
  - [x] 6.1 Implementar `src/components/CreateRoomForm.jsx`
    - Inputs: nombre del anfitrión (max 50 chars, requerido) y mes de inicio (`<input type="month">`, `min` = mes actual, requerido)
    - Validación client-side antes de llamar a `createRoom()`
    - En éxito, navegar con `useNavigate` a `/room/:code`
    - En error, mostrar mensaje descriptivo sin navegar
    - _Requirements: 3.1, 3.5, 3.6_

  - [ ]* 6.2 Escribir property test para validación de nombre — Property 4 (CreateRoomForm)
    - **Property 4: Validación de nombre rechaza entradas inválidas**
    - Usar `fast-check` con strings vacíos, sólo espacios, y strings de longitud > 50; verificar que `createRoom` nunca es invocado
    - **Validates: Requirements 3.1**

  - [x] 6.3 Implementar `src/components/JoinRoomForm.jsx`
    - Inputs: nombre (max 50 chars, requerido) y código de sala (6 chars, normalizado a mayúsculas)
    - Validación client-side antes de llamar a `joinRoom()`
    - En éxito, navegar a `/room/:code`; en error, mostrar mensaje descriptivo
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 4.7_

  - [ ]* 6.4 Escribir property test para validación de nombre — Property 4 (JoinRoomForm)
    - **Property 4: Validación de nombre rechaza entradas inválidas**
    - Misma estrategia que 6.2 aplicada a `JoinRoomForm`; verificar que `joinRoom` nunca es invocado con entradas inválidas
    - **Validates: Requirements 4.1**

- [x] 7. Implementar `pages/HomePage.jsx`
  - Estado local `view: null | 'create' | 'join'`
  - Renderizar botones "Crear sala" y "Unirse a sala" cuando `view === null`
  - Renderizar `CreateRoomForm` o `JoinRoomForm` según `view`, con `onBack` para volver
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8. Implementar `components/Lobby.jsx`
  - [x] 8.1 Mostrar código de sala prominente y lista de participantes
    - Recibir `room`, `participants`, `setParticipants` y `clientId` como props
    - Suscribir a canal Realtime `participants-{roomId}` (evento INSERT) para actualizar la lista en tiempo real
    - Limpiar suscripción en el unmount
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.2 Implementar botón "Sortear orden" con lógica de visibilidad y habilitación
    - Mostrar el botón sólo si `clientId` coincide con el `client_id` del primer participante insertado (anfitrión)
    - Deshabilitar el botón si `participants.length < 2` y mostrar texto explicativo
    - Al hacer clic, llamar a `drawTurns()`; en error mostrar mensaje al anfitrión
    - _Requirements: 5.5, 5.6, 6.1–6.7_

  - [ ]* 8.3 Escribir property test para visibilidad del botón — Property 7
    - **Property 7: Botón de sorteo habilitado sólo con ≥ 2 participantes**
    - Usar `fast-check` con `fc.array(fc.string(), { minLength: 0, maxLength: 20 })` para generar listas de participantes y verificar estado `disabled` del botón
    - **Validates: Requirements 6.7**

  - [ ]* 8.4 Escribir property test para visibilidad del botón — Property 8
    - **Property 8: Visibilidad del botón de sorteo según client_id**
    - Usar `fast-check` con `clientId` arbitrarios y listas de participantes; verificar que el botón es visible si y sólo si `clientId === participants[0].client_id`
    - **Validates: Requirements 5.5, 5.6**

- [x] 9. Implementar `components/ResultsView.jsx`
  - Llamar a `fetchTurns(room.id)` al montar
  - Renderizar tabla con columnas: Posición, Mes asignado (`formatMonth`), Participante
  - Ordenar filas por `position` ascendente
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 10. Implementar `pages/RoomPage.jsx`
  - Cargar sala con `fetchRoom(code)` al montar
  - Suscribir a canal Realtime `room-{roomId}` (evento UPDATE en `rooms`) para detectar cambio de `status`
  - Renderizar `<Lobby>` si `status === 'waiting'`, `<ResultsView>` si `status === 'drawn'`
  - Manejar acceso directo a sala con `status === 'drawn'` mostrando `ResultsView` directamente
  - Limpiar suscripción en el unmount
  - _Requirements: 5.1, 7.1, 7.2, 7.3, 8.1, 8.5_

- [x] 11. Checkpoint final — integración completa
  - Verificar que todas las rutas navegan correctamente
  - Asegurar que todos los tests pasen con `vitest --run`
  - Preguntar al usuario si hay dudas antes de considerar la implementación completa.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints garantizan validación incremental
- Los property tests usan `fast-check`; los tests de componentes usan `@testing-library/react` + `vitest`
- `react-router-dom` no está en `package.json` actual — debe instalarse en la tarea 1
- El proyecto no tiene framework de pruebas configurado aún — la tarea 1 lo establece completo

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.4", "2.6", "2.8"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.5", "2.7", "2.9", "4.1", "4.2", "4.3"] },
    { "id": 2, "tasks": ["4.4", "6.1", "6.3"] },
    { "id": 3, "tasks": ["4.5", "6.2", "6.4", "8.1"] },
    { "id": 4, "tasks": ["8.2", "9"] },
    { "id": 5, "tasks": ["8.3", "8.4"] }
  ]
}
```
