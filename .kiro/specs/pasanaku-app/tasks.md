# Implementation Plan: Pasanaku App

## Overview

Plan incremental en 9 fases. Orden: base del proyecto → base de datos (migraciones, RLS, RPC) → sistema de diseño → identidad → inicio y crear/unirse → lobby → sorteo → revelación y resultados → realtime, estados y cierre.

Referencias: `requirements.md`, `design.md`, `docs/design-brief.md` y el canvas "Pasanaku" de Claude Design (cada pantalla indica su artboard).

Convenciones:
- Lógica pura en `features/*/domain` con tests de propiedades (`fast-check`).
- Ningún componente importa `supabase`; solo `features/*/api`.
- Cada tarea termina con `npm test`, `npm run lint` y `npm run build` sin errores.

---

## Tasks

## Fase 0: Base del proyecto

- [x] 0.1 Arreglar los 3 tests rotos (`fc.stringOf` ya no existe en fast-check v4 → `fc.string({ unit: … })`) para partir en verde.
- [x] 0.2 Crear la estructura `app/`, `features/`, `shared/`, `pages/` de `design.md` y mover `roomCode`, `fisherYates` y `formatMonth` a su `domain`/`format` correspondiente con sus tests.
- [x] 0.3 Eliminar `services/fetchService.js` y `services/joinRoomService.js` (duplicados).
- [x] 0.4 Configurar la regla ESLint `no-restricted-imports` que impide importar `shared/lib/supabase` fuera de `features/*/api`.
- [x] 0.5 Reemplazar el README de la plantilla por uno del proyecto (cómo correrlo, variables de entorno, Supabase local).
- _Requirements: 11.3_

---

## Fase 1: Base de datos versionada

> Requiere Supabase CLI. Lo que se configura en el panel (proveedores de Auth) va documentado en el README.

- [x] 1.1 Inicializar `supabase/` (CLI) y levantar Supabase local.
- [x] 1.2 `0001_schema.sql`: enums `room_status`, `room_frequency`; tablas `profiles`, `rooms`, `participants`, `turns` según `design.md`.
- [x] 1.3 `0002_rls.sql`: habilitar RLS, `revoke` de escritura directa, `is_room_participant`, políticas de lectura, políticas de `profiles`.
- [x] 1.4 `0003_rpc.sql`: `create_room`, `get_room_preview`, `join_room`, `remove_participant`, `cancel_room`, `confirm_draw`, `list_my_rooms` con sus códigos de error.
- [x] 1.5 Habilitar Realtime para `rooms` y `participants`; `replica identity full` en `participants`.
- [x] 1.6 Panel de Supabase (manual): activar inicio de sesión anónimo, configurar Google OAuth y "manual linking".
  - La persona dueña confirmó la configuración, el despliegue v2 y la persistencia de la sesión con Google en la web publicada el 11-11-2026. Ejecución manual; no se compartieron secretos en el repositorio.
- [x] 1.7 Tests de base de datos: propiedades 8, 9, 10, 11 y 12 de `design.md`.
  - [x] Propiedades 8–11 verificadas en Supabase local (RLS/RPC, cupo concurrente, atomicidad e idempotencia).
  - [x] Propiedad 12: paridad SQL/`turnDate` verificada para las tres frecuencias en Supabase local el 11-11-2026. Suite completa: 98 comprobaciones pgTAP y 5 tests de integración, sin fallos.
- [x] 1.8 Plan de migración de los datos actuales (salas sin `host_user_id`/`name`): decidir si se descartan o se migran con valores por defecto.
  - Decisión del 10-11-2026: descartar los datos de prueba al estrenar v2; plan en `docs/v2-data-transition.md`. No se han ejecutado borrados ni cambios remotos.
- _Requirements: 3.5, 4.2, 4.7, 5.7, 5.8, 5.10, 6.8, 6.10, 6.11, 6.12, 10.1–10.7_

---

## Fase 2: Sistema de diseño (`shared/`)

> Fuente: artboards "Sistema de diseño", "Componentes" y "Modo oscuro".

