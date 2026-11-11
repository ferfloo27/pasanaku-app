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

## 8.6 — pendiente

- Contenedores locales de **pasanaku-app** disponibles; migraciones 0001–0004 verificadas.
- API local: `http://127.0.0.1:55321`; aplicación de prueba: `http://127.0.0.1:5180/`.
- La aplicación se inició con la configuración pública local obtenida por CLI, sin leer ni mostrar `.env`. No utiliza producción.
- Se creó el perfil local **Anfitrión fase 8** y se verificó el inicio vacío. No se creó una sala ni se completó el flujo de dos usuarios.
- La preparación del segundo navegador se interrumpió por la restricción indicada arriba.

Para completar: abrir la aplicación local en dos navegadores independientes; crear una sala, unirse por código con el segundo perfil, preparar y reordenar el borrador, anunciar, comprobar la revelación y el turno propio de ambos, y recargar para confirmar que se muestran resultados sin repetir la revelación.

La paridad SQL de la tarea 1.7 permanece pendiente según la decisión anterior del usuario. Las tareas manuales de Google/Auth (1.6) siguen a cargo de la persona dueña del proyecto.
