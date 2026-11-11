# Brief de diseño — Pasanaku

> Documento para llevar a Claude Design. Define el sistema de diseño y las pantallas a diseñar.
> Fuente: `.kiro/specs/pasanaku-app/` + decisiones del 08-11-2026.

---

## 1. Contexto del producto

**Pasanaku** es una tradición boliviana de ahorro grupal (tanda / pasanaku): un grupo aporta una cuota fija cada periodo y, por turnos, una persona recibe el total. La app digitaliza **la organización del sorteo**:

1. El anfitrión crea una sala (nombre, cuota, frecuencia, fecha de inicio).
2. Comparte un código de 6 caracteres o un link.
3. Los participantes se unen (sin registro: sesión anónima, opcionalmente vinculan Google).
4. El anfitrión sortea el orden en un **borrador privado**, lo ajusta si hace falta y lo confirma.
5. Todos ven una **animación de revelación** en vivo y luego la tabla de resultados.

**Usuarios:** grupos de familia, amigos o trabajo en Bolivia. Uso mayoritario en **celular**, a menudo mientras están juntos en una reunión o llamada. Idioma: **español (Bolivia)**. Moneda: **Bs**.

**Sensación buscada:** cálida, cercana, de confianza. Algo "nuestro", no una app bancaria fría ni un juego de azar.

---

## 2. Principios

1. **Mobile-first real.** Diseñar a 360px; debe funcionar desde 320px sin scroll horizontal.
2. **Una acción principal por pantalla.** Un solo botón primario (vino relleno); el resto secundarios o de texto.
3. **Temática sutil.** La identidad andina aparece en momentos clave, no en todo (ver §4).
4. **Transparencia.** El sorteo debe sentirse justo: mostrar quién es anfitrión, cuántos hay, qué pasa en cada paso.
5. **Calma ante errores.** Mensajes que dicen qué pasó y qué hacer, sin culpar al usuario.

---

## 3. Tokens

### 3.1 Color — primitivos

| Token | Hex | Uso |
|---|---|---|
| `vino-900` | `#5C1220` | Texto sobre rosa, hover del primario |
| `vino-700` | `#8B1E2F` | **Color de marca**, botón primario |
| `vino-500` | `#B5475A` | Ilustración, detalles |
| `rosa-200` | `#E9B5C0` | Borde de elementos destacados |
| `rosa-100` | `#F6DDE2` | Fondo de destacado (fila propia, chip anfitrión) |
| `crema-50` | `#FBF3EC` | Fondo de página |
| `crema-200` | `#E8DCD2` | Bordes de tarjeta |
| `crema-300` | `#D9C8BE` | Bordes de campo |
| `blanco` | `#FFFFFF` | Superficies (tarjetas, campos) |
| `oro-500` | `#D9A441` | Acento decorativo (aguayo, celebración). **No usar para texto** |
| `tinta-900` | `#2C2C2A` | Texto principal |
| `tinta-600` | `#6E5A55` | Texto secundario (cálido) |
| `tinta-400` | `#9A8A84` | Placeholder, deshabilitado |

### 3.2 Color — semánticos (los componentes solo usan estos)

| Token | Claro | Oscuro (provisional, se diseña después) |
|---|---|---|
| `--color-bg` | `crema-50` | `#1C1416` |
| `--color-surface` | `blanco` | `#2A1F22` |
| `--color-border` | `crema-200` | `#3D2E32` |
| `--color-text` | `tinta-900` | `#F3ECE8` |
| `--color-text-muted` | `tinta-600` | `#BFAFA9` |
| `--color-primary` | `vino-700` | `#D06A7C` |
| `--color-on-primary` | `blanco` | `#1C1416` |
| `--color-accent-soft` | `rosa-100` | `#4A2630` |
| `--color-accent` | `oro-500` | `#E0B45C` |
| `--color-danger` | `#B3261E` | `#F2867E` |
| `--color-danger-soft` | `#FCEBEB` | `#4A1E1E` |
| `--color-success` / `-soft` | `#27500A` / `#E3F1E4` | `#9CCB7A` / `#1F3318` |
| `--color-warning` / `-soft` | `#633806` / `#FAEEDA` | `#F0C27A` / `#3D2A10` |

**Modo oscuro:** no se diseña ahora, pero todos los componentes deben referirse a tokens semánticos para poder agregarlo luego sin rediseñar.

**Contraste:** texto normal ≥ 4.5:1. Blanco sobre `vino-700` ≈ 9.5:1 ✔. `tinta-600` sobre `crema-50` ≈ 6:1 ✔. `oro-500` nunca como texto sobre crema.

### 3.3 Tipografía

- **Familia:** sans redondeada — **Nunito** (preferida) o Poppins, Google Fonts. Pesos: 400 y 700 (o 600 si 700 se ve pesado).
- **Códigos de sala:** monoespaciada (ej. JetBrains Mono / system mono), mayúsculas, `letter-spacing: 0.2em`.

