# Requirements Document

## Introduction

Pasanaku es una aplicación web para organizar una tanda de ahorro grupal (pasanaku): un grupo aporta una **cuota** fija cada **periodo** (semanal, quincenal o mensual) y, por turnos, una persona recibe el total. La app digitaliza la organización del sorteo: un anfitrión crea una sala con nombre, cuota, frecuencia y fecha de inicio; comparte un código o link; los participantes se unen; el anfitrión arma un borrador privado del orden, lo ajusta y lo confirma; todos ven la revelación en vivo y luego la tabla de resultados con la fecha y el monto que recibe cada uno.

Stack: React + Vite en el frontend, conectado directamente a Supabase (PostgreSQL + Auth + Realtime), sin backend propio. La identidad se gestiona con **Supabase Auth anónimo** (`signInAnonymously`), con opción de vincular Google (`linkIdentity`) para recuperar las salas desde otro dispositivo. Las operaciones que deben ser atómicas (crear sala, unirse, confirmar sorteo, cancelar, eliminar participante) se ejecutan como **funciones RPC de PostgreSQL**; la lectura se protege con RLS.

Referencias de diseño: `docs/design-brief.md` y el canvas "Pasanaku" de Claude Design (26 artboards: sistema, componentes, pantallas 6.1–6.9, prototipo y modo oscuro).

---

## Glossary

- **App**: La aplicación web Pasanaku.
- **Sesión anónima**: Sesión creada por `signInAnonymously()`, con un `auth.uid()` estable mientras no se borre el almacenamiento del navegador.
- **Cuenta vinculada**: Sesión anónima tras `linkIdentity({ provider: 'google' })`; el `auth.uid()` no cambia, `is_anonymous = false`, y se puede iniciar sesión con Google desde otro dispositivo.
- **Perfil**: Registro en `profiles` con el `display_name` del usuario (1–50 caracteres), único por cuenta, no por sala.
- **Sala**: Registro en `rooms` con nombre, código, cuota, frecuencia, fecha de inicio y límite de participantes. Estados: `waiting` (en espera), `drawn` (sorteada), `cancelled` (cancelada).
- **Código de sala**: 6 caracteres `[A-Z0-9]` que identifican una sala.
- **Anfitrión**: Usuario que creó la sala (`rooms.host_user_id`).
- **Participante**: Usuario unido a una sala (fila en `participants`). El anfitrión también es participante.
- **Cuota**: Monto entero en bolivianos (Bs) que aporta cada participante por periodo.
- **Frecuencia**: Periodicidad de los turnos: `weekly` (semanal), `biweekly` (quincenal) o `monthly` (mensual).
- **Fecha de turno**: Fecha en que un participante recibe el pozo; se calcula desde la fecha de inicio según la frecuencia y la posición.
- **Monto por turno**: `cuota × número de participantes` al momento de confirmar el sorteo.
- **Tus salas**: Lista de las salas en las que el usuario es participante, obtenida de la base de datos (no de `localStorage`), visible en el inicio.
- **Pre-unión**: Vista que muestra el resumen de una sala (nombre, anfitrión, participantes, cuota, frecuencia, inicio) antes de unirse.
- **Lobby**: Vista de `/room/:code` cuando la sala está `waiting` y el usuario es participante.
- **Borrador de sorteo**: Orden generado con Fisher-Yates, visible y editable solo por el anfitrión, aún no persistido.
- **Confirmación del sorteo**: Acción del anfitrión que persiste el borrador en `turns` y pasa la sala a `drawn` en una sola transacción.
- **Revelación**: Animación que muestra, a todos los conectados, una posición a la vez tras la confirmación.
- **Vista de resultado**: Vista de `/room/:code` cuando la sala está `drawn`.
- **RPC**: Función de PostgreSQL invocada con `supabase.rpc()`, que se ejecuta en una transacción con las reglas de negocio dentro de la base de datos.

---

## Requirements

### Requirement 1: Identidad del usuario

**User Story:** Como usuario, quiero usar la app sin registrarme, pero poder vincular mi cuenta más adelante, para no perder mis salas si cambio de celular.

#### Acceptance Criteria

