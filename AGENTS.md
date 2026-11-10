# AGENTS.md — Pasanaku App (v2)

App web para organizar pasanakus (ahorro rotativo boliviano): crear una sala, unirse con un código de 6 caracteres y sortear el orden de cobro. La interfaz y los textos van en español.

## Fuente de verdad

Lee estos archivos antes de cambiar código y respétalos en este orden:

1. `.kiro/specs/pasanaku-app/requirements.md`: qué debe hacer la app.
2. `.kiro/specs/pasanaku-app/design.md`: arquitectura, SQL, RPC, firmas del dominio, máquina de estados y propiedades de corrección.
3. `.kiro/specs/pasanaku-app/tasks.md`: el plan por fases. Marca `[x]` cada tarea al terminarla.
4. `docs/design-brief.md` y `docs/design/*.dc.html`: el sistema de diseño y las pantallas. Cada tarea indica su artboard, y el archivo se llama igual (por ejemplo, "Lobby anfitrión" está en `LobbyAnfitrion.dc.html`).

Si el código choca con la spec, la spec manda. Si la spec es ambigua o se contradice, detente y pregunta. No inventes reglas de negocio.

## Stack

React 19, Vite 8, React Router 7, `@supabase/supabase-js` 2, Vitest 4, fast-check 4, Testing Library y ESLint 10. Se despliega en Vercel.

En esta etapa no agregues TypeScript, Tailwind ni librerías de estado. La única dependencia nueva prevista es `@dnd-kit` (Fase 6). Si crees que hace falta otra, pregunta antes de instalarla.

## Arquitectura (resumen de `design.md`)

```
src/
  app/        router, AuthProvider, guards
  features/{auth,profile,rooms,draw}/
    domain/   lógica pura: sin React y sin Supabase, con tests de propiedades
    api/      el ÚNICO lugar que usa Supabase; devuelve datos o lanza AppError
    hooks/
    ui/
  shared/     ui/, styles/tokens.css, lib/supabase, errors/, format/
  pages/      páginas delgadas que solo componen
```

- Ningún componente ni hook importa Supabase. Solo lo hace `features/*/api`, y ESLint lo bloquea.
- Las escrituras pasan solo por RPC `security definer`. Nunca hagas `insert`, `update` ni `delete` directo desde el cliente.
- Los errores se convierten en `AppError` con los códigos de `design.md`. Los mensajes al usuario van en español.
- Los colores, espacios y radios salen de los tokens semánticos `--color-*` de `shared/styles/tokens.css`. No escribas valores hex sueltos en los componentes.

## Reglas de trabajo

- Trabaja en la rama `v2`. No hagas commits en `main` ni push sin que te lo pidan.
- Haz un commit por tarea o grupo pequeño, con Conventional Commits en español (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Una tarea está terminada solo cuando pasan `npm test`, `npm run lint` y `npm run build` sin errores. Si algo falla, dilo y muestra la salida. No lo escondas.
- La lógica de dominio nueva lleva su test de propiedad (`fast-check`), como indica `design.md`.
- **Nunca** leas, muestres ni copies los valores de `.env`. Las variables son `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **Nunca** apliques migraciones ni corras tests de base de datos contra el proyecto de Supabase de producción. Usa Supabase local (`npx supabase start`, requiere Docker) o un proyecto de desarrollo.
- Las tareas manuales del panel de Supabase (tarea 1.6) las hace la persona dueña del proyecto. Solo documéntalas en el README.

## Comandos

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npx supabase start      # Fase 1 en adelante, requiere Docker
npx supabase db reset   # reaplica las migraciones en local
```
