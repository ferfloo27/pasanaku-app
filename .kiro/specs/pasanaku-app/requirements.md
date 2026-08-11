# Requirements Document

## Introduction

Pasanaku es una aplicación web de tanda de ahorro grupal (rotating savings group). Permite a un grupo de personas organizarse de forma simple y sin registro de usuarios: un anfitrión crea una sala con un código único, los participantes se unen usando ese código, y el anfitrión realiza un sorteo que asigna a cada participante un mes en el que recibirá el fondo acumulado. La aplicación utiliza React + Vite en el frontend con Supabase como backend (base de datos y Realtime). La identidad de cada participante en su dispositivo se gestiona mediante un `client_id` UUID almacenado en `localStorage`, sin sistema de login.

## Glossary

- **App**: La aplicación web Pasanaku.
- **Anfitrión**: Participante que crea la sala; identificado por su `client_id` almacenado en `localStorage`.
- **Sala**: Registro en la tabla `rooms` identificado por un código alfanumérico de 6 caracteres. Tiene los estados `waiting` (lobby) y `drawn` (sorteo realizado).
- **Código de sala**: Cadena alfanumérica de 6 caracteres en mayúsculas que identifica unívocamente a una sala.
- **Participante**: Persona que se une a una sala; registrada en la tabla `participants` con un `client_id` UUID.
- **client_id**: UUID generado una vez por dispositivo y almacenado en `localStorage`; actúa como identificador anónimo del usuario.
- **Lobby**: Vista de la ruta `/room/:code` cuando `status = 'waiting'`; muestra la lista de participantes y, para el anfitrión, el botón de sorteo.
- **Sorteo**: Proceso de asignación aleatoria (Fisher-Yates) de posiciones y meses a los participantes; genera registros en la tabla `turns` y cambia `status` de la sala a `drawn`.
- **Turno**: Registro en la tabla `turns` que asocia un `participant_id` con una `position` (1..N) y un `assigned_month` (fecha del mes asignado).
- **Vista de resultado**: Vista de la ruta `/room/:code` cuando `status = 'drawn'`; muestra la tabla de posición, mes asignado y nombre.
- **Realtime**: Funcionalidad de Supabase para recibir cambios de la base de datos en tiempo real mediante suscripciones.
- **Supabase**: Backend as a service que provee base de datos PostgreSQL y Realtime.

## Requirements

### Requirement 1: Gestión de identidad anónima del dispositivo

**User Story:** Como usuario, quiero que la aplicación recuerde mi identidad en este dispositivo sin que tenga que registrarme, para poder operar como anfitrión o participante de forma transparente.

#### Acceptance Criteria

1. WHEN la App carga por primera vez en un dispositivo, THE App SHALL generar un UUID v4 y almacenarlo en `localStorage` bajo la clave `pasanaku_client_id`.
2. WHILE el valor `pasanaku_client_id` ya existe en `localStorage`, THE App SHALL reutilizar ese UUID sin generar uno nuevo.
3. THE App SHALL usar el `client_id` almacenado en `localStorage` como identificador del participante en todas las operaciones de inserción en Supabase.

---

### Requirement 2: Pantalla de inicio

**User Story:** Como usuario, quiero ver una pantalla de inicio clara con las opciones de crear o unirme a una sala, para acceder rápidamente a la funcionalidad que necesito.

#### Acceptance Criteria

1. THE App SHALL renderizar la ruta `/` con un botón "Crear sala" y un botón "Unirse a sala".
2. WHEN el usuario hace clic en "Crear sala", THE App SHALL mostrar el formulario de creación de sala.
3. WHEN el usuario hace clic en "Unirse a sala", THE App SHALL mostrar el formulario de unión a sala.

---

### Requirement 3: Creación de sala

**User Story:** Como anfitrión, quiero crear una sala con mi nombre y el mes de inicio, para obtener un código único que pueda compartir con otros participantes.

#### Acceptance Criteria

1. THE App SHALL presentar un formulario que solicite el nombre del anfitrión (texto no vacío, máximo 50 caracteres) y el mes de inicio (selector de mes y año, no anterior al mes actual).
2. WHEN el anfitrión envía el formulario de creación, THE App SHALL generar un Código de sala alfanumérico de 6 caracteres en mayúsculas que no exista previamente en la tabla `rooms`.
3. WHEN el código de sala es generado, THE App SHALL insertar un registro en `rooms` con `code`, `host_name`, `start_month` y `status = 'waiting'`.
4. WHEN el registro en `rooms` es insertado exitosamente, THE App SHALL insertar al anfitrión en `participants` con `room_id`, `name` (nombre del anfitrión) y `client_id` (UUID del dispositivo).
5. WHEN ambas inserciones son exitosas, THE App SHALL navegar a la ruta `/room/:code` usando react-router-dom.
6. IF la inserción en `rooms` o en `participants` falla, THEN THE App SHALL mostrar un mensaje de error descriptivo al usuario y no navegar.

---

### Requirement 4: Unión a sala existente

**User Story:** Como participante, quiero unirme a una sala existente ingresando mi nombre y el código de sala, para ser incluido en el grupo y participar del sorteo.

#### Acceptance Criteria