1. WHEN la App carga y no existe una sesión activa, THE App SHALL invocar `signInAnonymously()` antes de permitir crear o unirse a una sala.
2. WHILE existe una sesión activa (anónima o vinculada), THE App SHALL reutilizarla sin crear otra.
3. THE App SHALL usar `auth.uid()` como identidad en todas las operaciones; ningún identificador de usuario se genera en el cliente.
4. IF `signInAnonymously()` falla, THEN THE App SHALL mostrar un error con opción "Reintentar" y SHALL bloquear crear/unirse hasta tener sesión.
5. WHEN el usuario anónimo elige "Vincular cuenta de Google", THE App SHALL invocar `linkIdentity({ provider: 'google' })` conservando el mismo `auth.uid()`.
6. IF la vinculación falla o se cancela, THEN THE App SHALL mostrar un error y SHALL mantener la sesión anónima sin cambios.
7. WHILE la cuenta está vinculada, THE App SHALL mostrar "Cuenta vinculada: {correo}" en lugar de la opción de vincular.
8. WHEN no existe un Perfil con `display_name` para el `auth.uid()`, THE App SHALL mostrar el modal "¿Cómo te llamas?" y SHALL bloquear crear/unirse hasta guardar un nombre válido (1–50 caracteres, sin contar espacios al inicio y final).
9. THE App SHALL usar el `display_name` del Perfil como nombre del participante en toda sala que cree o a la que se una.
10. THE App SHALL permitir editar el `display_name` en cualquier momento desde el inicio; el cambio aplica a salas futuras y SHALL NOT renombrar participaciones existentes.
11. WHEN el usuario vincula Google y ya tiene `display_name`, THE App SHALL conservarlo.
12. WHEN el usuario vincula Google y no tiene `display_name`, THE App SHALL sugerir el nombre de Google, editable antes de confirmar.

---

### Requirement 2: Pantalla de inicio y "Tus salas"

**User Story:** Como usuario, quiero ver mis salas al abrir la app y crear o unirme a una nueva en un toque.

#### Acceptance Criteria

1. THE App SHALL renderizar `/` con el saludo "Hola, {nombre}", un acceso para editar el nombre, la acción primaria "Crear sala" (→ `/new`) y la secundaria "Unirme con código" (→ `/join`).
2. THE App SHALL mostrar la sección "Tus salas" con las salas `waiting` y `drawn` en las que el usuario es participante, consultadas en la base de datos, ordenadas por actividad más reciente.
3. Cada tarjeta de sala SHALL mostrar nombre, código, número de participantes, rol (Anfitrión/Participante) y estado (En espera/Sorteada), y SHALL navegar a `/room/:code`.
4. WHILE el usuario no tiene salas, THE App SHALL mostrar el estado vacío "Aún no tienes salas" con una explicación breve.
5. THE App SHALL NOT listar salas `cancelled` en "Tus salas".
6. WHEN una sala del usuario fue cancelada en los últimos 30 días y el usuario aún no fue avisado en este dispositivo, THE App SHALL mostrar una única vez el aviso "{anfitrión} canceló la sala “{nombre}”. Ya no aparece en tus salas." con opción de cerrarlo.
7. WHILE la sesión es anónima, THE App SHALL mostrar la invitación a vincular Google ("Vincula Google para ver tus salas en otro celular").

---

### Requirement 3: Creación de sala

**User Story:** Como anfitrión, quiero crear una sala con nombre, cuota, frecuencia y fecha de inicio, para obtener un código que compartir con mi grupo.

#### Acceptance Criteria

1. THE App SHALL presentar en `/new` un formulario con: **Nombre de la sala** (obligatorio, 1–60 caracteres), **Cuota por persona** (entero en Bs, 1–100 000), **Frecuencia** (Semanal · Quincenal · Mensual, por defecto Mensual), **Fecha de inicio** y **Máx. participantes** (entero 2–30, por defecto 30). El nombre del anfitrión se toma del Perfil.
2. WHILE la frecuencia es Mensual, THE App SHALL pedir mes y año de inicio (no anterior al mes actual); WHILE es Semanal o Quincenal, SHALL pedir un día (no anterior a hoy). El día y el mes actuales se determinan con la zona horaria `America/La_Paz`.
3. THE App SHALL mostrar un resumen en vivo: "Cada turno recibe Bs {cuota} × participantes", con un ejemplo calculado.
4. IF algún campo es inválido, THEN THE App SHALL mostrar el error debajo del campo y SHALL NOT enviar el formulario.
5. WHEN el anfitrión envía el formulario válido, THE App SHALL invocar la RPC `create_room`, que en una sola transacción genera un código único (reintentando ante colisión), inserta la sala con `status = 'waiting'` e inserta al anfitrión como participante.
6. WHEN la creación es exitosa, THE App SHALL mostrar la vista "Sala lista" con el nombre, el código, "Copiar código", "Compartir link" y el resumen (cuota, frecuencia, inicio), y el botón "Ir a la sala".
7. IF la creación falla, THEN THE App SHALL mostrar un error descriptivo, conservar los datos del formulario y no navegar.

