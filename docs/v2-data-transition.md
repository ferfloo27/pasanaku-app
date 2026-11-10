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
   el README. La paridad de fechas SQL/JavaScript se validará en la Fase 6.
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

## Estado de ejecución

- Decisión de descartar datos: confirmada.
- Esquema y pruebas locales: versionados en esta fase.
- Borrados de datos existentes, migraciones remotas y despliegue: no ejecutados.
- Configuración manual de Auth: pendiente de la persona dueña (tarea 1.6).
- Paridad de fechas con `turnDate`: pendiente hasta la Fase 6, por decisión de
  la persona dueña.