| Estilo | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| Display | 28 / 34 | 700 | Revelación, saludo de inicio |
| Título | 22 / 28 | 700 | Título de pantalla |
| Subtítulo | 17 / 24 | 700 | Secciones, nombre en tarjetas |
| Cuerpo | 15 / 22 | 400 | Texto general |
| Nota | 13 / 18 | 400 | Ayudas, metadatos |
| Código | 24 / 28 | 700 mono | Código de sala |

### 3.4 Forma, espacio y elevación

- **Radios:** tarjeta `18px` · campo `12px` · botón/chip `999px` (pill) · modal `24px`.
- **Espaciado (base 4):** 4 · 8 · 12 · 16 · 24 · 32 · 48. Margen lateral de pantalla: 16px.
- **Bordes:** 1px `--color-border`. Preferir bordes a sombras.
- **Sombra:** solo en modal/hoja inferior y toast: `0 8px 24px rgba(92,18,32,0.12)`.
- **Área táctil mínima:** 44×44px.

### 3.5 Iconografía

Línea (outline), trazo 1.75–2px, esquinas redondeadas — p. ej. **Lucide** o **Tabler**. Tamaño 20px (24px en acciones principales). Color heredado del texto.

---

## 4. Temática: acentos aguayo

El **aguayo** es el tejido andino de franjas y rombos geométricos. Se usa como **acento**, nunca como fondo de contenido.

**Dónde sí:**
- Franja fina (8–12px) en la parte superior del inicio y de la sala.
- Marco o borde decorativo del **código de sala**.
- **Pantalla de revelación** y estado final de resultados (celebración): aquí puede ser más protagonista.
- Ilustraciones de estados vacíos.

**Dónde no:** detrás de texto, en formularios, en tarjetas de lista, en botones.

**Paleta del patrón:** `vino-700`, `vino-500`, `oro-500`, `rosa-100`, `crema-50` (+ opcional un verde `#2E6B4F` solo dentro del patrón). Geometría: rombos, triángulos escalonados, franjas horizontales. Vectorial y simple (debe verse bien a 8px de alto).

---

## 5. Componentes

Cada uno con estados: **reposo, hover/pressed, foco (anillo 2px `vino-500`), deshabilitado, cargando** cuando aplique.

| Componente | Variantes / notas |
|---|---|
| **Botón** | Primario (vino relleno) · Secundario (borde vino) · Texto (vino sin borde) · Peligro (rojo). Ancho completo en móvil. Estado cargando con spinner + texto ("Creando…") |
| **Campo de texto** | Etiqueta arriba, ayuda/error abajo. Error: borde y texto `--color-danger` |
| **Campo de código** | 6 casillas o un campo mono grande; normaliza a mayúsculas; pegar desde portapapeles |
| **Selector de fecha de inicio** | Mes/año (o día si la frecuencia es semanal/quincenal); no permite fechas pasadas |
| **Selector de frecuencia** | Segmentado: Semanal · Quincenal · Mensual |
| **Campo de monto** | Prefijo "Bs", teclado numérico |
| **Tarjeta de sala** | Nombre, código, nº participantes, chip de estado, rol |
| **Fila de participante** | Avatar con iniciales, nombre, chips "Anfitrión"/"Tú", acción eliminar (solo anfitrión) |
| **Fila de turno** | Posición, nombre, fecha, monto a recibir; variante destacada (fila propia, `accent-soft`) |
| **Fila arrastrable** | Asa de arrastre, estado "levantado" al arrastrar |
| **Chip de estado** | En espera (warning) · Sorteada (success) · Cancelada (neutro) · Anfitrión (rosa) · Tú (borde) |
| **Bloque de código de sala** | Código grande mono + "Copiar código" + "Compartir link" (share nativo en móvil) |
| **Banner de error** | Único estilo para toda la app, con acción opcional ("Reintentar") |
| **Toast** | Confirmaciones breves arriba a la derecha, con barra decreciente y cierre a los 5 segundos; pausa con foco o puntero (ajuste del 11-11-2026) |
| **Indicador "Reconectando…"** | Chip discreto arriba, no bloquea |
| **Modal / hoja inferior** | Confirmaciones (cancelar sala, eliminar participante, confirmar sorteo) y nombre de perfil |
| **Menú ⋯** | Acciones secundarias de la sala (cancelar sala) |
| **Estado vacío** | Ilustración simple con acento aguayo + texto + acción |
| **Carga** | Skeletons para listas; spinner en botones |

---

## 6. Pantallas

Rutas: `/` · `/new` · `/join` · `/room/:code`. Todas a 360px de ancho.