---

### Requirement 4: Unión a sala y pre-unión

**User Story:** Como participante, quiero unirme con un código o abriendo un link, viendo antes de qué se trata la sala.

#### Acceptance Criteria

1. THE App SHALL presentar en `/join` un campo de código de 6 caracteres que convierte a mayúsculas, admite pegar desde el portapapeles y habilita "Buscar sala" solo con 6 caracteres válidos.
2. WHEN el usuario busca un código o abre `/room/:code` sin ser participante de esa sala, THE App SHALL invocar la RPC `get_room_preview(code)` y SHALL mostrar la Pre-unión: nombre de la sala, anfitrión, participantes "n de máx", cuota, frecuencia, fecha de inicio, código, estado, y "Entrarás como {nombre}" con opción "Cambiar".
3. IF no existe una sala con ese código, THEN THE App SHALL mostrar "Ese código no existe. Revísalo e intenta de nuevo." (en `/join`) o la vista "No encontramos esta sala" (al abrir un link).
4. IF la sala está `drawn`, THEN THE App SHALL informar que el sorteo ya se hizo y que no entran más personas, y SHALL NOT permitir unirse.
5. IF la sala está `cancelled`, THEN THE App SHALL informar que {anfitrión} canceló la sala, y SHALL NOT permitir unirse.
6. IF la sala alcanzó `max_participants`, THEN THE App SHALL informar que la sala llegó a su máximo, y SHALL NOT permitir unirse.
7. WHEN el usuario pulsa "Unirme" en la Pre-unión, THE App SHALL invocar la RPC `join_room(code)`, que en una transacción vuelve a verificar estado y cupo e inserta al participante con su `display_name`.
8. WHEN la unión es exitosa (o el usuario ya era participante), THE App SHALL mostrar el Lobby de la sala.
9. IF `join_room` falla por estado o cupo (por ejemplo, otra persona ocupó el último lugar), THEN THE App SHALL mostrar el mensaje correspondiente a 4.4–4.6.
10. THE App SHALL ofrecer en Sala lista y en el Lobby el link compartible `<origen>/room/:code` ("Compartir link" usa el menú nativo de compartir cuando existe; si no, copia el link).

---

### Requirement 5: Lobby

**User Story:** Como participante o anfitrión, quiero ver quién se unió en tiempo real y, si soy anfitrión, gestionar la sala.

#### Acceptance Criteria

1. WHILE la sala está `waiting` y el usuario es participante, THE App SHALL renderizar el Lobby en `/room/:code`.
2. THE App SHALL mostrar el nombre de la sala, el chip "En espera", el código con "Copiar código" y "Compartir link", y el resumen (cuota, frecuencia, inicio).
3. THE App SHALL mostrar "Participantes (n/máx)" actualizado en tiempo real ante altas y bajas, marcando al anfitrión con el chip "Anfitrión" y al usuario con "Tú", y destacando brevemente a quien acaba de entrar.
4. WHILE el usuario no es el anfitrión, THE App SHALL ocultar los controles de gestión y SHALL mostrar "Esperando a que {anfitrión} haga el sorteo".
5. WHILE el usuario es el anfitrión, THE App SHALL mostrar: el botón primario "Sortear orden", la acción eliminar junto a cada participante excepto el propio, y "Cancelar sala" dentro del menú ⋯ de la sala.
6. WHILE hay menos de 2 participantes, THE App SHALL mostrar el estado vacío "Todavía no entra nadie" con invitación a compartir, y "Sortear orden" SHALL quedar deshabilitado con el texto "Necesitas al menos 2 participantes para sortear."
7. WHEN el anfitrión elige eliminar a un participante, THE App SHALL pedir confirmación ("¿Eliminar a {nombre}?") y, al confirmar, SHALL invocar la RPC `remove_participant`.
8. WHILE la sala está `waiting`, una persona eliminada SHALL poder volver a unirse con el código; WHILE la sala está `drawn`, SHALL NOT poder volver a unirse.
9. WHEN un participante con la sala abierta es eliminado, THE App SHALL mostrarle "Ya no estás en esta sala" con la opción "Ir al inicio".
10. WHEN el anfitrión elige "Cancelar sala", THE App SHALL pedir confirmación y, al confirmar, SHALL invocar la RPC `cancel_room`.
11. WHEN la sala pasa a `cancelled` mientras un participante la tiene abierta, THE App SHALL mostrarle "{anfitrión} canceló la sala" y llevarlo al inicio.

