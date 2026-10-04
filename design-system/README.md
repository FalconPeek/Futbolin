Picado es una PWA mobile-first para organizar fútbol real entre amigos: partidos, torneos, cartas estilo FC con atributos votados por los compañeros, rankings y plantillas. El sistema es **deportivo y limpio**: superficies sobrias, un solo verde de cancha para la acción, números grandes y condensados, y el color fuerte reservado para las cartas de jugador.

## Principios

- **Mobile primero.** Diseñá a `screen-base` (375px) y escalá hacia arriba. Margen lateral `space-4`. Todo lo tocable mide al menos `tap-min` (44px).
- **Oscuro por defecto.** El tema `dark` es el principal; `light` es la alternativa. Nunca pongas colores literales: usá siempre los tokens, que cambian solos con el tema.
- **Los números mandan.** Resultados, OVR y stats van en la familia `display` (Barlow Condensed) con números tabulares. El texto de interfaz va en `sans` (Barlow).
- **El color se gana.** La interfaz es casi neutra; `primary` marca la acción principal y el estado activo. Los colores de nivel (`tier-*`) aparecen solo en cartas de jugador.

## Contenido y tono

- Español rioplatense con **voseo**, siempre: "Votá", "Cargá tus estadísticas", "Calificá a tus compañeros", "Unite al grupo".
- Oraciones en minúscula inicial (sentence case) en títulos y botones: "Crear partido", no "Crear Partido".
- Botones con verbo en imperativo y objeto: "Reportar resultado", "Asignar goles", "Cerrar partido ahora".
- Abreviaturas de stats en MAYÚSCULAS y sin punto: RIT, TIR, PAS, REG, DEF, FIS (arqueros: DIV, HAN, KIC, REF, POS, SPD). Posiciones igual: POR, DFC, MC, DC…
- Tablas: PJ, G, E, P, GF, GC, DG, Pts. Forma con letras G / E / P.
- Fechas en formato es-AR y hora de Buenos Aires: "sáb 4 oct · 21:00".
- Sin emoji en la interfaz. Los votos son anónimos: nunca muestres quién votó qué, solo agregados ("12 votos").
- Errores que digan qué pasó y qué hacer: "Los resultados no coinciden. El organizador va a resolver la disputa."

## Color

| Rol | Token | Uso |
|---|---|---|
| Fondo | `background` | Pantalla. |
| Superficie | `card` | Tarjetas, tablas, hojas inferiores. |
| Apagado | `muted` / `secondary` | Filas alternas, chips neutros, botón secundario, hover. |
| Texto | `foreground` | Texto principal en todas las superficies. |
| Texto secundario | `muted-foreground` | Metadatos y ayudas. |
| Acción | `primary` + `primary-foreground` | Botón principal, link, tab activo, victoria. |
| Peligro | `destructive` + `destructive-foreground` | Error, disputa, derrota, acciones destructivas. |
| Destacado | `gold` | MVP, estrellas, insignias, Equipo de la semana. |
| Información | `info` | Estados informativos (programado, en reporte). |
| Bordes | `border` (decorativo), `input` (campos, ≥3:1), `ring` (foco). |

- Un solo botón `primary` por pantalla. El resto, `secondary` o `ghost`.
- `gold` nunca como fondo de botón: es para reconocer, no para accionar.
- Victoria y derrota no se distinguen solo por color: la forma usa letra (G/E/P) y la derrota va **delineada** (borde `destructive`, sin relleno) mientras la victoria va **rellena** (`primary`).
- Clubes: los colores primario/secundario que sube cada club se usan solo en su escudo, punto de color o franja en tablas y llaves; nunca como color de texto ni de botón.

### Niveles de carta

| Nivel | Regla | Fondo | Texto |
|---|---|---|---|
| Bronce | OVR < 65 | `tier-bronze` | `tier-bronze-ink` |
| Plata | OVR 65–74 | `tier-silver` | `tier-silver-ink` |
| Oro | OVR ≥ 75 | `tier-gold` | `tier-gold-ink` |
| Especial | OVR ≥ 85 o MVP del último partido | `tier-special` + borde `tier-special-edge` | `tier-special-ink` |
| Provisional | Menos de 3 raters distintos | `tier-provisional` | `tier-provisional-ink` |

Los colores de nivel son iguales en ambos temas: la carta es un objeto, no parte de la interfaz.

## Tipografía

- Familias: `display` = Barlow Condensed, `sans` = Barlow. Ambas son de Google Fonts: en Next.js cargalas con `next/font/google` (pesos 400, 500, 600, 700) y exponelas como `--font-display` y `--font-sans`.
- Activá números tabulares (`font-variant-numeric: tabular-nums`) en tablas, marcadores y stats.
- Escala: `score` (resultado), `display` (títulos grandes), `ovr` y `stat` (carta), `label-caps` (posiciones, encabezados de tabla, secciones, siempre en mayúsculas con `0.08em` de tracking); en texto: `title-lg` (título de pantalla), `title` (título de tarjeta), `body`, `body-strong`, `small`, `caption`.
- Mínimo 13px (`small`) para cualquier texto que haya que leer; `caption` (11px) solo para conteos y leyendas.

## Espaciado, radios y elevación

- Grilla de 4px: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-12` 48.
- Padding de tarjeta `space-4`; separación entre secciones `space-6`.
- Radios: `radius-sm` badges y chips, `radius-md` botones e inputs, `radius-lg` tarjetas y tablas, `radius-card` la carta FUT, `radius-full` avatares, escudos y PlayStyles.
- Sombras: `shadow-sm` para tarjetas en reposo, `shadow-card` solo para la carta de jugador y hojas inferiores. Preferí bordes (`border`) antes que sombras para separar.

## Estados e interacción

- Foco: anillo sólido de 2px en `ring` con 2px de separación (`outline-offset`), visible en todo elemento interactivo.
- Hover/presionado: fondo `accent`; en botones `primary`, oscurecer con `filter: brightness(0.92)`.
- Deshabilitado: opacidad 0.5 y sin cursor; el texto sigue presente.
- Movimiento: transiciones de 150 ms `ease-out` en color y transformación; nada de animaciones decorativas. Respetá `prefers-reduced-motion`.

## Layout

- Navegación inferior fija de `nav-height` (64px) más el safe-area del dispositivo; dejá ese espacio al final del contenido.
- Tablas anchas (posiciones, rankings): scroll horizontal con la columna de nombre fija.
- Una columna en mobile; en pantallas anchas, contenido centrado con ancho máximo de 480–640px para pantallas de flujo, más ancho solo para llaves de torneo.

## Iconografía

No hay set propio ni logo todavía. Usá **lucide-react** (el que trae shadcn/ui) a 20px, trazo 2, en `currentColor`. Sin emoji como íconos. Mientras no haya logo, el nombre "Picado" se escribe en `display` 700.

## Componentes

`Button`, `Input`, `Badge`, `Card`, `FormBadge`, `PlayerCard` y `StandingsTable`. Cada uno tiene su guía en `components/<Componente>/README.md`. En la app se recrean con shadcn/ui + Tailwind 4 usando estos mismos tokens (los nombres de color coinciden con las variables de shadcn).
