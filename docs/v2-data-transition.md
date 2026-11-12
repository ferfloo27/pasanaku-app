# Transición de datos v1 → v2

## Decisión

El 10-11-2026 la persona dueña confirmó que los datos actuales son de prueba y
se descartan al estrenar v2. No se migran salas, participantes ni turnos de v1.
Este documento es el plan: no ejecuta borrados ni cambios remotos.

La v1 usa `client_id`, `start_month` y `assigned_month`. No permite reconstruir
de forma fiable la relación con `auth.uid()`, el anfitrión autenticado ni los
campos nuevos de una sala. No se inventarán identidades, nombres ni cuotas para
adaptar esos registros. Los perfiles y las participaciones v2 se crearán con
sesiones reales de Supabase Auth al utilizar la nueva app.

## Preparación antes del despliegue

1. Completar las fases de frontend, las pruebas de base de datos y el flujo con
   dos navegadores. La Fase 1 por sí sola no habilita un despliegue de v2.
2. Preparar un proyecto de desarrollo aislado con el esquema vacío y las
   migraciones versionadas. Las cuatro migraciones iniciales son para una base
   limpia; no se aplican encima de las tablas existentes de v1.
3. Validar allí RLS, RPC, Realtime y Auth. Completar el panel manual descrito en
   el README. La paridad de fechas SQL/JavaScript quedó verificada el 11-11-2026.
4. Preparar un destino limpio para v2. Preferir un proyecto separado para
   mantener v1 disponible durante las pruebas y el cambio de despliegue.
   No enlazar el entorno de pruebas local con producción.

## Cambio de versión (lo realiza la persona dueña)

1. Verificar el proyecto de destino y que ningún otro producto utiliza sus
   tablas. Identificar expresamente qué entorno corresponde a v1 y cuál a v2.
2. Cerrar el acceso de escritura a v1 durante el cambio. Una exportación previa
   puede conservarse fuera del repositorio si se desea poder revisar las pruebas
   antiguas; no se importará en v2.
3. Preparar el esquema vacío de destino con las migraciones y los ajustes de
   Auth de v2, después de su validación en desarrollo. No usar `db reset`
   contra producción. La limpieza o retirada del entorno v1 es una operación
   manual posterior, revisada por la persona dueña.
4. Configurar el despliegue v2 con su URL y clave pública de Supabase. No copiar
   secretos de servidor al frontend ni al repositorio.
5. Publicar el frontend v2 y comprobar: crear una sala, unirse desde otro
   navegador, confirmar un sorteo y ver los mismos turnos en ambos.
6. Comprobar que una sesión nueva empieza sin salas antiguas. No convertir
   identificadores locales v1 en cuentas ni borrar indiscriminadamente el
   almacenamiento del navegador.

## Vuelta atrás

Con destinos separados, conservar temporalmente el despliegue y la base v1
permite volver al entorno anterior si falla el estreno. Los registros creados
en v2 no se convertirán a v1. Una vez borrado el entorno de prueba v1, solo una
copia previa permite recuperarlo; por eso su retirada se hace después de
validar el estreno, no durante esta tarea.

## Reutilización del proyecto v1 (decisión del 11-11-2026)

La persona dueña confirmó que reutilizará el proyecto actual: v1 sigue publicada,
pero no está en uso y admite una interrupción durante el cambio. El inventario
remoto compartido contiene únicamente las tres tablas de v1, sin `profiles`.

El paquete [upgrade-v1-to-v2.sql](sql/upgrade-v1-to-v2.sql) está preparado para
ejecución manual en **SQL Editor**, como una sola consulta completa. No se ha
ejecutado en el proyecto remoto.

Antes de aplicarlo:

1. Confirmar el proyecto y conservar una exportación externa del esquema y los
   datos actuales. El archivo dentro de la misma base no sustituye ese respaldo.
2. Retirar temporalmente el frontend v1 del acceso público y preparar el
   despliegue de v2. El cambio de esquema deja incompatible al frontend v1.
3. Revisar el archivo completo y ejecutar únicamente este paquete; no aplicar
   después las migraciones iniciales por separado.

El paquete comprueba las columnas esperadas y detiene una segunda ejecución.
Aparta `rooms`, `participants` y `turns` en `pasanaku_v1_archive`, conservando sus
filas, índices y relaciones; retira esas tablas de Realtime y los permisos de
los roles cliente. No modifica `auth.users` ni elimina cuentas. Después aplica
exactamente las migraciones 0001–0004: tablas v2 vacías, RLS, RPC y Realtime.
Todo sucede en una transacción; un error revierte también el archivo y los
permisos. Los bloqueos tienen un límite de espera de cinco segundos.

Después de aplicarlo, comprobar las cuatro tablas nuevas en `public`, configurar
Auth según el README, publicar v2 y probar dos usuarios. Conservar el archivo v1
hasta validar el estreno. Una vuelta atrás después del commit requiere restaurar
el esquema v1 con revisión previa y preservar cualquier dato nuevo de v2; no basta
con volver al despliegue anterior.

Este paquete manual no registra el historial de Supabase CLI. Antes de utilizar
`db push` en este proyecto, conciliar las versiones 0001–0004 con
`migration repair --status applied`, tras verificar el destino y la ejecución
correcta del paquete. No ejecutar `db reset` remoto.

Ensayo local reproducible (requiere el contenedor local en ejecución):

```bash
node --test supabase/transition/upgrade-v1-to-v2.integration.mjs
```

Usa bases temporales nuevas dentro de `supabase_db_pasanaku-app` y las elimina
al terminar; no cambia la base local de la aplicación. Comprueba fidelidad a las
migraciones, conservación de datos/Auth, permisos, RLS, Realtime, rechazo de una
segunda ejecución y reversión ante un conflicto al crear las funciones. La
estructura v1 de ensayo reproduce las columnas informadas, sin asumir que sea
una copia completa de los permisos, funciones o configuración remotos.

Validación del paquete el 11-11-2026: tres ensayos de transición pasan;
`npm test`, 313 pruebas en 54 archivos; `npm run lint`, cero errores y una
advertencia previa del Lobby de v1; `npm run build`, correcto.

## Estado de ejecución

- Decisión de descartar datos: confirmada.
- Esquema, flujo de dos navegadores y paridad SQL/JavaScript: verificados en local.
- Paquete de transición en el mismo proyecto: preparado y ensayado en local.
- Ejecución remota del paquete: la persona dueña reportó "Success. No rows returned" en SQL Editor el 11-11-2026. Las tablas v1 se apartan; no se solicitó su eliminación posterior.
- Despliegue v2: la persona dueña confirmó su funcionamiento en `https://pasanaku-app.vercel.app/`.
- Configuración manual de Auth: completada por la persona dueña, que confirmó la persistencia de la sesión con Google (tarea 1.6).
- Historial de Supabase CLI: conciliar antes de un futuro `db push`, según el procedimiento anterior; no se ha confirmado esa conciliación.