- [x] 2.1 `shared/styles/tokens.css`: primitivos y semánticos claro/oscuro (oscuro definido, desactivado); `base.css` con Nunito/JetBrains Mono, reset y foco visible. Quitar el CSS de la plantilla de Vite.
- [x] 2.2 Componentes de acción: `Button` (primario, secundario, texto, peligro; cargando, deshabilitado), `IconButton`, `Chip`, `Avatar`.
- [x] 2.3 Componentes de formulario: `TextField`, `CodeInput` (6 casillas, pegar, mayúsculas), `MoneyField` (Bs), `Segmented` (frecuencia), `DateField` (mes/año o día).
- [x] 2.4 Contenedores: `Card`, `Sheet` (modal inferior), `Menu` (⋯), `EmptyState`, `AguayoStripe`.
- [x] 2.5 Feedback: `ErrorBanner`, `Toast`, `Skeleton`, `Spinner`, `ReconnectingChip`.
- [x] 2.6 `shared/format`: `formatMoney`, `formatTurnDate` (+ propiedad 6) y `shared/errors/appError.js`.
- [x] 2.7 Página interna `/dev/ui` (solo en desarrollo) que muestra todos los componentes y estados, para compararlos con el canvas.
- _Requirements: 11.1–11.7_

---

## Fase 3: Identidad y perfil

- [x] 3.1 `features/auth/api/authApi.js`: `ensureSession`, `linkGoogle`, `onAuthChange`.
- [x] 3.2 `app/AuthProvider.jsx` + `useAuth`: `{ user, isAnonymous, status, error, retry }`.
- [x] 3.3 `features/profile`: `validateDisplayName` (domain + test), `profileApi`, `useProfile`.
- [x] 3.4 `ProfileNameSheet` (artboard 6.1) y guard `RequireProfile`.
- [x] 3.5 Vincular Google en el inicio, conservando el nombre existente o sugiriendo el de Google (+ propiedad 13).
- [x] 3.6 Eliminar `utils/clientId.js` y su test.
- _Requirements: 1.1–1.12_

---

## Fase 4: Inicio, crear y unirse

- [x] 4.1 Rutas `/`, `/new`, `/join`, `/room/:code` en `app/routes.jsx`.
- [x] 4.2 `roomsApi.listMyRooms` + `useMyRooms`; `HomePage` con saludo, acciones, "Tus salas", estado vacío y aviso único de sala cancelada (artboards 6.2 Inicio e Inicio vacío).
- [x] 4.3 `domain/roomForm.js`: `validateRoomForm`, `payoutPerTurn` (+ propiedad 7).
- [x] 4.4 `CreateRoomForm` con resumen en vivo (artboard 6.3 Crear sala) y `RoomReady` con código, copiar y compartir (artboard 6.3 Sala lista).
- [x] 4.5 `domain/roomCode.js` (+ propiedad 1) y `JoinCodeForm` (artboards 6.4 Unirse y Errores).
- [x] 4.6 `getRoomPreview` + `RoomPreview` con "Unirme" / "Ahora no" y los casos sorteada, cancelada y llena (artboard 6.4 Pre-unión).
- _Requirements: 2.1–2.7, 3.1–3.7, 4.1–4.10_

---

## Fase 5: Sala y lobby

- [x] 5.1 `domain/roomMachine.js`: reducer con estados `loading`, `not_found`, `preview`, `lobby`, `drafting`, `revealing`, `results`, `cancelled`, `removed` (tests del reducer).
- [x] 5.2 `roomChannel.js` (un canal por sala) + `useRoomSession(code)` con carga inicial y eventos de Realtime.
- [x] 5.3 `Lobby` variante participante (artboard 6.5 Lobby participante).
- [x] 5.4 `Lobby` variante anfitrión: "Sortear orden", eliminar participante, menú ⋯ con "Cancelar sala", estado de menos de 2 (artboards 6.5 Lobby anfitrión y Lobby menos de 2 + menú).
- [x] 5.5 `RemoveParticipantSheet` y `CancelRoomSheet` con sus RPC (artboard 6.5 Eliminar participante).
- [x] 5.6 Vistas de "Ya no estás en esta sala" y "Rosa canceló la sala" (artboard 6.9).
- _Requirements: 5.1–5.11, 9.1_

---

## Fase 6: Borrador y confirmación

