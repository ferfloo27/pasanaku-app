# Pasanaku App

Aplicación web en español para organizar un pasanaku boliviano: crear una sala,
compartir su código, reunir a los participantes y sortear el orden de cobro.

## Estado del proyecto

La rama `v2` prepara la nueva versión por fases. El entorno local dispone del
esquema v2, RLS y RPC transaccionales. El sistema visual, la sesión anónima y el
perfil están implementados. El inicio, la creación y la unión ya usan las RPC v2.
La sala de miembros muestra el resumen y los participantes en modo de lectura;
la gestión y Realtime corresponden a la Fase 5, y el sorteo a las fases 6–7.
Las migraciones y pruebas se ejecutan solo en Supabase local.
No se han modificado los datos ni la configuración de producción.

La fecha mínima para crear salas se calcula en `America/La_Paz`. Las salas
canceladas se devuelven durante 30 días para el aviso único por dispositivo.

La fuente de verdad, en orden, es:

1. [Requisitos](.kiro/specs/pasanaku-app/requirements.md).
2. [Diseño técnico](.kiro/specs/pasanaku-app/design.md).
3. [Tareas por fases](.kiro/specs/pasanaku-app/tasks.md).
4. [Brief visual](docs/design-brief.md) y [pantallas HTML](docs/design/Inicio.dc.html).

Las reglas para contribuir están en [AGENTS.md](AGENTS.md).

## Requisitos

- Node.js compatible con Vite 8 y ESLint 10: `20.19+` en la línea 20,
  `22.13+` en la línea 22, o `24+`. Verificado con Node.js `24.19.0`.
- npm y una configuración de Supabase de desarrollo.
- Para Supabase local, a partir de la Fase 1: Docker en ejecución y Supabase CLI.

Stack: React 19, Vite 8, React Router 7 y Supabase JS 2. Pruebas con Vitest 4,
Testing Library y fast-check 4; revisión estática con ESLint 10.

## Ejecutar el frontend

Desde la raíz del repositorio (`pasanaku-app/`):

```bash
npm ci
```

Crea un archivo `.env.local` con estas variables, usando los datos de tu entorno
local o de desarrollo:

```dotenv
VITE_SUPABASE_URL=<URL del entorno de desarrollo>
VITE_SUPABASE_ANON_KEY=<clave anon del entorno de desarrollo>
```

No subas archivos de entorno ni credenciales al repositorio. El cliente necesita
la clave pública `anon`; nunca uses una clave `service_role` en variables `VITE_*`,
que se incluyen en el frontend. Reinicia Vite si cambias las variables.

```bash
npm run dev
```

Abre la dirección que muestra Vite. El cliente falla al iniciar si falta alguna
de las dos variables. Configura un backend local o de desarrollo con las
migraciones v2 para probar crear, buscar y unirse a salas. Las rutas activas ya
no usan las escrituras directas ni las columnas antiguas de los servicios v1.
El código heredado restante se conserva durante la transición de las fases
siguientes; no forma parte de estos flujos activos.

### Inicio, crear y unirse (Fase 4)

`/` consulta `list_my_rooms` y muestra salas en espera o sorteadas. Las canceladas
no aparecen en la lista; su aviso se recuerda una vez por dispositivo y usuario.
Solo las marcas de avisos se guardan localmente, nunca la lista de salas.

`/new` valida nombre, cuota, frecuencia, fecha de Bolivia y máximo; envía
`create_room` y muestra el código con copiar/compartir. `/join` normaliza el
código y consulta su existencia antes de navegar. `/room/:code` vuelve a cargar
la vista previa; la unión usa `join_room` y el servidor revalida cupo y estado.
Salas llenas, canceladas o sorteadas impiden nuevas uniones. El miembro existente
entra a su sala sin volver a unirse. Los errores conservan los datos editados.

`/dev/rooms` muestra los componentes de estas pantallas con datos de muestra,
sin Auth ni llamadas a Supabase; igual que `/dev/ui`, solo existe en desarrollo.
Permite comprobar diseño y estados sin afectar datos. La prueba completa con
dos navegadores y Realtime se verificó en local; la evidencia está en
`docs/phase8-verification.md`.

### Identidad y nombre (Fase 3)

Las rutas de la app esperan una sesión válida y un perfil con nombre antes de
mostrar acciones. Se reutiliza la sesión guardada; si no existe, se inicia una
anónima. Los errores permiten reintentar. El nombre se guarda en `profiles`,
protegido por RLS; esta tabla permite escrituras propias según `design.md`.
Cambiarlo desde el inicio no modifica los nombres de participaciones anteriores.

