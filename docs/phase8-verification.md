# Verificación de la Fase 8 — 11-11-2026

Comprobación final: `npm test` — 313 pruebas en 54 archivos; `npm run lint` — 0 errores y una advertencia previa en el Lobby de v1; `npm run build` — correcto. Las tareas completadas se verificaron con los tres comandos antes de su commit.

## Completado en código

- **8.1:** resincronización al volver visible y al restablecer el canal; indicador también durante el borrador. Un canal por sala y limpieza al salir.
- **8.2:** aviso sin conexión con datos conservados, reintento con carga visible, recuperación al volver internet y skeletons con texto accesible.
- **8.3:** sala inexistente y rutas incompletas con acciones para escribir un código o volver al inicio.
- **8.4:** foco en cada vista nueva, sin interferir con diálogos ni con actualizaciones de la misma pantalla; anuncios en español al mover filas con flechas.

Las pruebas cubren estos comportamientos y la región persistente de anuncios de la revelación. Se revisaron las instrucciones de teclado de dnd-kit, los nombres de los controles y la reducción de movimiento. La validación de anuncios usa DOM simulado; no se ejecutó un lector de pantalla real.

## Contraste y tamaños

Ratios calculados desde los tokens de la paleta clara:

| Combinación | Ratio |
|---|---:|
| Texto / fondo | 12,75 |
| Texto secundario / fondo | 5,88 |
| Primario / texto del botón | 9,03 |
| Peligro / texto del botón | 6,54 |
| Advertencia / fondo de advertencia | 8,72 |
| Éxito / fondo de éxito | 8,03 |
| Texto sobre rosa / rosa | 10,47 |
| Foco / fondo | 4,77 |
| Borde de control / superficie | 3,31 |

Botones, iconos, menús y segmentos declaran un mínimo de 44 px; campos, 48 px; casillas de código, 52 px de alto y 44 px de ancho mínimo. El código pasa a tres columnas cuando el contenedor baja de 283 px, evitando reducir los blancos táctiles.

## 8.5 — revisión visual realizada

Pase del 11-11-2026 en el navegador integrado a **320 × 740** y **360 × 740**, contrastando la composición con los HTML de diseño. Se inspeccionaron capturas y ancho del documento; sin desbordamiento horizontal (305/345 px útiles cuando hay barra de desplazamiento, o 320/360 px sin ella).

| Grupo | Cobertura en ambos tamaños |
|---|---|
| Inicio y perfil | Inicio real con sala sorteada, tarjetas en espera/sorteadas, vacío, nombre obligatorio y edición; cuenta anónima, vinculando, error y vinculada en la galería |
| Formularios | Crear, errores de campos, selector mensual y cambio a fecha semanal; código vacío e inexistente, sala lista |
| Invitación | Sala disponible, sorteada, cancelada y llena |
| Lobby | Anfitrión, participante, vacío; diálogos de eliminar y cancelar |
| Sorteo | Borrador y confirmación; revelación, resultados y turno propio |
| Recuperación | Persona eliminada, sala cancelada, sala inexistente, skeleton, sin conexión y reconectando |

Se ampliaron las muestras de desarrollo con estados transversales y nombre obligatorio, y se agregó la hoja de estilos de las tarjetas que faltaba en esa galería. No se alteró el comportamiento de producción. Las comprobaciones visuales de estados simulados no equivalen a interrumpir la red real ni a completar Google OAuth. Evidencia local: `phase8-results-320.png` en la carpeta de visualizaciones de esta conversación.

## 8.6 — flujo completo verificado

- Contenedores locales de **pasanaku-app** disponibles; migraciones 0001–0004 verificadas.
- API local: `http://127.0.0.1:55321`; aplicación de prueba: `http://127.0.0.1:5180/`.
- La aplicación se inició con la configuración pública local obtenida por CLI, sin leer ni mostrar `.env`. No utiliza producción.
- Sesiones independientes: **Anfitrión fase 8** en el navegador integrado y **Participante fase 8** en Chrome.
- Sala local **Prueba cierre v2**, código **7P2R86**: cuota Bs 100, frecuencia mensual, inicio enero de 2027 y máximo de dos personas.
- El anfitrión creó la sala; el participante buscó el código, revisó la invitación y se unió. El anfitrión recibió el cambio a 2/2 en vivo, sin recargar.
- El anfitrión preparó el borrador y subió al participante al primer turno. Chrome siguió mostrando la espera: el borrador permaneció privado.
- La confirmación mostró dos participantes, Bs 200 por turno y el primer cobro en enero de 2027. Al anunciar, ambos recibieron la revelación sin recargar.
- Resultado común: participante en el turno 1, enero de 2027; anfitrión en el turno 2, febrero de 2027. Ambos ven Bs 200 y su fila propia destacada.
- La apertura directa y recarga del anfitrión mostraron resultados; el inicio incluyó la tarjeta sorteada. En el último intento, **F5 en Chrome funcionó**: se verificó el documento recargado con resultados y turno 1, sin repetir la revelación. Las interrupciones previas eran de la herramienta de control del navegador.

Evidencia local en la carpeta de visualizaciones de esta conversación: `phase8-live-host.png` y `phase8-live-participant.png`. Los datos de prueba quedan solo en Supabase local; no se desplegó ni se modificó producción.

## Cierre de la tarea 1.7 — paridad de fechas

Por solicitud del usuario, se retomó la prueba aplazada el 11-11-2026. Se verificó el contenedor local `supabase_db_pasanaku-app` en ejecución y las migraciones 0001–0004 aplicadas, sin reiniciar la base ni tocar producción.

`npm run test:db` terminó con código 0: **98 comprobaciones pgTAP en 5 archivos y 5 tests de integración pasan**, sin fallos ni omisiones. La propiedad 12 compara las fechas guardadas por `confirm_draw` con `turnDate` para mensual, semanal y quincenal: cuatro casos generados por frecuencia, con años entre 2096 y 2104 y entre dos y ocho participantes. Las demás pruebas verifican permisos, cupo concurrente, confirmaciones simultáneas, reversión de escrituras y cambios de mes/año. Se limpiaron únicamente los datos creados por las propias pruebas.

La tarea 1.7 queda cerrada. Las tareas manuales de Google/Auth (1.6) siguen a cargo de la persona dueña del proyecto.
