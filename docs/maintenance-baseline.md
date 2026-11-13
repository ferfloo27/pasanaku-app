# Mantenimiento de v2 — revisión inicial del 11-11-2026

## Alcance y evidencia

- Código revisado: rama `v2`, commit `5732d29` (código funcional de `a92b90a`).
- Web pública: GET a `https://pasanaku-app.vercel.app/`, sin iniciar sesión ni crear datos. HTTP 200; JavaScript principal `/assets/index-JbDiXNis.js`.
- `npm test`: 314 pruebas en 54 archivos, sin fallos.
- `npm run lint`: cero errores y una advertencia previa en el Lobby v1.
- `npm run build`: correcto. Entrada principal: 232,71 kB sin comprimir, 74,86 kB gzip. Hay carga diferida por rutas; también se necesita el código compartido de Auth/Supabase, por lo que esa entrada no representa la descarga inicial completa.
- Docker estaba detenido después del reinicio. Se inició Docker Desktop y se verificó únicamente `supabase_db_pasanaku-app`.
- `npm run test:db`: 98 comprobaciones pgTAP y 5 pruebas de integración pasan. Cubren RLS, escrituras por RPC, autorización del anfitrión, cupo concurrente, confirmación atómica y paridad de fechas.
- `npm audit --omit=dev`: cero avisos conocidos de producción al consultar el registro.
- `npm audit`: 12 dependencias señaladas, 5 de severidad alta y 7 moderada, en el árbol de herramientas de desarrollo. No se aplicaron actualizaciones automáticas.
- No se encontraron archivos `.env*` versionados ni referencias a claves de servicio/privadas en los archivos de `src/`, `public/` y `vercel.json` examinados. No se leyeron archivos de entorno. Esto no sustituye un análisis completo del historial de secretos.

Los tests de Supabase son locales; no certifican los permisos o ajustes efectivos del proyecto remoto. La revisión no es un pentest exhaustivo ni una prueba de carga.

## Hallazgos y prioridades

### M01 — Actualizar las herramientas con avisos de seguridad (alta)

El análisis completo señala `vite`, `undici`, `zod`, `source-map-js` y
`brace-expansion` con severidad alta. También señala Vitest, su mocker/cobertura,
ESLint y dependencias asociadas con severidad moderada. Los avisos pueden
propagarse por varios paquetes: no representan doce ataques distintos.

Los vectores y precondiciones varían. Por ejemplo, los avisos de
[Vite](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) y
[Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) afectan mecanismos de
servidor de desarrollo/pruebas; no prueban que estén expuestos por el despliegue
estático de Vercel.

Actualizar primero dentro de los rangos compatibles y revisar los avisos
restantes individualmente. No usar `npm audit fix --force`: algunas propuestas
del registro cambian ESLint 10 por 9, contrario al stack actual. Volver a correr
las suites después de cada grupo de cambios.

### M02 — Recuperación de una cuenta Google desde otro dispositivo (alta, reproducción pendiente)

Actualización 13-11-2026: la persona dueña reprodujo el fallo en celular después
de elegir su cuenta Google. En `feature/cuenta-google-ajustes` se añadió acceso
explícito para cuentas existentes, separado de vinculación, y la pantalla de
cuenta. Las pruebas automatizadas simulan la red (incluida la escritura del SDK
real) y protegen las salas invitadas. Falta configurar el retorno `/auth/google`
y comprobar el flujo Google real con la persona dueña después de integrar y
desplegar esta rama. No se declara cerrada la comprobación entre dispositivos.

`authApi.js` implementa `linkIdentity`, pero no `signInWithOAuth` ni otra acción
para entrar a una cuenta ya existente. La interfaz promete recuperar salas en
otro celular. Mantener la sesión en el navegador original no verifica ese caso.