Google se vincula mediante `linkIdentity`, conservando el `auth.uid()` y el nombre
existente. Cuando falta nombre, el de Google aparece como sugerencia editable;
no se guarda automáticamente. La app vuelve a `/` y muestra un aviso si se
cancela o falla la vinculación. Registra `<origen>/` entre las URLs de retorno
permitidas de Supabase. Un marcador temporal en `sessionStorage` detecta volver
atrás; no almacena identificadores ni credenciales.

La galería `/dev/ui` incluye una muestra del perfil y de los estados de cuenta
que no inicia sesiones ni guarda datos en Supabase. Las pruebas de identidad
simulan el cliente. La persona dueña completó la configuración manual de la
tarea 1.6 y confirmó la persistencia de la sesión con Google en la web publicada
el 11-11-2026.

## Comprobaciones

Cada tarea debe terminar con los tres comandos sin errores:

```bash
npm test
npm run lint
npm run build
```

`npm test` ejecuta la suite una vez. `npm run test:watch` mantiene las pruebas en
observación. Las pruebas actuales simulan Supabase y no requieren una base de
datos en ejecución. El build genera `dist/`; `npm run preview` permite revisarlo.

Con Supabase local iniciado y sus migraciones aplicadas, ejecuta las pruebas de
base de datos por separado:

```bash
npm run test:db
```

La suite ejecuta pgTAP para esquema, RLS, RPC y publicación Realtime. Después usa
conexiones reales al contenedor local `supabase_db_pasanaku-app` para comprobar dos
uniones al último cupo, dos confirmaciones simultáneas, reversión ante un fallo
durante la escritura y fechas semanales/quincenales. No lee archivos de entorno.
Los datos creados por los tests se revierten o se eliminan al terminar.

La propiedad 12 compara las fechas persistidas por SQL con `domain/schedule.js`
para las frecuencias mensual, semanal y quincenal en `transactions.integration.mjs`.
Verificada en Supabase local el 11-11-2026: 98 comprobaciones pgTAP y 5 tests de
integración pasan, sin omisiones. El cierre y la evidencia se registran en
`docs/phase8-verification.md`.

## Supabase local

`supabase/config.toml` fue generado con Supabase CLI `2.120.0`. La CLI se ejecuta
con `npx`, sin añadir dependencias al frontend. Con Docker en ejecución:

```bash
npx --yes supabase@2.120.0 start
```

El proyecto local se llama `pasanaku-app`. Usa puertos propios para convivir con
otros proyectos: API `http://127.0.0.1:55321`, PostgreSQL `55322` y Studio
`http://127.0.0.1:55323`. Auth anónimo y manual linking están habilitados en local.
Storage, Edge Functions y Analytics están desactivados porque esta app no los usa.

Para aplicar migraciones pendientes sin reiniciar los datos locales:

```bash
npx --yes supabase@2.120.0 migration up --local
```

Para reconstruir **solo la base local**, descartando sus datos:

```bash
npx --yes supabase@2.120.0 db reset --local
```

