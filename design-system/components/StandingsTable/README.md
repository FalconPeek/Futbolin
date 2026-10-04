Tabla de posiciones para ligas, fases de grupos y suizo, con forma y Buchholz opcionales.

**Cuándo:** `/torneos/[tid]/tabla` y rankings tipo liga.

**Qué provee quien lo usa:** `rows` ya ordenadas según los desempates del torneo (PJ, G, E, P, GF, GC, Pts; DG se calcula), y opcionalmente `color` del club por fila, `buchholz`, `form`, `qualify` (cuántos clasifican), `teamLabel` ("Jugador" en torneos individuales) y `caption` ("Grupo A").

**Reglas**
- En mobile la tabla scrollea horizontal con la columna de nombre fija.
- Los que clasifican marcan su posición en `primary` y la línea de corte va en `primary`.
- Números tabulares; Pts en negrita.