---

### Requirement 6: Borrador y confirmación del sorteo

**User Story:** Como anfitrión, quiero generar un orden que solo yo vea, ajustarlo si alguien no puede en cierta fecha, y recién después anunciarlo a todos.

#### Acceptance Criteria

1. WHEN el anfitrión pulsa "Sortear orden" con al menos 2 participantes, THE App SHALL generar un Borrador con Fisher-Yates, visible solo para el anfitrión, sin persistir nada.
2. THE App SHALL mostrar en el Borrador, para cada participante, su posición (1..N), nombre y Fecha de turno (Requirement 6.12).
3. THE App SHALL permitir reordenar el Borrador arrastrando cada fila y, como alternativa accesible, con botones subir/bajar.
4. WHEN el Borrador se reordena, THE App SHALL recalcular la posición y la Fecha de turno de todas las filas.
5. THE App SHALL ofrecer "Volver a sortear", que genera un nuevo orden aleatorio reemplazando el Borrador actual.
6. WHILE el anfitrión edita el Borrador, los demás participantes SHALL seguir viendo el Lobby sin indicios del borrador.
7. WHEN el anfitrión pulsa "Confirmar y anunciar", THE App SHALL mostrar una confirmación con el número de participantes, el Monto por turno, el primer turno, y el aviso "Todos verán el resultado. No se puede deshacer."
8. WHEN el anfitrión confirma, THE App SHALL invocar la RPC `confirm_draw(room_id, order)`, que en una transacción verifica que la sala siga `waiting` y que `order` contenga exactamente a los participantes actuales, inserta los `turns` con posición, fecha y monto, y pasa la sala a `drawn`.
9. IF `confirm_draw` falla, THEN THE App SHALL mostrar "No pudimos anunciar el sorteo. Tu borrador sigue aquí; intenta de nuevo." con "Reintentar", y SHALL conservar el Borrador.
10. IF los participantes cambiaron desde que se generó el Borrador (alguien entró o fue eliminado), THEN `confirm_draw` SHALL rechazar la operación y THE App SHALL pedir al anfitrión volver a sortear.
11. IF la sala ya está `drawn` (por ejemplo, confirmación en dos pestañas), THEN `confirm_draw` SHALL rechazar la operación sin crear ni modificar `turns`.
12. THE Fecha de turno de la posición *p* SHALL ser: Mensual → fecha de inicio + (p − 1) meses; Semanal → + 7·(p − 1) días; Quincenal → + 15·(p − 1) días (periodo fijo de 15 días contado desde la fecha de inicio).
13. THE App SHALL deshabilitar "Sortear orden", "Volver a sortear" y "Confirmar y anunciar" mientras la operación correspondiente está en curso.

---

### Requirement 7: Revelación del sorteo

**User Story:** Como participante, quiero ver el resultado revelarse en vivo posición por posición, para vivir el momento con el grupo.

#### Acceptance Criteria

1. WHEN la sala pasa a `drawn` mientras un participante tiene el Lobby abierto, THE App SHALL reproducir la Revelación: una tarjeta grande revela una posición a la vez (1 → N) con pausa breve, mostrando "Le toca a {nombre} · Turno {p} · {fecha}", y las posiciones ya reveladas debajo.
2. THE Revelación SHALL usar los `turns` ya persistidos; es puramente visual.
3. THE App SHALL mostrar el rótulo "Sorteado al azar" en la Revelación (decisión de producto: se mantiene aunque el anfitrión haya ajustado el borrador).
4. WHEN termina la Revelación, THE App SHALL mostrar el resumen "Orden listo" con el turno del usuario, y las acciones "Ver resultados" y "Ver de nuevo".
5. THE App SHALL ofrecer "Saltar" en todo momento, que lleva directo a la Vista de resultado.
6. WHEN un usuario abre o recarga `/room/:code` con la sala ya `drawn`, THE App SHALL mostrar directamente la Vista de resultado, sin Revelación.
7. WHILE el sistema tiene activada la reducción de movimiento, THE Revelación SHALL usar transiciones simples sin animación.
8. THE App SHALL anunciar cada posición revelada a lectores de pantalla.

---

### Requirement 8: Vista de resultados

**User Story:** Como participante, quiero ver cuándo me toca y cuánto recibo, y compartir el resultado con el grupo.

#### Acceptance Criteria