- [x] 6.1 `domain/schedule.js` `turnDate` (+ propiedad 5) y `domain/shuffle.js` con `random` inyectable (+ propiedad 2).
  - Propiedad 12 incluida en `transactions.integration.mjs` y verificada en Supabase local el 11-11-2026; tarea 1.7 cerrada.
- [x] 6.2 `domain/draft.js`: `buildDraft`, `moveDraftItem`, `draftToOrder` (+ propiedades 3 y 4).
- [x] 6.3 Instalar `@dnd-kit/core` y `@dnd-kit/sortable`; `DraftEditor` con arrastre, botones subir/bajar y "Volver a sortear" (artboard 6.6 Borrador).
- [x] 6.4 `ConfirmDrawSheet` (artboard 6.6 Confirmar y anunciar) y `drawApi.confirmDraw` con manejo de `PARTICIPANTS_CHANGED`, `ROOM_NOT_WAITING` y error genérico con borrador conservado.
- _Requirements: 6.1–6.13_

---

## Fase 7: Revelación y resultados

- [x] 7.1 `useReveal`: avance por posición, "Saltar", "Ver de nuevo", reducción de movimiento (tests con timers falsos).
- [x] 7.2 `Reveal` con rótulo "Sorteado al azar", tarjeta grande, lista revelada, `aria-live` y franja aguayo (artboard 6.7 Revelación).
- [x] 7.3 `Results`: "Tu turno", resumen, orden de cobro con fila propia destacada, "Copiar resultados" y "Compartir" (artboard 6.8 Resultados).
- [x] 7.4 Entrada directa a una sala `drawn` → resultados sin revelación.
- _Requirements: 7.1–7.8, 8.1–8.6_

---

## Fase 8: Resiliencia, estados y cierre

- [x] 8.1 Resync en `useRoomSession`: `visibilitychange` y reconexión del canal; `ReconnectingChip`.
- [x] 8.2 Estado "Sin conexión" con últimos datos y "Reintentar"; skeletons de carga (artboard 6.9).
- [x] 8.3 Vista "No encontramos esta sala" para links inválidos (artboard 6.9).
- [x] 8.4 Revisión de accesibilidad: foco, contraste, 44px, lector de pantalla en revelación y borrador.
- [x] 8.5 Revisión a 320px y 360px de todas las pantallas contra el canvas.
  - Pase visual realizado en el navegador integrado; cobertura y evidencia en `docs/phase8-verification.md`. Validación: 313 tests, lint sin errores (una advertencia previa de v1) y build correcto.
- [x] 8.6 Prueba de punta a punta del flujo principal con dos navegadores (anfitrión y participante).
  - Flujo y recarga verificados con dos sesiones independientes y Supabase local; evidencia en `docs/phase8-verification.md`. Validación: 313 tests, lint sin errores (una advertencia previa de v1) y build correcto. No se probó contra producción.
- _Requirements: 9.2–9.4, 11.1, 11.5, 11.6_

---

## Ajustes solicitados después de la Fase 8

- [x] 11-11-2026: avisos arriba a la derecha con barra decreciente y pausa al leerlos; compartir copia solo el enlace en resultados, sala lista y lobby. Verificado en navegador a 320/360 px y escritorio, incluido pegado del enlace y cierre automático. Validación: 314 tests, lint sin errores (una advertencia previa de v1) y build correcto.

## Notes

- Las fases 1 y 2 son independientes entre sí y pueden hacerse en paralelo.
- El borrador vive solo en el navegador del anfitrión; recargar lo descarta.
- "Quincenal" = periodo fijo de 15 días desde la fecha de inicio (Requirement 6.12).
- Modo oscuro: tokens en la Fase 2; activarlo queda fuera de alcance.
- Los tests de base de datos (1.7) necesitan Supabase local o un proyecto de pruebas, nunca el de producción.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "label": "Base del proyecto", "tasks": ["0.1", "0.2", "0.3", "0.4", "0.5"] },
    { "id": 1, "label": "Base de datos y sistema de diseño (en paralelo)", "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 2, "label": "Identidad", "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 3, "label": "Inicio, crear y unirse", "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 4, "label": "Sala y lobby", "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 5, "label": "Borrador y confirmación", "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "label": "Revelación y resultados", "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 7, "label": "Resiliencia y cierre", "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] }
  ]
}
```
