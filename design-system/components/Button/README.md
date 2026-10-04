Botón de acción con cuatro variantes y tres tamaños.

**Cuándo:** cualquier acción. `primary` para la acción principal de la pantalla (una sola: "Reportar resultado", "Votá"), `secondary` para alternativas ("Ver llave"), `ghost` para acciones de bajo peso dentro de tarjetas, `destructive` para acciones irreversibles ("Salir del grupo", "Cancelar partido").

**Qué provee quien lo usa:** el texto (verbo en imperativo con voseo, sentence case), `onClick`, y opcionalmente `variant`, `size`, `block`, `disabled` y cualquier atributo de `<button>`.

**Reglas**
- `md` (44px, `tap-min`) es el default en mobile; `sm` solo en filas densas; `lg` para el CTA al pie de pantalla con `block`.
- Íconos lucide de 20px antes del texto, con `space-2` de separación.
- No pongas dos `primary` juntos; tampoco uses `gold` como color de botón.
