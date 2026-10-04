Campo de texto con etiqueta, ayuda y mensaje de error accesibles.

**Cuándo:** formularios (crear grupo, nuevo partido, perfil de jugador, cargar stats).

**Qué provee quien lo usa:** `label`, opcionalmente `hint` y `error`, y los atributos de `<input>` (`value`, `onChange`, `type`, `inputMode="numeric"` para goles, etc.).

**Reglas**
- La etiqueta siempre visible; el placeholder es un ejemplo, no la etiqueta.
- El error dice qué hacer: "Las asistencias no pueden superar los goles."
- Alto `tap-min`, borde `input` (≥3:1), foco con `ring`.