Supabase distingue vincular una identidad nueva de iniciar sesión en una cuenta
existente; vincular una identidad que ya pertenece a otra cuenta puede fallar.
Fuentes: [identidades](https://supabase.com/docs/guides/auth/auth-identity-linking)
y [conflictos de cuentas anónimas](https://supabase.com/docs/guides/auth/auth-anonymous#resolving-identity-conflicts).

Reproducción pendiente: vincular Google y crear una sala; abrir un navegador
sin esa sesión; intentar acceder con la misma cuenta y comprobar que se
recuperan nombre y salas. Se solicitó esta comprobación a la persona dueña.

Preparar una acción explícita de inicio de sesión para cuentas existentes. Si
ya hay salas en una sesión anónima, decidir antes cómo conservarlas o cambiar
de cuenta; no fusionar ni reasignar propietarios automáticamente.

### M03 — Cabeceras de protección del navegador (media)

La respuesta HTML observada tiene HSTS, pero no `Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ni
`Permissions-Policy`. `vercel.json` configura únicamente las rutas de la SPA.

Preparar protección contra inclusión en marcos, detección incorrecta de tipos,
permisos innecesarios y una CSP compatible con Supabase HTTPS/WebSocket y las
fuentes de Google usadas actualmente. Validar que no rompe Auth, Realtime,
estilos ni portapapeles. La ausencia de cabeceras es un punto de endurecimiento,
no evidencia de una intrusión ni de XSS explotable.

### M04 — Lecturas repetidas y resincronización excesiva (media)

El recorrido de un miembro en `loadRoomSession` hace seis consultas de datos:
una vista previa, dos lecturas en `fetchMemberRoom` y tres en `fetchRoomState`.
Se repiten la sala y sus participantes. La suscripción inicial fuerza otra
resincronización completa para cerrar carreras, lo que amplifica esas lecturas.

Además, la suscripción a DELETE de participantes es global y cada evento
recibido provoca una recarga, aunque su identificador no pertenezca a la lista
de esta sala. Revisar la relevancia del evento antes de recargar, conservando
el tratamiento de eliminación propia y los cambios durante una lectura.

Optimizar con pruebas de conteo de consultas y carreras; conservar las
comprobaciones RLS y de pertenencia. No eliminar esas comprobaciones a cambio
de reducir consultas.

### M05 — Protección frente a creación masiva (media, configuración remota pendiente)

El frontend no entrega un token CAPTCHA a `signInAnonymously`, y las RPC no
declaran cuotas de creación por cuenta. No se inspeccionó si el proyecto remoto
tiene medidas adicionales de limitación o protección.

Supabase recomienda [CAPTCHA/Turnstile y límites de acceso anónimo](https://supabase.com/docs/guides/auth/auth-anonymous#abuse-prevention-and-rate-limits).
Si se adopta CAPTCHA, integrar primero su token en el frontend: activarlo solo
en el panel puede impedir entrar. Definir las cuotas de salas/operaciones en
el servidor con la persona dueña; los límites de Auth no limitan por sí solos
las llamadas RPC de una sesión ya creada.

### M06 — Medición continua de experiencia (baja)

El GET de HTML tardó 749 ms desde esta máquina en una única muestra y fue un
HIT de caché. No equivale a LCP, INP o CLS ni permite juzgar la experiencia de
los usuarios. Falta establecer una línea base de carga móvil, errores reales
de Auth/Realtime, latencia de RPC y volumen de consultas. No se inspeccionó
el panel de analítica de Vercel ni se activó telemetría.

## Siguiente tanda propuesta

1. Resolver los avisos de herramientas con actualizaciones compatibles.
2. Preparar y verificar cabeceras de seguridad.
3. Reproducir Google desde otra sesión y completar el flujo de acceso existente.
4. Reducir consultas duplicadas y recargas de eventos ajenos.
5. Acordar protección contra abuso y métricas de seguimiento antes de ampliar funciones.

Las correcciones tendrán sus pruebas y commits separados. No se hizo push ni
se cambió la configuración remota durante esta revisión.
