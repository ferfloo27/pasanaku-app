# Pasanaku App

Aplicación web en español para organizar un pasanaku boliviano: crear una sala,
compartir su código, reunir a los participantes y sortear el orden de cobro.

## Estado del proyecto

La rama `v2` prepara la nueva versión por fases. Tras la Fase 0, las pantallas y
los servicios activos siguen siendo los de v1. La identidad con Supabase Auth,
las escrituras por RPC, el nuevo esquema y el sistema visual se implementarán
en las fases siguientes. No se han aplicado cambios a ninguna base de datos.

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
de las dos variables. El frontend v1 necesita un backend compatible con su
esquema actual (`client_id`, `start_month`, `assigned_month`); las migraciones v2
todavía no están disponibles. Un Supabase local vacío no basta para usar v1.

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

## Supabase local (Fase 1)

Esta sección describe la preparación para la siguiente fase; la Fase 0 no crea
`supabase/`, migraciones ni políticas. Desde la raíz, con Docker en ejecución:

```bash
# Una sola vez, cuando se inicie la Fase 1 y aún no exista supabase/config.toml:
npx supabase init
npx supabase start
```

Configura las variables del frontend con la URL de API y la clave `anon` del
entorno local. Cuando estén versionadas las migraciones de v2, se aplicarán con:

```bash
npx supabase db reset --local
```

Este último comando reinicia la base de datos local y descarta sus datos.
Las migraciones vivirán en `supabase/migrations/` y sus pruebas en
`supabase/tests/`. Nunca ejecutes migraciones ni pruebas de base de datos contra
producción. Un proyecto de desarrollo dedicado también sirve para esas pruebas.
Los tests de RPC y RLS se incorporarán en la tarea 1.7.

La persona dueña del proyecto realizará la configuración manual de Auth (tarea
1.6): activar el inicio de sesión anónimo, configurar Google OAuth y sus URLs de
retorno, y habilitar la vinculación manual de identidades. Esa configuración y
la integración de Auth en el frontend quedan pendientes en esta fase.

## Estructura

```text
src/
  app/          App y router; sesión y guards en fases posteriores
  features/
    auth/       api/, hooks/
    profile/    api/, domain/, hooks/, ui/
    rooms/      api/, domain/roomCode.js, hooks/, ui/
    draw/       api/, domain/shuffle.js, hooks/, ui/
  shared/
    format/     dates.js: formatMonth
    lib/        supabase.js: cliente único
    errors/     pendiente de Fase 2
    styles/     pendiente de Fase 2
    ui/         pendiente de Fase 2
  pages/        páginas actuales de v1
  components/   componentes de v1 durante la transición
  services/     roomService.js de v1 durante la transición
  utils/        identidad local de v1, hasta la Fase 3
```

Los tests de dominio y formato acompañan a sus módulos. Las carpetas pendientes
se conservan con `.gitkeep`, sin adelantar su implementación.

La lógica de dominio es pura: no importa React ni Supabase. Solo `features/*/api`
puede consumir el cliente de Supabase. ESLint restringe tanto los imports del
cliente como los del SDK. `shared/lib/supabase.js` crea el cliente; hay excepciones
temporales y explícitas para `roomService.js`, su test, `Lobby.jsx` y `RoomPage.jsx`.
Se retirarán al migrar esos accesos a la capa `api`. Los archivos nuevos no
heredan las excepciones.

## Despliegue

El destino es Vercel: build `npm run build`, salida `dist/`, y las dos variables
`VITE_SUPABASE_*` configuradas para el entorno correspondiente. `vercel.json`
redirige las rutas del navegador a `index.html`, incluidas las de salas.
La preparación local no publica cambios ni modifica producción.