1. WHILE la sala está `drawn`, THE App SHALL renderizar la Vista de resultado en `/room/:code` para sus participantes.
2. THE App SHALL destacar arriba "Tu turno": posición, fecha y "Recibes Bs {monto por turno}".
3. THE App SHALL mostrar el resumen: cuota, frecuencia y monto por turno.
4. THE App SHALL listar el "Orden de cobro" ascendente por posición, con nombre, fecha y monto, resaltando la fila del usuario.
5. THE App SHALL formatear las fechas como "Enero 2027" (Mensual) o "15 ene 2027" (Semanal/Quincenal), y los montos como "Bs 1.600".
6. THE App SHALL ofrecer "Copiar resultados" (resumen en texto plano) y "Compartir" (menú nativo cuando existe).

---

### Requirement 9: Realtime y reconexión

**User Story:** Como participante, quiero que la vista se actualice sola y se recupere si pierdo la conexión.

#### Acceptance Criteria

1. THE App SHALL mantener una única suscripción Realtime por sala, escuchando cambios de la sala y altas/bajas de participantes.
2. WHEN la pestaña vuelve a estar visible o el canal se restablece, THE App SHALL volver a consultar la sala, los participantes y los turnos, y SHALL actualizar la vista.
3. WHILE el canal está caído, THE App SHALL mostrar el indicador "Reconectando…" sin bloquear la vista.
4. WHILE no hay conexión a internet, THE App SHALL mostrar "Sin conexión. Te mostramos lo último que vimos." con "Reintentar".

---

### Requirement 10: Seguridad de datos

**User Story:** Como usuario, quiero que solo los participantes de una sala puedan ver sus datos y solo el anfitrión pueda gestionarla.

#### Acceptance Criteria

1. THE App SHALL realizar toda escritura de `rooms`, `participants` y `turns` exclusivamente mediante RPC; el rol `authenticated` SHALL NOT tener permisos directos de INSERT, UPDATE o DELETE sobre esas tablas.
2. THE RPC `cancel_room`, `remove_participant` y `confirm_draw` SHALL verificar que `auth.uid()` sea el anfitrión de la sala.
3. THE RPC `join_room` SHALL insertar al participante solo con su propio `auth.uid()` y solo si la sala está `waiting` y con cupo, bloqueando la fila de la sala durante la verificación.
4. THE App SHALL permitir leer `rooms`, `participants` y `turns` de una sala solo a sus participantes (RLS); la información previa a unirse se obtiene únicamente con `get_room_preview(code)`, que devuelve solo los campos de la Pre-unión.
5. THE base de datos SHALL NOT permitir listar todas las salas.
6. THE `profiles` SHALL ser legibles y editables solo por su dueño.
7. THE esquema, las políticas RLS y las RPC SHALL versionarse como migraciones en el repositorio (`supabase/migrations/`).

---

### Requirement 11: Requisitos no funcionales y sistema de diseño

**User Story:** Como usuario, quiero que la app se vea propia, funcione bien en mi celular y responda de forma consistente.

#### Acceptance Criteria

1. THE App SHALL ser utilizable desde 320px de ancho, sin scroll horizontal (diseño base a 360px).
2. THE App SHALL implementar el sistema de diseño de `docs/design-brief.md` y del canvas de Claude Design: paleta vino/crema, tipografía Nunito, códigos en JetBrains Mono, botones pill, tarjetas de 18px, acentos aguayo solo en cabecera, código de sala, revelación y estados vacíos.
3. THE App SHALL definir los colores como tokens semánticos (`--color-*`) en un solo lugar; los componentes SHALL NOT usar valores hex directos. Los tokens de modo oscuro SHALL definirse, aunque el modo oscuro puede activarse en una iteración posterior.
4. THE App SHALL usar un único componente de banner de error, un único toast y un único indicador de carga en toda la aplicación.
5. THE App SHALL mostrar skeletons o spinner en operaciones que tarden más de 300 ms.
6. THE App SHALL cumplir contraste WCAG AA, foco visible en todo elemento interactivo, áreas táctiles de al menos 44×44px, y estados que no dependan solo del color.
7. THE App SHALL usar textos con tuteo, verbo primero en botones, sin signos de exclamación en mensajes del sistema, y errores que digan qué pasó y qué hacer.

---

## Fuera de alcance (para futuras iteraciones)

- **Registro de pagos**: marcar quién pagó cada cuota en cada periodo y el pozo acumulado.
- **Notificaciones** (email/WhatsApp/push) del turno asignado, por ejemplo con un servicio que consuma Database Webhooks.
- **Llamadas integradas** para el sorteo en vivo.
- **Activación del modo oscuro** en la interfaz (los tokens y artboards ya existen).
- **Navegación tipo app** con secciones adicionales (actividad, historial detallado).
