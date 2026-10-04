# Decisiones

Una línea por decisión: qué, por qué.

- Herramientas (Node 24.21 LTS, npm 11, gh 2.102, supabase 2.119, vercel 62.2) instaladas en `~/.local` con checksum verificado y PATH en `~/.zshenv` y `~/.bashrc`: no hay sudo sin contraseña y el usuario pidió instalar todo.
- Docker lo instala el usuario; si la sesión no tiene el grupo docker activo, los comandos de supabase van con `sg docker -c`: así no hace falta reiniciar la sesión.
- Supabase de producción: proyecto nuevo "picado" en la org "FalconPeek dev", creado recién en el gate de producción con OK; el único proyecto que existe (AgroNexo) es otra app.
- Vercel: cuenta personal (sin equipos); el proyecto se crea en el gate de producción.
- Auth con email y contraseña sin confirmación de email (local y prod): el SMTP por defecto de Supabase solo manda a miembros del equipo; recuperar contraseña queda fuera del MVP.
- Estructura con `src/` (default de yolo-session); `globals.css` y `layout.tsx` viven en `src/app/` y CLAUDE.md se ajusta en el setup.
- Rutas en español y agrupadas por grupo: `/g/[gid]/partidos`, `/g/[gid]/torneos/[tid]`, etc., porque todo pasa dentro de un grupo.
- Las mutaciones de membresías, asistencia, equipos, resultados, votos y fixtures van por RPC security definer con códigos de error; esas tablas no tienen políticas de escritura. Así cada regla de negocio se verifica en la base y se prueba con un test de RLS.
- Grants por columna en matches, groups, profiles, tournaments y tournament_teams para que un update directo no saltee las RPC.
- Resultados de picados los carga el organizador (creador del partido o admin del grupo); sin doble reporte ni disputas.
- MVP: votan los que jugaron, 72 h, un voto final, anónimo; empate = todos los empatados son MVP. Los totales solo se ven al cerrar.
- Cartas por grupo (cada grupo califica distinto); valores 1–99; stats y OVR ocultos con menos de 3 calificadores para que nadie deduzca un voto individual.
- OVR con pesos fijos por grupo de posición (arquero, defensa, medio, ataque), escritos en Reglas de negocio.
- Torneos: participantes = equipos con nombre y color, sin plantel; liga (ida o ida y vuelta) y eliminación directa de 2 a 16 equipos con byes y penales; sin suizo, grupos ni clubes persistentes.
- Etapa `contrato` = todo lo que consumen otras tareas: base, tipos, componentes del sistema, reglas puras y validadores. Así corren en paralelo con la base en la primera oleada.
- Gates por ruta o archivo en las tareas de UI y de lógica para no correr `next build` en paralelo; el build va en T43 y en los e2e.
- Tema oscuro único en el MVP; los tokens del claro quedan en globals.css para después.
- shadcn inicializado con base Radix y preset nova (estilo radix-nova): es la variante que más conocen los agentes; el init apuntó por error a design-system/globals.css, se restauró y components.json usa src/app/globals.css.
- `cn` del paquete oficial `cn` (shadcn-ui) configurado en src/lib/utils.ts con los tokens propios (text-body, rounded-card, shadow-card, h-tap, pb-nav) y todos los componentes de ui lo importan de ahí, para que el merge de clases no pise tamaños de texto con colores.
- Sin @vitejs/plugin-react: choca por peer deps de Babel 8 con shadcn y Vitest compila JSX solo con `"jsx": "react-jsx"` del tsconfig.
- @types/node 24 (Node 24 LTS instalado) porque Vitest 5 pide ≥ 22.
- Toaster de sonner con tema fijo "dark" y sin next-themes: el MVP tiene un solo tema.
- vote_mvp y get_match_mvp_summary devuelven NOT_ALLOWED a quien no es miembro del grupo (NOT_ELIGIBLE queda para miembros que no jugaron); un partido inexistente y uno ajeno dan el mismo error para no revelar ids.
- Las helpers y el trigger de core se revocan de anon y las políticas son `to authenticated` (corregido por el director sobre la entrega de T1 para cumplir el plan).
- Server actions: reciben un objeto tipado (no FormData), validan con los esquemas de src/lib/validators, devuelven ActionResult y no llaman a redirect(); si hay que navegar devuelven `{ redirectTo }` en data y el cliente hace router.push + router.refresh. Así se testean con el cliente mockeado y los formularios usan useActionState o startTransition por igual.
- report_tournament_result con penales `default null` para que los tipos generados los marquen opcionales (ajuste del director sobre T4 antes de las acciones).
- RPC get_invite_preview (security definer, solo con el código) para que /unirse muestre el nombre del grupo antes de unirse sin abrir la RLS de groups.
- El layout del grupo monta solo la barra inferior; cada pantalla trae su AppHeader (el detalle de un partido necesita su propio "volver").
- Regla @next/next/no-html-link-for-pages desactivada: es del Pages Router y su plugin arma una regex inválida con rutas dinámicas que tienen loading.tsx, lo que rompía todo el lint.
- Dos agentes crearon rutas en carpetas con barras invertidas literales (`\(app\)`, `\[gid\]`) por escapar paréntesis y corchetes en la terminal; el director las movió a (app)/g/[gid] y los prompts de frontend ahora piden citar las rutas sin escapar. T43 (routes.test.ts) sirve de red para esto.
- npm audit: braces (todas las versiones, sin parche) entra solo por tooling (CLI de shadcn y eslint-config-next). shadcn pasó a devDependencies y el gate (security/all) falla con vulnerabilidades de producción (`--omit=dev`, hoy 0) y muestra la auditoría completa como información. Queda en los pendientes del PR para revisar cuando haya parche.
- Deploy postergado: Supabase no deja crear el proyecto en "FalconPeek dev" porque otro miembro (owner/admin) ya tiene 2 proyectos gratuitos activos. El usuario eligió no deployar por ahora; el PR queda listo para deployar cuando haya proyecto (organización propia, pausar otro proyecto o plan pago).