### 6.1 Nombre de perfil (primer uso)
Modal/hoja que bloquea hasta ingresar nombre (1–50 caracteres). "¿Cómo te llamas? Así te verán en las salas." → **Continuar**.

### 6.2 Inicio `/`
- Cabecera: franja aguayo, saludo "Hola, {nombre}", acceso a editar nombre.
- Acción primaria **Crear sala**; secundaria **Unirme con código**.
- **Tus salas**: tarjetas (nombre, código, rol, estado). Estado vacío si no hay.
- Pie: **Vincular cuenta de Google** (si anónimo) o el correo vinculado.
- Estados: error al iniciar sesión (banner + reintentar), mensaje al volver de una sala cancelada o de una expulsión.

### 6.3 Crear sala `/new`
Campos: **Nombre de la sala** (obligatorio) · **Cuota por persona (Bs)** · **Frecuencia** · **Fecha de inicio** · **Máx. participantes** (por defecto 30). Resumen en vivo: "Cada turno recibe Bs {cuota × participantes}".
Tras crear → pantalla/estado "Sala lista" con bloque de código + compartir, y botón **Ir a la sala**.

### 6.4 Unirse `/join` y pre-unión desde link
- `/join`: campo de código → buscar.
- **Pre-unión** (al abrir un link o tras buscar): tarjeta con nombre de sala, anfitrión, nº participantes, cuota, frecuencia y fecha de inicio. "Entrarás como {nombre}". → **Unirme**.
- Errores: sala no encontrada · sorteo ya realizado · sala cancelada · sala llena.

### 6.5 Lobby `/room/:code` (estado *en espera*)
- Título con nombre de sala + menú ⋯ (solo anfitrión: **Cancelar sala**).
- Bloque de código + compartir.
- Resumen: cuota, frecuencia, inicio.
- **Participantes (n/máx)** en tiempo real (animación sutil al entrar alguien).
- **Variante anfitrión:** eliminar participante (con confirmación) y botón primario **Sortear orden** (deshabilitado con explicación si hay < 2).
- **Variante participante:** sin controles; texto "Esperando a que {anfitrión} haga el sorteo".

### 6.6 Borrador del sorteo (solo anfitrión)
- Aviso: "Solo tú ves este borrador".
- Lista arrastrable: posición, nombre, fecha que le toca.
- **Volver a sortear** (secundario) y **Confirmar y anunciar** (primario) → modal de confirmación ("Todos verán el resultado. No se puede deshacer.").
- Estado de error al confirmar (banner, el borrador se conserva).

### 6.7 Revelación (todos los conectados)
- Momento protagonista: aguayo más visible, revela **una posición a la vez** (1 → N) con pausa breve.
- Tarjeta grande: posición, nombre, fecha. Debajo, las ya reveladas.
- Botón **Saltar**. Al terminar, celebración breve → resultados.
- Respetar `prefers-reduced-motion` (transición simple sin animación).

### 6.8 Resultados (estado *sorteada*)
- Nombre de sala, código, resumen (cuota, frecuencia, total por turno).
- Lista de turnos: posición, nombre, fecha, monto; **fila propia destacada**.
- Destacar "Tu turno: {fecha}" arriba.
- **Copiar resultados** (texto plano) y **Compartir**.

### 6.9 Estados transversales
Sala no encontrada · Sala cancelada (redirige a inicio con mensaje) · Te eliminaron de la sala · Reconectando · Cargando (skeletons) · Sin conexión.

---

## 7. Tono y textos

- Tuteo, frases cortas, verbo primero en botones ("Crear sala", "Copiar link").
- Sin "por favor", sin signos de exclamación en mensajes del sistema, sin "exitosamente".
- Errores: qué pasó + qué hacer. Ej.: "Ese código no existe. Revísalo e intenta de nuevo."
- Fechas: "Enero 2027" (mensual), "15 ene 2027" (semanal/quincenal). Montos: "Bs 200".

---

## 8. Accesibilidad

- Contraste AA, foco visible en todo elemento interactivo.
- El arrastre del borrador debe tener alternativa (botones subir/bajar).
- La revelación no depende solo del movimiento; anunciar cada posición a lectores de pantalla.
- No usar solo color para estados (chips con texto).

---

## 9. Qué esperamos de Claude Design

1. Hoja del sistema de diseño: paleta, tipografía, espaciado, radios, iconos, patrón aguayo (2–3 variantes de franja).
2. Librería de componentes de §5 con sus estados.
3. Las pantallas de §6 a 360px, incluidas las variantes anfitrión/participante y los estados de error/vacío/carga.
4. Prototipo del flujo principal: crear → compartir → lobby → borrador → revelación → resultados.

**Fuera de alcance:** registro de pagos/aportes realizados, chat, notificaciones push, panel multi-sala tipo dashboard, modo oscuro (solo tokens).