1. THE App SHALL presentar un formulario que solicite el nombre del participante (texto no vacío, máximo 50 caracteres) y el Código de sala (6 caracteres).
2. WHEN el participante envía el formulario de unión, THE App SHALL buscar en `rooms` un registro cuyo `code` coincida con el código ingresado (búsqueda insensible a mayúsculas/minúsculas).
3. IF no existe una sala con el código ingresado, THEN THE App SHALL mostrar el mensaje "Sala no encontrada" y no navegar.
4. IF la sala encontrada tiene `status = 'drawn'`, THEN THE App SHALL mostrar el mensaje "El sorteo ya fue realizado en esta sala" y no navegar.
5. WHEN la sala existe y tiene `status = 'waiting'`, THE App SHALL insertar al participante en `participants` con `room_id`, `name` y `client_id` (UUID del dispositivo).
6. WHEN la inserción en `participants` es exitosa, THE App SHALL navegar a la ruta `/room/:code` usando react-router-dom.
7. IF la inserción en `participants` falla, THEN THE App SHALL mostrar un mensaje de error descriptivo al usuario y no navegar.

---

### Requirement 5: Lobby (vista de espera)

**User Story:** Como participante o anfitrión en la sala de espera, quiero ver el código de sala y la lista de participantes actualizada en tiempo real, para saber quién se ha unido.

#### Acceptance Criteria

1. WHILE el `status` de la sala es `waiting`, THE App SHALL renderizar la vista de Lobby en la ruta `/room/:code`.
2. THE App SHALL mostrar el Código de sala de forma prominente en la vista de Lobby.
3. THE App SHALL suscribirse al canal Realtime de Supabase para la tabla `participants` filtrando por `room_id`, y SHALL mantener la lista de participantes actualizada ante cada inserción nueva.
4. WHEN un nuevo participante se une, THE App SHALL reflejar ese participante en la lista de Lobby sin recargar la página.
5. WHILE el `client_id` del dispositivo coincide con el `client_id` del anfitrión registrado en `participants` para esa sala, THE App SHALL mostrar el botón "Sortear orden".
6. WHILE el `client_id` del dispositivo no coincide con el `client_id` del anfitrión, THE App SHALL ocultar el botón "Sortear orden".

---

### Requirement 6: Sorteo de orden

**User Story:** Como anfitrión, quiero ejecutar el sorteo para asignar aleatoriamente un mes a cada participante, para que el orden del pasanaku sea justo e imparcial.

#### Acceptance Criteria

1. WHEN el anfitrión hace clic en "Sortear orden" y hay al menos 2 participantes en la sala, THE App SHALL aplicar el algoritmo Fisher-Yates sobre la lista de participantes para generar una permutación aleatoria.
2. WHEN la permutación es generada, THE App SHALL asignar a cada participante una `position` del 1 al N (donde N es el número total de participantes) en orden de la permutación.
3. WHEN las posiciones son asignadas, THE App SHALL calcular el `assigned_month` de cada participante sumando `(position - 1)` meses al `start_month` de la sala.
4. WHEN los turnos son calculados, THE App SHALL insertar todos los registros en la tabla `turns` (con `room_id`, `participant_id`, `position`, `assigned_month`) en una sola operación batch.
5. WHEN todos los registros en `turns` son insertados exitosamente, THE App SHALL actualizar el campo `status` de la sala a `'drawn'` en la tabla `rooms`.
6. IF la inserción en `turns` o la actualización de `status` falla, THEN THE App SHALL mostrar un mensaje de error descriptivo al anfitrión y mantener el `status` de la sala en `'waiting'`.
7. IF hay menos de 2 participantes en la sala, THEN THE App SHALL deshabilitar el botón "Sortear orden" y mostrar un texto indicando que se requieren al menos 2 participantes.

---

### Requirement 7: Transición automática a resultados vía Realtime

**User Story:** Como participante o anfitrión, quiero que la vista cambie automáticamente de Lobby a resultados cuando el sorteo es realizado, sin necesidad de recargar la página.

#### Acceptance Criteria

1. THE App SHALL suscribirse al canal Realtime de Supabase para la tabla `rooms` filtrando por `id` de la sala actual, para detectar cambios en el campo `status`.
2. WHEN el Realtime notifica que el `status` de la sala cambió a `'drawn'`, THE App SHALL transicionar la vista de Lobby a la Vista de resultado en la misma ruta `/room/:code` sin recargar la página.
3. THE App SHALL aplicar la transición automática para todos los participantes conectados simultáneamente, incluyendo aquellos que no sean el anfitrión.

---

### Requirement 8: Vista de resultados

**User Story:** Como participante, quiero ver la tabla de resultados del sorteo con la posición, el mes asignado y el nombre de cada participante, para saber cuándo me toca recibir el fondo.

#### Acceptance Criteria

1. WHILE el `status` de la sala es `'drawn'`, THE App SHALL renderizar la Vista de resultado en la ruta `/room/:code`.
2. THE App SHALL consultar la tabla `turns` junto con `participants` para obtener los datos completos de cada turno y SHALL mostrar una tabla con las columnas: Posición, Mes asignado y Nombre del participante.
3. THE App SHALL mostrar los registros de la tabla ordenados por `position` de forma ascendente.
4. THE App SHALL formatear el `assigned_month` en la tabla usando el formato "Mes YYYY" en español (por ejemplo, "Enero 2026").
5. WHEN la ruta `/room/:code` es accedida directamente con una sala en estado `'drawn'`, THE App SHALL mostrar la Vista de resultado directamente sin pasar por el Lobby.