Las migraciones viven en `supabase/migrations/` y las pruebas en `supabase/tests/`.
No vincules este entorno al proyecto de producción ni uses `--linked`,
`--remote` o una URL remota para migraciones y pruebas. La configuración sigue el
[flujo local de Supabase](https://supabase.com/docs/guides/local-development/cli-workflows).

Para detener los servicios y conservar sus datos locales:

```bash
npx --yes supabase@2.120.0 stop
```

Cuando se integre el frontend v2, la persona dueña del entorno configurará las
variables del frontend con la URL y la clave `anon` locales. Los valores no se
guardan en este README ni se incluyen en los tests.

### Configuración manual del panel (tarea 1.6, completada por la persona dueña)

**Cuenta y ajustes (rama `feature/cuenta-google-ajustes`):** el acceso a una cuenta
existente usa un retorno distinto al de vinculación. Antes de probarlo, la persona
dueña debe añadir en **Authentication → URL Configuration → Redirect URLs** las
URLs exactas del frontend: `https://pasanaku-app.vercel.app/auth/google` y, para
desarrollo, `http://localhost:5173/auth/google` (ajustar al origen/puerto real).
La URL de callback del proveedor en Google Cloud sigue siendo la de Supabase.
Para un Preview, autoriza también su raíz `/` y su ruta `/auth/google` en el
mismo proyecto: guardar las salas vuelve a la raíz y entrar vuelve al callback.

«Guardar mis salas con Google» conserva el nombre, identidad y salas del invitado
para recuperarlos desde otro dispositivo con una cuenta Google aún no registrada.
«Entrar con Google» recupera el perfil y salas Google; se bloquea si el invitado
tiene alguna participación, incluso cancelada antigua. Nunca fusiona cuentas.
El acceso necesita sessionStorage y caduca a los 15 minutos; cancelarlo mantiene
la sesión original. «Cerrar sesión» afecta solo a este navegador, sin borrar
datos, y devuelve al primer uso como invitado. El nombre se edita desde el avatar
de Inicio → Cuenta y ajustes; el correo es de solo lectura.

En el proyecto Supabase de desarrollo, realiza estos pasos:

1. En **Authentication**, habilita **Allow anonymous sign-ins** y **Allow manual
   linking**. Las sesiones anónimas usan el rol `authenticated`; `anon` es una
   petición sin sesión. Consulta [Auth anónimo](https://supabase.com/docs/guides/auth/auth-anonymous).
2. En Google Cloud, crea un cliente OAuth de tipo aplicación web. Registra los
   orígenes de la app y la URL de callback indicada por el proveedor Google de
   Supabase. Para este entorno local, el callback es
   `http://127.0.0.1:55321/auth/v1/callback`.
3. En el proveedor **Google** de Supabase, configura el Client ID y Client Secret
   y habilítalo. El secreto queda en la configuración del servidor, nunca en
   `VITE_*`. Sigue la [guía oficial de Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
4. En **URL Configuration**, configura la Site URL y permite las URLs de retorno
   del frontend, por ejemplo `http://localhost:5173` en desarrollo y el dominio
   exacto del despliegue para el entorno correspondiente. Son distintas del
   callback de Google: consulta [URLs de retorno](https://supabase.com/docs/guides/auth/redirect-urls).
5. Comprueba la vinculación con Google: conservar
   el `auth.uid()` y el nombre de perfil, cancelar sin perder la sesión y volver
   al frontend correcto.

La persona dueña confirmó la configuración de Google OAuth y la persistencia de
su sesión en `https://pasanaku-app.vercel.app/` el 11-11-2026. El callback remoto
es `https://khtujmtypqexzkfnkzay.supabase.co/auth/v1/callback`. La configuración
remota y la prueba de Google las realizó la persona dueña; las pruebas locales
automatizadas simulan el proveedor. Las opciones locales de Auth no configuran
automáticamente otros proyectos.

## Transición de datos de v1

Los datos actuales son de prueba. Por decisión del 10-11-2026, no se importarán
en v2. El [plan de transición](docs/v2-data-transition.md) describe la preparación
de un destino limpio, el cambio de versión y la vuelta atrás. Esta fase no borra
datos existentes ni aplica migraciones remotas.

## Estructura

El sistema visual compartido se puede probar en `/dev/ui` con `npm run dev`.
La galería no se incluye en producción ni necesita conectarse a Supabase.
Los contratos de los componentes están en [Componentes compartidos](docs/ui-components.md).

```text
src/
  app/          App, router, sesión/perfil compartidos y guards
  features/
    auth/       api/, hooks/
    profile/    api/, domain/, hooks/, ui/
    rooms/      api/, domain/roomCode.js, hooks/, ui/
    draw/       api/, domain/shuffle.js, hooks/, ui/
  shared/
    format/     montos y fechas en español
    lib/        supabase.js: cliente único
    errors/     AppError y mensajes en español
    styles/     tokens, base y modo oscuro definido pero desactivado
    ui/         componentes del sistema visual
  pages/        páginas delgadas v2 y muestras solo de desarrollo
  components/   componentes de v1 durante la transición
  services/     roomService.js de v1 durante la transición
```

Los tests de dominio y formato acompañan a sus módulos. Las carpetas pendientes
se conservan con `.gitkeep`, sin adelantar su implementación.

La lógica de dominio es pura: no importa React ni Supabase. Solo `features/*/api`
puede consumir el cliente de Supabase. ESLint restringe tanto los imports del
cliente como los del SDK. `shared/lib/supabase.js` crea el cliente; hay excepciones
temporales y explícitas para `roomService.js`, su test y `Lobby.jsx` heredados.
Se retirarán al migrar esos accesos a la capa `api`. Los archivos nuevos no
heredan las excepciones.

## Despliegue

El destino es Vercel: build `npm run build`, salida `dist/`, y las dos variables
`VITE_SUPABASE_*` configuradas para el entorno correspondiente. `vercel.json`
redirige las rutas del navegador a `index.html`, incluidas las de salas.
La preparación local no publica cambios ni modifica producción.
