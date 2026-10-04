---
plan: picado-mvp
origen: yolo-plan
estado_plan: aprobado
rama: yolo/picado-mvp
creado: 2026-10-04
---

# Plan: Picado MVP — grupos, partidos, cartas votadas, ranking y torneos

## Objetivo
Una PWA mobile-first en español rioplatense donde un grupo de amigos se registra con email y contraseña, arma su grupo con un link de invitación, organiza picados (convocatoria, equipos, resultado, goles, asistencias y MVP), se califica entre compañeros para tener su carta estilo FC, ve el ranking del grupo y juega torneos de liga o eliminación directa con tabla y llave. Todo con el design system de `design-system/`, RLS en cada tabla y deployable en Vercel + Supabase.

## Alcance MVP
### Entra
- Cuenta: registro, ingreso y salida con email y contraseña; perfil con nombre, apodo y posición principal.
- Grupos: crear, link de invitación, unirse con el link, ver miembros, salir, el admin quita miembros y nombra admins; un usuario puede estar en varios grupos.
- Picados: crear partido (fecha, lugar, jugadores por equipo), confirmar o darse de baja, armar equipos a mano o con "Armar parejo" por OVR, cargar resultado con goles y asistencias por jugador, cancelar.
- MVP: votan los que jugaron, durante 72 h, voto anónimo; empate = todos los empatados son MVP.
- Cartas: cada miembro califica a sus compañeros del grupo en los 6 stats (campo o arquero, 1–99); la carta muestra promedios y OVR por posición; provisional (gris, sin stats ni OVR) hasta 3 calificadores distintos.
- Ranking del grupo: tabla de jugadores (PJ, G, E, P, GF, GC, DG, Pts, forma) y goleadores/asistidores/MVPs.
- Torneos: liga (ida o ida y vuelta) y eliminación directa (con byes y penales), equipos con nombre y color, fixture generado, carga de resultados por el organizador, tabla de posiciones, llave y campeón.
- PWA instalable: manifest, íconos, service worker con página sin conexión.

### No entra
- Recuperar contraseña, confirmación de email, login social y SMTP propio.
- Fotos de perfil y subida de archivos (la carta muestra iniciales); PlayStyles.
- Doble reporte de resultado y disputas; resultados los carga el organizador.
- Torneos suizos, fase de grupos, clubes persistentes con escudo, plantel por equipo de torneo, goleadores de torneo.
- Notificaciones push, imagen compartible de la carta, Equipo de la semana, chat o feed.
- Borrar grupos o cuentas, lista de espera en partidos, invitados que no son miembros.
- Tema claro con selector (el tema oscuro es el único en el MVP; los tokens del claro quedan listos).

## Respuestas del arranque
- ¿Esfuerzo máximo? → Sí.
- ¿Qué entra en el MVP? → Núcleo + torneos (liga y eliminación directa con tabla y llave).
- ¿Docker para Supabase local? → Lo instala el usuario (apt + grupo docker). Supabase corre entero en local.
- ¿Login? → Email y contraseña.
- Entorno → Node 24 LTS, gh, Supabase CLI y Vercel CLI instalados en `~/.local` durante el arranque.

## Modelo de datos
Enums de Postgres (aparecen como uniones en `database.types.ts`): `member_role` ('admin','member') · `player_position` ('POR','LI','DFC','LD','CAI','CAD','MCD','MC','MCO','MI','MD','EI','ED','SD','DC') · `match_status` ('programado','finalizado','cancelado') · `attendance_status` ('confirmado','baja') · `team_side` ('A','B') · `rating_kind` ('campo','arquero') · `tournament_format` ('liga','eliminacion') · `tournament_status` ('borrador','en_curso','finalizado') · `tmatch_status` ('pendiente','jugado').

Todas las tablas en `public` con `enable row level security`. "Sin política" = la operación está negada y solo se hace vía la RPC indicada (ver Reglas de negocio). Las condiciones usan los helpers `is_group_member`, `is_group_admin`, `shares_group`, `match_group_id`, `is_match_organizer`, `tournament_group_id`, `is_tournament_organizer`.

### profiles
- columnas: id uuid [pk, fk→auth.users on delete cascade], display_name text not null [check 2–40 caracteres], nickname text null [check ≤ 20], position player_position not null [default 'MC'], created_at timestamptz [default now()]
- RLS: select id = auth.uid() or shares_group(id); insert sin política (lo crea el trigger handle_new_user); update id = auth.uid() (grant de update solo en display_name, nickname, position); delete sin política

### groups
- columnas: id uuid [pk default gen_random_uuid()], name text not null [check 2–40], invite_code text not null [unique, default generate_invite_code()], created_by uuid [fk→profiles, default auth.uid()], created_at timestamptz [default now()]
- RLS: select is_group_member(id); insert sin política (RPC create_group); update is_group_admin(id) (grant de update solo en name); delete sin política

### group_members
- columnas: group_id uuid [fk→groups on delete cascade], user_id uuid [fk→profiles on delete cascade], role member_role not null [default 'member'], joined_at timestamptz [default now()]; pk (group_id, user_id); índice en user_id
- RLS: select is_group_member(group_id); insert sin política (RPC create_group / join_group); update sin política (RPC set_member_role); delete sin política (RPC leave_group / remove_member)

### matches
- columnas: id uuid [pk], group_id uuid [fk→groups on delete cascade], scheduled_at timestamptz not null, location text not null [check 2–80], players_per_team smallint not null [default 5, check 3–11], status match_status not null [default 'programado'], score_a smallint null [check 0–99], score_b smallint null [check 0–99], created_by uuid [fk→profiles, default auth.uid()], finalized_at timestamptz null, created_at timestamptz [default now()]; índice (group_id, scheduled_at)
- RLS: select is_group_member(group_id); insert with check is_group_member(group_id) and created_by = auth.uid() and status = 'programado' and score_a is null and score_b is null and finalized_at is null; update using is_match_organizer(id) and status = 'programado' with check status in ('programado','cancelado') (grant de update solo en scheduled_at, location, players_per_team, status); delete using is_match_organizer(id) and status = 'programado'

### match_players
- columnas: match_id uuid [fk→matches on delete cascade], user_id uuid [fk→profiles on delete cascade], attendance attendance_status not null [default 'confirmado'], team team_side null, goals smallint not null [default 0, check ≥ 0], assists smallint not null [default 0, check ≥ 0], created_at timestamptz [default now()]; pk (match_id, user_id); índice en user_id
- RLS: select is_group_member(match_group_id(match_id)); insert sin política (RPC set_attendance); update sin política (RPC set_attendance / assign_teams / finalize_match); delete sin política

### mvp_votes
- columnas: match_id uuid [fk→matches on delete cascade], voter_id uuid [fk→profiles on delete cascade, default auth.uid()], voted_id uuid [fk→profiles on delete cascade], created_at timestamptz [default now()]; pk (match_id, voter_id)
- RLS: select voter_id = auth.uid() (el voto es anónimo: nadie lee votos ajenos; los totales salen de get_match_mvp_summary); insert sin política (RPC vote_mvp); update sin política; delete sin política

### player_ratings
- columnas: group_id uuid [fk→groups on delete cascade], rater_id uuid [fk→profiles on delete cascade, default auth.uid()], rated_id uuid [fk→profiles on delete cascade], kind rating_kind not null, s1..s6 smallint not null [check 1–99 cada uno], updated_at timestamptz [default now()]; pk (group_id, rater_id, rated_id); índice (group_id, rated_id)
- RLS: select rater_id = auth.uid(); insert with check rater_id = auth.uid() and rater_id <> rated_id and is_group_member(group_id) and rated_id es miembro de group_id and kind = rating_kind_for(rated_id); update using rater_id = auth.uid() with check (la misma del insert); delete using rater_id = auth.uid()

### tournaments
- columnas: id uuid [pk], group_id uuid [fk→groups on delete cascade], name text not null [check 2–60], format tournament_format not null, legs smallint not null [default 1, check in (1,2)], status tournament_status not null [default 'borrador'], created_by uuid [fk→profiles, default auth.uid()], created_at timestamptz [default now()]; índice en group_id
- RLS: select is_group_member(group_id); insert with check is_group_member(group_id) and created_by = auth.uid() and status = 'borrador'; update using is_tournament_organizer(id) (grant de update solo en name); delete using is_tournament_organizer(id) and status = 'borrador'

### tournament_teams
- columnas: id uuid [pk], tournament_id uuid [fk→tournaments on delete cascade], name text not null [check 1–30], color text not null [check ~ '^#[0-9a-fA-F]{6}$'], created_at timestamptz [default now()]; unique (tournament_id, name); trigger before insert que rechaza el equipo 17 con TOO_MANY_TEAMS
- RLS: select is_group_member(tournament_group_id(tournament_id)); insert with check is_tournament_organizer(tournament_id) and el torneo está en 'borrador'; update using is_tournament_organizer(tournament_id) (grant de update solo en name, color); delete using is_tournament_organizer(tournament_id) and el torneo está en 'borrador'

### tournament_matches
- columnas: id uuid [pk], tournament_id uuid [fk→tournaments on delete cascade], round smallint not null [check ≥ 1], slot smallint not null [check ≥ 0], home_team_id uuid null [fk→tournament_teams on delete cascade], away_team_id uuid null [fk→tournament_teams on delete cascade], home_score smallint null [check 0–99], away_score smallint null [check 0–99], home_pens smallint null [check ≥ 0], away_pens smallint null [check ≥ 0], status tmatch_status not null [default 'pendiente'], created_at timestamptz [default now()]; unique (tournament_id, round, slot)
- RLS: select is_group_member(tournament_group_id(tournament_id)); insert sin política (RPC start_tournament); update sin política (RPC report_tournament_result); delete sin política

## Reglas de negocio
Fuente exacta para las tareas. Si una regla no está acá, la decide el director y la anota en `.yolo/decisions.md`.

### Convenciones SQL
- Una migración por tarea de contrato, en este orden: `20261004000100_core.sql`, `20261004000200_matches.sql`, `20261004000300_ratings.sql`, `20261004000400_tournaments.sql`.
- Helpers y RPC: `security definer`, `set search_path = ''`, nombres calificados (`public.groups`, `auth.uid()`, `extensions.gen_random_bytes`), `revoke execute ... from public, anon` y `grant execute ... to authenticated`. Toda RPC empieza verificando `auth.uid() is not null`.
- Los errores de negocio se lanzan con `raise exception '<CODIGO>'` usando estos códigos: `NOT_ALLOWED`, `INVALID_INPUT`, `INVALID_CODE`, `LAST_ADMIN`, `MATCH_FULL`, `MATCH_CLOSED`, `INVALID_RESULT`, `VOTING_CLOSED`, `NOT_ELIGIBLE`, `ALREADY_VOTED`, `NOT_ENOUGH_TEAMS`, `TOO_MANY_TEAMS`, `TOURNAMENT_NOT_DRAFT`, `TOURNAMENT_NOT_RUNNING`, `PENALTIES_REQUIRED`, `NEXT_PLAYED`.
- Para revocar columnas: `revoke update on <tabla> from authenticated, anon;` y `grant update (<columnas>) on <tabla> to authenticated;`.

### Helpers (T1, T2 y T4)
- `is_group_member(gid uuid) → boolean`: existe fila en group_members con group_id = gid y user_id = auth.uid().
- `is_group_admin(gid uuid) → boolean`: lo mismo con role = 'admin'.
- `shares_group(uid uuid) → boolean`: auth.uid() y uid comparten al menos un grupo.
- `generate_invite_code() → text`: 8 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` con `extensions.gen_random_bytes`.
- `handle_new_user()` (trigger after insert on auth.users): crea profiles con display_name = `raw_user_meta_data->>'display_name'` recortado a 40; si queda vacío o con menos de 2 caracteres, `'Jugador'`.
- T2: `match_group_id(mid uuid) → uuid`; `is_match_organizer(mid uuid) → boolean` = el partido lo creó auth.uid() o auth.uid() es admin de su grupo.
- T3: `rating_kind_for(uid uuid) → rating_kind` = 'arquero' si profiles.position = 'POR', si no 'campo'.
- T4: `tournament_group_id(tid uuid) → uuid`; `is_tournament_organizer(tid uuid) → boolean` = lo creó auth.uid() o es admin de su grupo.

### RPC de grupos (T1)
- `create_group(p_name text) → uuid`: valida 2–40 caracteres (`INVALID_INPUT`), inserta el grupo y al creador como 'admin'.
- `join_group(p_code text) → uuid`: busca por invite_code sin distinguir mayúsculas; si no existe `INVALID_CODE`; si ya es miembro devuelve el id sin error; si no, lo agrega como 'member'.
- `leave_group(p_group_id uuid) → void`: si no es miembro `NOT_ALLOWED`; si es el único admin y quedan otros miembros `LAST_ADMIN`; borra su membresía; si el grupo queda sin miembros, borra el grupo.
- `remove_member(p_group_id uuid, p_user_id uuid) → void`: solo admin, no a sí mismo (`NOT_ALLOWED`).
- `set_member_role(p_group_id uuid, p_user_id uuid, p_role member_role) → void`: solo admin; degradar al último admin da `LAST_ADMIN`.
- `get_invite_preview(p_code text) → table(group_id, name, member_count, is_member)`: para usuarios logueados con el código; código inexistente → sin filas. Agregada por el director para que /unirse muestre el nombre del grupo antes de unirse.

### RPC de partidos y MVP (T2)
- `set_attendance(p_match_id uuid, p_status attendance_status) → void`: miembro del grupo, partido 'programado' (si no `MATCH_CLOSED`); upsert de su fila; al confirmar, si ya hay 2 × players_per_team confirmados `MATCH_FULL`; al darse de baja, team pasa a null.
- `assign_teams(p_match_id uuid, p_assignments jsonb) → void`: `[{user_id, team: 'A'|'B'|null}]`; solo organizador; partido 'programado'; cada user_id tiene que estar 'confirmado' (si no `INVALID_INPUT`).
- `finalize_match(p_match_id uuid, p_score_a int, p_score_b int, p_stats jsonb) → void`: `[{user_id, goals, assists}]`; solo organizador; partido 'programado'; al menos un jugador en cada equipo; cada user_id de stats tiene equipo; por equipo, suma de goles ≤ goles del equipo y suma de asistencias ≤ goles del equipo (si no `INVALID_RESULT`); guarda goles, asistencias, score, status 'finalizado' y finalized_at = now().
- `vote_mvp(p_match_id uuid, p_voted_id uuid) → void`: partido 'finalizado' y now() < finalized_at + 72 h (si no `VOTING_CLOSED`); votante y votado jugaron (fila con team no null y 'confirmado') y son distintos (si no `NOT_ELIGIBLE`); un voto por partido (`ALREADY_VOTED`).
- `get_match_mvp_summary(p_match_id uuid) → table(eligible int, votes_cast int, closed boolean, mvp_ids uuid[], my_vote uuid)`: solo miembros; eligible = jugadores con equipo; closed = pasaron 72 h o votes_cast = eligible; mvp_ids = todos los empatados con más votos, solo si closed y hubo votos (si no, array vacío); my_vote = voto de auth.uid() o null.

### Cartas (T3, T7, T10, T32)
- `get_group_cards(p_group_id uuid) → table(user_id, display_name, nickname, position, kind, raters int, s1..s6 int)`: solo miembros (si no, `NOT_ALLOWED`); una fila por miembro; raters = calificaciones de ese grupo con kind = rating_kind_for(user_id); s1..s6 = round(avg) solo si raters ≥ 3, si no null (así nadie deduce un voto individual).
- Orden de stats: campo s1..s6 = RIT, TIR, PAS, REG, DEF, FIS; arquero s1..s6 = DIV, HAN, KIC, REF, POS, SPD.
- Grupos de posición: arquero POR; defensa LI, DFC, LD, CAI, CAD; medio MCD, MC, MCO, MI, MD; ataque EI, ED, SD, DC.
- OVR = round(Σ peso × stat), acotado a 1–99. Pesos (s1..s6): arquero .22 .22 .10 .22 .20 .04 · defensa .15 .03 .12 .10 .40 .20 · medio .12 .14 .30 .24 .10 .10 · ataque .22 .32 .10 .22 .02 .12.
- Nivel (lo calcula PlayerCard si no viene `tier`): provisional (menos de 3 calificadores) > special (OVR ≥ 85 o MVP del último partido finalizado y cerrado del grupo) > gold (≥ 75) > silver (≥ 65) > bronze.
- Nombre en la carta: apodo si existe, si no display_name.

### Armar parejo (T11)
- Entrada: jugadores `{id, ovr: number | null, position}`; OVR null cuenta como 60.
- Si hay 2 o más POR, los dos de mayor OVR van uno a cada equipo (el mejor al A).
- El resto, ordenado por OVR desc (empate por id asc), va de a uno al equipo con menor suma de OVR entre los que tienen menos de ceil(n/2) jugadores (empate de suma → A).
- Salida `{A: string[], B: string[]}`, tamaños con diferencia ≤ 1, determinista.

### Tabla de jugadores (T12)
- Solo partidos 'finalizado' y jugadores con equipo. Por jugador: pj, g, e, p, gf (goles de su equipo), gc (goles en contra), pts = 3g + e, goals, assists, mvps (veces en mvp_ids), form = últimos 5 resultados G/E/P en orden cronológico, el más reciente al final.
- Orden: pts desc, DG desc, gf desc, goals desc, nombre asc (`localeCompare` es-AR). Devuelve filas compatibles con `StandingsRow`.

### Fixture y llave (T13)
- `roundRobin(teamIds, legs)`: método del círculo; con cantidad impar se agrega un bye y esos cruces no se generan; rondas 1..n-1 (o 1..n con impar); slot = índice dentro de la ronda; con legs = 2 se repite todo con local y visitante invertidos y rondas que siguen la numeración.
- `bracket(teamIds)`: 2 a 16 equipos; size = potencia de 2 ≥ n; rounds = log2(size). Ronda 1, slot s (0..size/2-1): local = seed s, visitante = seed size-1-s (seed = índice en teamIds; seed ≥ n = bye). Los cruces con bye no generan fila: el equipo pasa directo a la ronda 2, slot floor(s/2), como local si s es par y visitante si es impar. Se generan todas las filas de las rondas 2..rounds con equipos null salvo los que llegan por bye.
- Avance (lo aplica report_tournament_result): el ganador del partido (ronda r, slot s) va a (r+1, floor(s/2)), local si s es par, visitante si es impar.
- Nombres de ronda: liga "Fecha N"; eliminación, desde la última: "Final", "Semifinal", "Cuartos de final", "Octavos de final", si no "Ronda N".

### RPC de torneos (T4)
- `start_tournament(p_tournament_id uuid, p_fixtures jsonb) → void`: `[{round, slot, home_team_id, away_team_id}]`; solo organizador; status 'borrador' (si no `TOURNAMENT_NOT_DRAFT`); al menos 2 equipos (si no `NOT_ENOUGH_TEAMS`); todo team_id no null pertenece al torneo (si no `INVALID_INPUT`); inserta las filas y pasa el torneo a 'en_curso'.
- `report_tournament_result(p_match_id uuid, p_home int, p_away int, p_home_pens int, p_away_pens int) → void`: solo organizador; torneo 'en_curso' (si no `TOURNAMENT_NOT_RUNNING`); ambos equipos definidos (si no `INVALID_INPUT`); en eliminación con empate los penales son obligatorios y distintos (`PENALTIES_REQUIRED`), sin empate o en liga van null; en eliminación, si el partido siguiente ya está 'jugado' `NEXT_PLAYED`, si no escribe al ganador ahí; marca 'jugado'; cuando todos los partidos del torneo están 'jugado', el torneo pasa a 'finalizado'.
- Tabla de torneo (T14): solo 'jugado'; pts 3/1/0 (los penales no suman); orden pts, DG, gf, nombre; form últimos 5 por ronda. Campeón: liga = primero de la tabla; eliminación = ganador de la final.

### Acciones del servidor (T16, T19–T23)
- Toda acción devuelve `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` (`src/lib/result.ts`), valida con los esquemas de `src/lib/validators/` y nunca devuelve el mensaje crudo de Postgres: `mapDbError` traduce los códigos.
- Mensajes: NOT_ALLOWED "No tenés permiso para hacer esto." · INVALID_INPUT "Revisá los datos e intentá de nuevo." · INVALID_CODE "El link de invitación no es válido. Pedile uno nuevo a un admin del grupo." · LAST_ADMIN "Sos el único admin. Nombrá otro admin antes de salir." · MATCH_FULL "El partido ya está completo." · MATCH_CLOSED "El partido ya no admite cambios." · INVALID_RESULT "El resultado no cierra: revisá goles y asistencias." · VOTING_CLOSED "La votación del MVP ya cerró." · NOT_ELIGIBLE "Solo votan los que jugaron el partido." · ALREADY_VOTED "Ya votaste en este partido." · NOT_ENOUGH_TEAMS "Necesitás al menos 2 equipos para empezar." · TOO_MANY_TEAMS "El torneo admite hasta 16 equipos." · TOURNAMENT_NOT_DRAFT "El torneo ya empezó." · TOURNAMENT_NOT_RUNNING "El torneo no está en curso." · PENALTIES_REQUIRED "En eliminación directa no hay empate: cargá los penales." · NEXT_PLAYED "No se puede cambiar: el partido siguiente ya se jugó." · cualquier otro "Algo salió mal. Probá de nuevo."
- Errores de auth: credenciales inválidas "El email o la contraseña no coinciden."; email ya registrado "Ya hay una cuenta con ese email. Ingresá."
- Después de mutar, `revalidatePath` de la ruta afectada.

### Validadores (T17)
- auth: email válido; contraseña 8–72; display_name 2–40 (solo registro).
- perfil: display_name 2–40; nickname opcional ≤ 20; position ∈ POSITIONS.
- grupo: name 2–40 recortado. Código de invitación: 8 caracteres del alfabeto de generate_invite_code, sin distinguir mayúsculas.
- partido: scheduled_at en el futuro; location 2–80; players_per_team entero 3–11.
- resultado: scores enteros 0–99; stats con goals y assists enteros ≥ 0; por equipo suma de goles ≤ score y suma de asistencias ≤ score, con el mensaje "Las asistencias no pueden superar los goles." o "Los goles de los jugadores superan el resultado.".
- calificación: kind ∈ ('campo','arquero'); s1..s6 enteros 1–99.
- torneo: name 2–60; format ∈ ('liga','eliminacion'); legs ∈ (1,2) y solo 2 si es liga. Equipo: name 1–30; color `#RRGGBB`.
- resultado de torneo: scores 0–99; si es eliminación y hay empate, penales obligatorios y distintos.

### Tests de base (T1–T4)
- `supabase/tests/helpers.ts` (T1) lee `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (los carga el proyecto `db` de Vitest desde `.env.test.local`) y exporta: `admin` (cliente con la secret key), `anon()` (cliente sin sesión) y `newUser(displayName?)` → `{ id, email, client }`, que crea un usuario con email único `t-<uuid>@picado.test` vía admin API (email confirmado) y devuelve un cliente logueado.
- Ningún test resetea la base ni borra datos ajenos: cada test crea sus propios usuarios y grupos.
- Las RPC se prueban con `client.rpc(...)`; los errores se verifican por el código en `error.message`.

### UI (todas las tareas frontend)
- Leé `design-system/README.md`, el README del componente y `design-system/components/index.d.ts` antes de escribir UI; tomá medidas de `design-system/referencia/bundle.css` sin importarlo.
- Solo tokens (`bg-background`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-gold`, `border-input`, `ring-ring`…); `font-display` + `tabular` para números; tocables ≥ `h-tap`; contenido con `pb-nav` cuando hay barra inferior; íconos lucide-react 20px; sin emoji; voseo y sentence case.
- Un solo Button `primary` por pantalla. Formato de fechas con `formatMatchDate` (T15).
- `page.tsx` es Server Component: busca datos con `createClient()` de `src/lib/supabase/server.ts` y se los pasa a componentes de `src/components/<feature>/`; `"use client"` solo donde hay interacción. Los formularios usan `useActionState` con las acciones de `src/actions/` y muestran el error de `ActionResult` debajo del campo o con toast (sonner).
- Cada vista con datos tiene estado vacío (con mensaje y acción), carga (`loading.tsx` con Skeleton) y error (mensaje recuperable).
- Tests con Vitest + Testing Library sobre los componentes de `src/components/`; las acciones se mockean con `vi.mock("@/actions/...")`.
- Rutas con `params` asíncronos (`const { gid } = await params`), como pide Next 16.

## Estructura de carpetas
```text
.yolo/plan.md, decisions.md
scripts/quality_gate.sh                       (setup)
supabase/
  config.toml                                 (setup: confirmaciones de email apagadas)
  migrations/
    20261004000100_core.sql                   T1
    20261004000200_matches.sql                T2
    20261004000300_ratings.sql                T3
    20261004000400_tournaments.sql            T4
  tests/
    helpers.ts, rls_core.test.ts              T1
    rls_matches.test.ts                       T2
    rls_ratings.test.ts                       T3
    rls_tournaments.test.ts                   T4
src/
  proxy.ts                                    T18
  app/
    layout.tsx                                setup, T9, T42
    page.tsx                                  T24
    manifest.ts, icon.tsx, apple-icon.tsx     T41
    offline/page.tsx                          T42
    routes.test.ts                            T43
    (auth)/ingresar/, (auth)/registrarme/     T24
    (app)/layout.tsx, (app)/perfil/           T25
    (app)/grupos/, (app)/grupos/nuevo/, (app)/unirse/[code]/     T26
    (app)/g/[gid]/layout.tsx, (app)/g/[gid]/miembros/            T27
    (app)/g/[gid]/page.tsx                    T40
    (app)/g/[gid]/partidos/ (page, nuevo/)    T28
    (app)/g/[gid]/partidos/[mid]/page.tsx     T29
    (app)/g/[gid]/partidos/[mid]/equipos/     T30
    (app)/g/[gid]/partidos/[mid]/resultado/   T31
    (app)/g/[gid]/cartas/ (page, [uid]/page)  T32
    (app)/g/[gid]/cartas/[uid]/calificar/     T33
    (app)/g/[gid]/ranking/                    T34
    (app)/g/[gid]/torneos/ (page, nuevo/)     T35
    (app)/g/[gid]/torneos/[tid]/equipos/      T36
    (app)/g/[gid]/torneos/[tid]/page.tsx      T38
    (app)/g/[gid]/torneos/[tid]/partidos/[tmid]/   T39
  components/
    ui/            shadcn (setup) · button, input, badge, card ajustados en T6
    picado/        types.ts (setup) · player-card, tier (T7) · standings-table, form-badge (T8)
    layout/        T9
    auth/ T24 · profile/ T25 · groups/ T26, T27, T40 · matches/ T28–T31
    cards/ T32, T33 · ranking/ T34 · tournaments/ T35–T39 · pwa/ T42
  lib/
    database.types.ts, supabase/client.ts, supabase/server.ts    T5
    supabase/proxy.ts, auth/redirect.ts       T18
    cards/positions.ts, cards/ovr.ts          T10
    cards/build-card.ts                       T32
    matches/balance.ts                        T11
    standings/players.ts T12 · standings/teams.ts T14
    tournaments/fixtures.ts, rounds.ts        T13
    format/date.ts T15 · result.ts T16 · validators/ T17
  actions/
    auth.ts, profile.ts T19 · groups.ts T20 · matches.ts T21 · ratings.ts T22 · tournaments.ts T23
public/sw.js                                  T42
tests/e2e/                                    T44, T45
```

## Setup de la Fase 1
Lo hace el director antes de la primera tanda (no es una tarea; el gate vacío tiene que quedar en verde):
1. Herramientas en `~/.local` (Node 24, gh, supabase, vercel). En sesiones que no las ven: `export PATH="$HOME/.local/opt/node/bin:$HOME/.local/bin:$PATH"`, y pasale esa línea a cada subagente en su prompt.
2. Scaffold según CLAUDE.md, con `src/`: `create-next-app` en una carpeta temporal (`--ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`), mover a la raíz sin pisar `CLAUDE.md` ni `design-system/`. En CLAUDE.md cambiar las rutas `app/layout.tsx` y `app/globals.css` por `src/app/...`.
3. `npx shadcn@latest init`, reemplazar `src/app/globals.css` por `design-system/globals.css` conservando los `@import` extra debajo de `@import "tailwindcss";`. Agregar de una vez los componentes que usan las tareas: `npx shadcn@latest add button input label badge card skeleton sonner tabs slider select dialog avatar separator`.
4. Fuentes y `<html lang="es-AR" data-theme="dark">` en `src/app/layout.tsx` como dice CLAUDE.md.
5. Dependencias (ninguna tarea instala paquetes): `@supabase/supabase-js @supabase/ssr zod lucide-react sonner`; dev: `vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test dotenv`; `npx playwright install chromium`.
6. `vitest.config.ts` con dos proyectos: `unit` (jsdom, `src/**/*.test.{ts,tsx}`, setup con jest-dom, alias `@/`) y `db` (node, `supabase/tests/**/*.test.ts`, carga `.env.test.local`, `testTimeout` 30 s, sin paralelismo de archivos).
7. `playwright.config.ts`: `testDir: tests/e2e`, viewport mobile (Pixel 7), `webServer: npm run start` en el puerto 3000 con `reuseExistingServer`.
8. `supabase init`; en `config.toml`: `[auth.email] enable_confirmations = false`, `site_url = "http://localhost:3000"`, `minimum_password_length = 8`. `supabase start` (si `docker info` falla por permisos: `sg docker -c "supabase start"`). Con `supabase status -o env` escribir `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) y `.env.test.local` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`); `.env.example` solo con nombres.
9. Scripts: `lint: eslint .`, `typecheck: tsc --noEmit`, `test: vitest run`, `test:e2e: playwright test`, `build: next build`, `start: next start`, `db:reset: supabase db reset`, `db:types: supabase gen types typescript --local > src/lib/database.types.ts`.
10. Copiar las interfaces de `design-system/components/index.d.ts` a `src/components/picado/types.ts` (solo tipos, exportados) para que T7, T8, T12 y T14 compartan `StandingsRow`, `PlayerCardProps`, etc.
11. `.gitignore`: reglas de `.yolo/`, `.env*.local`, `test-results/`, `playwright-report/`. Carpetas vacías con `.gitkeep`: `supabase/tests`, `src/actions`, `tests/e2e`.
12. Copiar `scripts/quality_gate.sh` y verificar `bash scripts/quality_gate.sh backend` y `frontend` en verde.
13. Next 16: el middleware se llama `src/proxy.ts`; `params`, `searchParams` y `cookies()` son asíncronos. Antes de usar una API que cambia entre versiones, mirá la versión instalada en `node_modules/next` (y su `dist/docs` si existe).

## Tareas

### T1 — Contrato núcleo: perfiles, grupos y membresías
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: supabase/migrations/, supabase/tests/helpers.ts, supabase/tests/rls_core.test.ts
- criterio: `20261004000100_core.sql` crea enums, profiles con trigger handle_new_user, groups, group_members, los helpers y las RPC de grupos como dicen Modelo de datos y Reglas de negocio, y aplica limpio con `npm run db:reset`; rls_core.test.ts prueba que un usuario no ve grupos ni perfiles de otro grupo, que anon no lee nada, que join_group con código válido une y con inválido da INVALID_CODE, que insertar en group_members directo falla y que el único admin no puede salir (LAST_ADMIN)
- tests: supabase/tests/rls_core.test.ts
- gate: supabase/tests/rls_core.test.ts
- estado: hecha

### T2 — Contrato de partidos y MVP
- rol: backend
- etapa: contrato
- depende_de: T1
- archivos: supabase/migrations/, supabase/tests/rls_matches.test.ts
- criterio: `20261004000200_matches.sql` crea matches, match_players, mvp_votes, sus helpers, grants por columna y las RPC set_attendance, assign_teams, finalize_match, vote_mvp y get_match_mvp_summary; rls_matches.test.ts prueba que un no miembro no ve partidos, que un miembro no organizador no puede asignar equipos ni finalizar (NOT_ALLOWED), que finalize_match rechaza asistencias de más (INVALID_RESULT), que no se vota a uno mismo ni dos veces (NOT_ELIGIBLE, ALREADY_VOTED), que nadie lee votos ajenos y que el resumen devuelve los MVP empatados
- tests: supabase/tests/rls_matches.test.ts
- gate: supabase/tests/rls_matches.test.ts
- estado: hecha

### T3 — Contrato de calificaciones y cartas
- rol: backend
- etapa: contrato
- depende_de: T1
- archivos: supabase/migrations/, supabase/tests/rls_ratings.test.ts
- criterio: `20261004000300_ratings.sql` crea player_ratings, rating_kind_for y get_group_cards; rls_ratings.test.ts prueba que nadie se califica a sí mismo ni califica a alguien de otro grupo, que el kind tiene que coincidir con la posición del calificado, que un usuario solo lee sus propias calificaciones y que get_group_cards devuelve stats null con menos de 3 calificadores y el promedio redondeado con 3
- tests: supabase/tests/rls_ratings.test.ts
- gate: supabase/tests/rls_ratings.test.ts
- estado: hecha

### T4 — Contrato de torneos
- rol: backend
- etapa: contrato
- depende_de: T1
- archivos: supabase/migrations/, supabase/tests/rls_tournaments.test.ts
- criterio: `20261004000400_tournaments.sql` crea tournaments, tournament_teams (con límite de 16), tournament_matches, sus helpers y las RPC start_tournament y report_tournament_result; rls_tournaments.test.ts prueba que un no miembro no ve torneos, que un miembro no organizador no puede iniciar ni cargar resultados, que no se agregan equipos con el torneo en curso, que un empate en eliminación sin penales da PENALTIES_REQUIRED, que el ganador avanza al slot correcto de la ronda siguiente y que el torneo queda 'finalizado' al jugarse la final
- tests: supabase/tests/rls_tournaments.test.ts
- gate: supabase/tests/rls_tournaments.test.ts
- estado: hecha

### T5 — Tipos generados y clientes de Supabase
- rol: backend
- etapa: contrato
- depende_de: T2, T3, T4
- archivos: src/lib/database.types.ts, src/lib/supabase/client.ts, src/lib/supabase/server.ts, src/lib/supabase/types.test.ts
- criterio: `npm run db:types` genera database.types.ts con las 10 tablas y los enums, y client.ts (createBrowserClient) y server.ts (createServerClient con `await cookies()`) quedan tipados con `Database`; types.test.ts verifica con `Constants.public.Enums` que player_position tiene 15 valores e incluye 'POR' y que tournament_format incluye 'eliminacion'
- tests: src/lib/supabase/types.test.ts
- gate: src/lib/supabase
- estado: hecha

### T6 — Componentes base: Button, Input, Badge y Card
- rol: frontend
- etapa: contrato
- depende_de: —
- archivos: src/components/ui/button.tsx, src/components/ui/input.tsx, src/components/ui/badge.tsx, src/components/ui/card.tsx, src/components/ui/base.test.tsx
- criterio: los cuatro componentes de shadcn quedan ajustados a sus README e index.d.ts (Button con variantes primary/secondary/ghost/destructive, tamaños sm 36/md 44/lg 52 y block; Input con label, hint y error accesible vía aria-describedby y aria-invalid; Badge con neutral/primary/gold/info/destructive, gold e info delineadas; Card con title, subtitle, action y rounded-lg), usando solo tokens, y base.test.tsx verifica variantes, tamaños y el error del Input
- tests: src/components/ui/base.test.tsx
- gate: src/components/ui
- estado: hecha

### T7 — PlayerCard y niveles de carta
- rol: frontend
- etapa: contrato
- depende_de: —
- archivos: src/components/picado/player-card.tsx, src/components/picado/tier.ts, src/components/picado/player-card.test.tsx
- criterio: PlayerCard sigue su README, `PlayerCardProps` de `src/components/picado/types.ts` y las medidas de `referencia/bundle.css` (tamaños md 200 y sm 148, iniciales sin foto, máximo 3 PlayStyles, etiquetas de arquero con `goalkeeper`, nota "Provisional · faltan votos" y OVR "–" si es provisional, aria-label con nombre, posición, OVR y nivel), y `tierFor` en tier.ts aplica la regla de niveles; player-card.test.tsx cubre los cinco niveles, el modo provisional y las etiquetas de arquero
- tests: src/components/picado/player-card.test.tsx
- gate: src/components/picado/player-card.test.tsx
- estado: hecha

### T8 — StandingsTable y FormBadge
- rol: frontend
- etapa: contrato
- depende_de: —
- archivos: src/components/picado/standings-table.tsx, src/components/picado/form-badge.tsx, src/components/picado/standings-table.test.tsx
- criterio: StandingsTable y FormBadge siguen sus README y `src/components/picado/types.ts` (DG calculada, Pts en negrita, números tabulares, columna de nombre fija con scroll horizontal, línea de corte y posiciones en primary según `qualify`, Buchholz solo si viene, hasta 5 FormBadge con G relleno, E apagado y P delineado); standings-table.test.tsx verifica DG, la marca de clasificados, la columna Buchholz condicional y las letras de forma
- tests: src/components/picado/standings-table.test.tsx
- gate: src/components/picado/standings-table.test.tsx
- estado: hecha

### T9 — Estructura de la app: encabezado, barra inferior y estados
- rol: frontend
- etapa: contrato
- depende_de: —
- archivos: src/components/layout/, src/app/layout.tsx
- criterio: existen AppHeader (título, volver opcional, slot derecho), BottomNav del grupo (Inicio, Partidos, Torneos, Ranking, Cartas con íconos lucide, activo en primary según la ruta, alto h-nav más safe-area), EmptyState, ErrorState y PageSkeleton, y el layout raíz monta el Toaster de sonner; layout.test.tsx verifica los cinco links de BottomNav con el gid, el estado activo y que EmptyState muestra su acción
- tests: src/components/layout/layout.test.tsx
- gate: src/components/layout
- estado: hecha

### T10 — Reglas de cartas: posiciones, etiquetas y OVR
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/cards/positions.ts, src/lib/cards/ovr.ts, src/lib/cards/ovr.test.ts
- criterio: positions.ts exporta POSITIONS (las 15), positionGroup y STAT_LABELS por kind, y ovr.ts exporta computeOvr(position, stats) con los pesos de Reglas de negocio; ovr.test.ts verifica que los pesos de cada grupo suman 1, un caso calculado a mano por grupo y el acotado a 1–99
- tests: src/lib/cards/ovr.test.ts
- gate: src/lib/cards
- estado: hecha

### T11 — Armar equipos parejos
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/matches/balance.ts, src/lib/matches/balance.test.ts
- criterio: balanceTeams aplica la regla de Armar parejo; balance.test.ts verifica tamaños con diferencia ≤ 1, arqueros separados, OVR null como 60, resultado determinista y una diferencia de suma ≤ 10 en un caso de 10 jugadores dado
- tests: src/lib/matches/balance.test.ts
- gate: src/lib/matches
- estado: hecha

### T12 — Tabla de jugadores del grupo
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/standings/players.ts, src/lib/standings/players.test.ts
- criterio: computePlayerStandings aplica la regla de Tabla de jugadores y devuelve filas compatibles con `StandingsRow` más goals, assists y mvps; players.test.ts verifica puntos, GF/GC, la forma con el más reciente al final, el orden por desempates y que ignora partidos no finalizados
- tests: src/lib/standings/players.test.ts
- gate: src/lib/standings/players.test.ts
- estado: hecha

### T13 — Fixture de liga y llave de eliminación
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/tournaments/fixtures.ts, src/lib/tournaments/rounds.ts, src/lib/tournaments/fixtures.test.ts
- criterio: roundRobin, bracket, nextSlot y roundLabel cumplen Fixture y llave; fixtures.test.ts verifica que en liga cada par juega una vez por vuelta y nadie juega dos veces por ronda (4 y 5 equipos, ida y vuelta), que la llave de 3 y 5 equipos ubica los byes en la ronda 2 del lado correcto, que nextSlot respeta la paridad y los nombres "Final", "Semifinal" y "Cuartos de final"
- tests: src/lib/tournaments/fixtures.test.ts
- gate: src/lib/tournaments/fixtures.test.ts
- estado: hecha

### T14 — Tabla de posiciones de torneo
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/standings/teams.ts, src/lib/standings/teams.test.ts
- criterio: computeTeamStandings y tournamentChampion aplican la regla de tabla y campeón de torneo con filas `StandingsRow` (con color); teams.test.ts verifica puntos, que los penales no suman, el orden por desempates, la forma y el campeón de liga y de eliminación por penales
- tests: src/lib/standings/teams.test.ts
- gate: src/lib/standings/teams.test.ts
- estado: hecha

### T15 — Formato de fechas es-AR
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/format/date.ts, src/lib/format/date.test.ts
- criterio: formatMatchDate devuelve "sáb 3 oct · 21:00" (día y mes abreviados, sin puntos, en minúscula) en hora de Buenos Aires y formatShortDate devuelve "3 oct"; date.test.ts verifica que `2026-10-04T00:00:00Z` da "sáb 3 oct · 21:00" y un caso de cambio de mes
- tests: src/lib/format/date.test.ts
- gate: src/lib/format
- estado: hecha

### T16 — Resultado de acciones y mensajes de error
- rol: backend
- etapa: contrato
- depende_de: —
- archivos: src/lib/result.ts, src/lib/result.test.ts
- criterio: result.ts exporta `ActionResult<T>`, `ok()`, `fail()` y `mapDbError(error)` que traduce cada código de Reglas de negocio a su mensaje y cualquier otro error al genérico; result.test.ts verifica todos los códigos, un error desconocido y que nunca devuelve el texto original de Postgres
- tests: src/lib/result.test.ts
- gate: src/lib/result.test.ts
- estado: hecha

### T17 — Validadores compartidos
- rol: backend
- etapa: contrato
- depende_de: T10
- archivos: src/lib/validators/
- criterio: hay un esquema zod por formulario de la sección Validadores (auth, perfil, grupo, código, partido, resultado, calificación, torneo, equipo, resultado de torneo) con mensajes en voseo, y validators.test.ts verifica un caso válido y uno inválido de cada uno, incluido "Las asistencias no pueden superar los goles."
- tests: src/lib/validators/validators.test.ts
- gate: src/lib/validators
- estado: hecha

### T18 — Sesión y rutas protegidas
- rol: backend
- etapa: construccion
- depende_de: T5
- archivos: src/proxy.ts, src/lib/supabase/proxy.ts, src/lib/auth/redirect.ts, src/lib/auth/redirect.test.ts
- criterio: el proxy refresca la sesión con @supabase/ssr y manda a `/ingresar?next=<ruta>` a quien entra sin sesión a una ruta no pública, y redirect.ts exporta isPublicPath (/, /ingresar, /registrarme, /offline y archivos de PWA) y safeNextPath, que solo acepta rutas internas; redirect.test.ts verifica rutas públicas y que safeNextPath rechaza `//evil.com`, `https://evil.com`, `/\evil.com` y vacío (devuelve /grupos)
- tests: src/lib/auth/redirect.test.ts
- gate: src/lib/auth
- estado: hecha

### T19 — Acciones de cuenta: registro, ingreso, salida y perfil
- rol: backend
- etapa: construccion
- depende_de: T5, T16, T17
- archivos: src/actions/auth.ts, src/actions/profile.ts, src/actions/account.test.ts
- criterio: signUp (guarda display_name en user metadata), signIn, signOut y updateProfile validan con zod, devuelven ActionResult con los mensajes de auth de Reglas de negocio y redirigen con safeNextPath; account.test.ts, con el cliente de Supabase mockeado, verifica datos inválidos, credenciales incorrectas, email repetido y el camino feliz de cada acción
- tests: src/actions/account.test.ts
- gate: src/actions/account.test.ts
- estado: hecha

### T20 — Acciones de grupos
- rol: backend
- etapa: construccion
- depende_de: T5, T16, T17
- archivos: src/actions/groups.ts, src/actions/groups.test.ts
- criterio: createGroup, joinGroup, leaveGroup, removeMember y setMemberRole validan con zod, llaman a su RPC y devuelven ActionResult con mapDbError; groups.test.ts, con el cliente mockeado, verifica validación, el mapeo de INVALID_CODE y LAST_ADMIN y el camino feliz
- tests: src/actions/groups.test.ts
- gate: src/actions/groups.test.ts
- estado: hecha

### T21 — Acciones de partidos
- rol: backend
- etapa: construccion
- depende_de: T5, T16, T17
- archivos: src/actions/matches.ts, src/actions/matches.test.ts
- criterio: createMatch, updateMatch, cancelMatch, setAttendance, assignTeams, finalizeMatch y voteMvp validan con zod, usan la tabla o la RPC que corresponde y devuelven ActionResult con mapDbError; matches.test.ts, con el cliente mockeado, verifica validación (asistencias de más, fecha pasada), el mapeo de MATCH_FULL y VOTING_CLOSED y el camino feliz
- tests: src/actions/matches.test.ts
- gate: src/actions/matches.test.ts
- estado: hecha

### T22 — Acciones de calificaciones
- rol: backend
- etapa: construccion
- depende_de: T5, T16, T17
- archivos: src/actions/ratings.ts, src/actions/ratings.test.ts
- criterio: rateTeammate valida con zod, rechaza calificarse a uno mismo antes de llamar a la base y hace upsert en player_ratings por (group_id, rater_id, rated_id); ratings.test.ts, con el cliente mockeado, verifica validación, autocalificación y upsert
- tests: src/actions/ratings.test.ts
- gate: src/actions/ratings.test.ts
- estado: hecha

### T23 — Acciones de torneos
- rol: backend
- etapa: construccion
- depende_de: T5, T13, T16, T17
- archivos: src/actions/tournaments.ts, src/actions/tournaments.test.ts
- criterio: createTournament, renameTournament, addTeam, updateTeam, removeTeam, startTournament (mezcla los equipos, genera el fixture con roundRobin o bracket y llama a start_tournament) y reportTournamentResult validan con zod y devuelven ActionResult con mapDbError; tournaments.test.ts, con el cliente mockeado, verifica que startTournament manda el fixture correcto para liga y eliminación, el mapeo de PENALTIES_REQUIRED y NOT_ENOUGH_TEAMS y la validación de color
- tests: src/actions/tournaments.test.ts
- gate: src/actions/tournaments.test.ts
- estado: hecha

### T24 — Ingreso, registro y portada
- rol: frontend
- etapa: construccion
- depende_de: T6, T9, T18, T19
- archivos: src/app/page.tsx, src/app/(auth)/, src/components/auth/
- criterio: `/` manda a /grupos con sesión y muestra la portada (nombre "Picado" en font-display 700, una línea de qué es y "Ingresá" / "Creá tu cuenta") sin sesión, y /ingresar y /registrarme usan AuthForm con errores por campo y respetan `next`; auth-form.test.tsx verifica los campos de cada modo, el error de validación y el error devuelto por la acción
- tests: src/components/auth/auth-form.test.tsx
- gate: src/components/auth
- estado: hecha

### T25 — Layout protegido y perfil
- rol: frontend
- etapa: construccion
- depende_de: T6, T9, T18, T19
- archivos: src/app/(app)/layout.tsx, src/app/(app)/perfil/, src/components/profile/
- criterio: el layout de (app) verifica la sesión en el servidor (redirige a /ingresar si no hay), y /perfil permite editar nombre, apodo y posición con ProfileForm y tiene "Salir de la cuenta"; profile-form.test.tsx verifica la carga de valores, el select con las 15 posiciones, el error de validación y el toast de guardado
- tests: src/components/profile/profile-form.test.tsx
- gate: src/components/profile
- estado: hecha

### T26 — Mis grupos: lista, crear y unirse
- rol: frontend
- etapa: construccion
- depende_de: T20, T25
- archivos: src/app/(app)/grupos/, src/app/(app)/unirse/, src/components/groups/group-list.tsx, src/components/groups/create-group-form.tsx, src/components/groups/groups.test.tsx
- criterio: /grupos lista los grupos del usuario con cantidad de miembros y estado vacío "Todavía no estás en ningún grupo" con "Crear grupo", /grupos/nuevo crea y lleva a /g/[gid], y /unirse/[code] muestra el nombre del grupo con "Unite al grupo" (o el error de link inválido); groups.test.tsx verifica lista, estado vacío y los errores del formulario
- tests: src/components/groups/groups.test.tsx
- gate: src/components/groups/groups.test.tsx
- estado: hecha

### T27 — Layout del grupo y miembros
- rol: frontend
- etapa: construccion
- depende_de: T9, T20, T25
- archivos: src/app/(app)/g/[gid]/layout.tsx, src/app/(app)/g/[gid]/miembros/, src/components/groups/members-list.tsx, src/components/groups/invite-link.tsx, src/components/groups/members.test.tsx
- criterio: el layout del grupo da 404 a quien no es miembro y monta BottomNav con `pb-nav` (cada pantalla trae su AppHeader), y /miembros muestra miembros con Badge "Admin", el link de invitación con "Copiar link" y "Compartir" (Web Share API si existe), "Salir del grupo" y, solo para admins, "Quitar del grupo" y "Hacer admin"; members.test.tsx verifica que las acciones de admin solo aparecen para admins y que copiar arma la URL `/unirse/<code>`
- tests: src/components/groups/members.test.tsx
- gate: src/components/groups/members.test.tsx
- estado: hecha

### T28 — Partidos: lista y creación
- rol: frontend
- etapa: construccion
- depende_de: T15, T21, T27
- archivos: src/app/(app)/g/[gid]/partidos/page.tsx, src/app/(app)/g/[gid]/partidos/nuevo/, src/components/matches/match-card.tsx, src/components/matches/match-form.tsx, src/components/matches/match-list.test.tsx
- criterio: /partidos lista próximos y jugados con MatchCard (fecha con formatMatchDate, lugar, confirmados/cupo en tabular, resultado en font-display y Badge Programado info / Finalizado neutral / Cancelado destructive) y estado vacío con "Crear partido", y /partidos/nuevo crea con MatchForm; match-list.test.tsx verifica el contenido de MatchCard por estado y los errores de MatchForm
- tests: src/components/matches/match-list.test.tsx
- gate: src/components/matches/match-list.test.tsx
- estado: hecha

### T29 — Detalle del partido: asistencia, equipos y voto de MVP
- rol: frontend
- etapa: construccion
- depende_de: T28
- archivos: src/app/(app)/g/[gid]/partidos/[mid]/page.tsx, src/components/matches/attendance-toggle.tsx, src/components/matches/team-lists.tsx, src/components/matches/mvp-vote.tsx, src/components/matches/match-detail.test.tsx
- criterio: el detalle muestra datos del partido, "Voy" / "No voy" mientras está programado, las listas de confirmados y de equipos A y B con goles y asistencias si finalizó, links de organizador a "Armar equipos" y "Cargar resultado", y MvpVote (elegir a un compañero que jugó y "Votá", "12 de 14 votaron" mientras está abierta, el MVP con Badge gold al cerrar); match-detail.test.tsx verifica el toggle, que MvpVote excluye al propio usuario y oculta los votos hasta cerrar, y que los links de organizador solo aparecen para el organizador
- tests: src/components/matches/match-detail.test.tsx
- gate: src/components/matches/match-detail.test.tsx
- estado: hecha

### T30 — Armar equipos
- rol: frontend
- etapa: construccion
- depende_de: T10, T11, T29
- archivos: src/app/(app)/g/[gid]/partidos/[mid]/equipos/, src/components/matches/team-picker.tsx, src/components/matches/team-picker.test.tsx
- criterio: solo el organizador entra; TeamPicker muestra los confirmados con su OVR (de get_group_cards + computeOvr, "–" si es provisional), permite pasar cada uno a A, B o sin equipo, "Armar parejo" usa balanceTeams, muestra la suma de OVR por equipo y "Guardar equipos" llama a assignTeams; team-picker.test.tsx verifica mover jugadores, que Armar parejo reparte con balanceTeams y el payload de guardar
- tests: src/components/matches/team-picker.test.tsx
- gate: src/components/matches/team-picker.test.tsx
- estado: pendiente

### T31 — Cargar resultado del partido
- rol: frontend
- etapa: construccion
- depende_de: T29
- archivos: src/app/(app)/g/[gid]/partidos/[mid]/resultado/, src/components/matches/result-form.tsx, src/components/matches/result-form.test.tsx
- criterio: solo el organizador entra; ResultForm pide el resultado de cada equipo y goles y asistencias por jugador (inputMode numeric, h-tap), valida en el cliente con el esquema compartido y "Cerrar partido" llama a finalizeMatch; result-form.test.tsx verifica el error "Las asistencias no pueden superar los goles.", el de goles de más y el payload enviado
- tests: src/components/matches/result-form.test.tsx
- gate: src/components/matches/result-form.test.tsx
- estado: pendiente

### T32 — Galería de cartas y carta del jugador
- rol: frontend
- etapa: construccion
- depende_de: T7, T10, T27
- archivos: src/app/(app)/g/[gid]/cartas/page.tsx, src/app/(app)/g/[gid]/cartas/[uid]/page.tsx, src/components/cards/card-gallery.tsx, src/lib/cards/build-card.ts, src/lib/cards/build-card.test.ts
- criterio: buildCard convierte una fila de get_group_cards y el flag de MVP en PlayerCardProps (nombre por apodo, etiquetas por kind, OVR con computeOvr, provisional con menos de 3 calificadores), /cartas muestra la galería en grilla de 2 columnas con PlayerCard sm ordenada por OVR, y /cartas/[uid] muestra la carta md, "12 votos" y "Calificá a <nombre>" si no es uno mismo; build-card.test.ts verifica campo, arquero, provisional y MVP
- tests: src/lib/cards/build-card.test.ts
- gate: src/lib/cards/build-card.test.ts
- estado: hecha

### T33 — Calificar a un compañero
- rol: frontend
- etapa: construccion
- depende_de: T22, T32
- archivos: src/app/(app)/g/[gid]/cartas/[uid]/calificar/, src/components/cards/rating-form.tsx, src/components/cards/rating-form.test.tsx
- criterio: RatingForm muestra los 6 stats con las etiquetas del kind del calificado, un slider 1–99 por stat con el valor en font-display, precargado con la calificación previa propia o 60, aclara "Tu voto es anónimo" y "Guardar calificación" llama a rateTeammate; uno no puede entrar a calificarse a sí mismo; rating-form.test.tsx verifica etiquetas de campo y de arquero, la precarga y el payload
- tests: src/components/cards/rating-form.test.tsx
- gate: src/components/cards/rating-form.test.tsx
- estado: hecha

### T34 — Ranking del grupo
- rol: frontend
- etapa: construccion
- depende_de: T8, T12, T27
- archivos: src/app/(app)/g/[gid]/ranking/, src/components/ranking/
- criterio: /ranking muestra la tabla de jugadores con StandingsTable (teamLabel "Jugador") a partir de computePlayerStandings y debajo listas de goleadores, asistidores y MVPs (top 5, números tabulares), con estado vacío "Todavía no hay partidos jugados"; ranking.test.tsx verifica el orden de las listas y el estado vacío
- tests: src/components/ranking/ranking.test.tsx
- gate: src/components/ranking
- estado: hecha

### T35 — Torneos: lista y creación
- rol: frontend
- etapa: construccion
- depende_de: T23, T27
- archivos: src/app/(app)/g/[gid]/torneos/page.tsx, src/app/(app)/g/[gid]/torneos/nuevo/, src/components/tournaments/tournament-card.tsx, src/components/tournaments/tournament-form.tsx, src/components/tournaments/tournament-list.test.tsx
- criterio: /torneos lista torneos con TournamentCard (nombre, formato, cantidad de equipos, Badge Borrador neutral / En curso primary / Finalizado neutral y campeón con Badge gold) y estado vacío con "Crear torneo", y /torneos/nuevo crea con nombre, formato y vuelta (solo liga) y lleva a la carga de equipos; tournament-list.test.tsx verifica TournamentCard por estado y que el campo de ida y vuelta solo aparece en liga
- tests: src/components/tournaments/tournament-list.test.tsx
- gate: src/components/tournaments/tournament-list.test.tsx
- estado: hecha

### T36 — Equipos del torneo e inicio
- rol: frontend
- etapa: construccion
- depende_de: T35
- archivos: src/app/(app)/g/[gid]/torneos/[tid]/equipos/, src/components/tournaments/team-editor.tsx, src/components/tournaments/team-editor.test.tsx
- criterio: con el torneo en borrador, el organizador agrega equipos con nombre y un color de una paleta fija de 8 (el color solo como punto o franja), los renombra o quita, y "Empezar torneo" (deshabilitado con menos de 2) llama a startTournament; team-editor.test.tsx verifica agregar, quitar, el límite de 16 y el botón deshabilitado
- tests: src/components/tournaments/team-editor.test.tsx
- gate: src/components/tournaments/team-editor.test.tsx
- estado: en_curso

### T37 — Llave de eliminación
- rol: frontend
- etapa: construccion
- depende_de: T6, T13
- archivos: src/components/tournaments/bracket.tsx, src/components/tournaments/bracket.test.tsx
- criterio: Bracket dibuja una columna por ronda con roundLabel, cada cruce con punto de color, nombre, resultado tabular y penales entre paréntesis, "A definir" si falta un equipo, el ganador en font-semibold y scroll horizontal en mobile; bracket.test.tsx verifica los nombres de ronda, "A definir" y el ganador por penales
- tests: src/components/tournaments/bracket.test.tsx
- gate: src/components/tournaments/bracket.test.tsx
- estado: hecha

### T38 — Vista del torneo: tabla, fixture y llave
- rol: frontend
- etapa: construccion
- depende_de: T8, T14, T35, T37
- archivos: src/app/(app)/g/[gid]/torneos/[tid]/page.tsx, src/components/tournaments/fixture-list.tsx, src/components/tournaments/tournament-view.test.tsx
- criterio: en liga la vista tiene pestañas "Tabla" (StandingsTable con computeTeamStandings) y "Fixture" (FixtureList por fecha), en eliminación muestra Bracket, en borrador manda a cargar equipos, al finalizar muestra el campeón con Badge gold, y el organizador ve "Cargar resultado" en cada partido pendiente con ambos equipos; tournament-view.test.tsx verifica FixtureList agrupada por fecha y los links de carga solo para el organizador
- tests: src/components/tournaments/tournament-view.test.tsx
- gate: src/components/tournaments/tournament-view.test.tsx
- estado: hecha

### T39 — Cargar resultado de torneo
- rol: frontend
- etapa: construccion
- depende_de: T38
- archivos: src/app/(app)/g/[gid]/torneos/[tid]/partidos/, src/components/tournaments/tournament-result-form.tsx, src/components/tournaments/tournament-result-form.test.tsx
- criterio: solo el organizador entra; TournamentResultForm pide goles de local y visitante, muestra los campos de penales solo en eliminación con empate, valida con el esquema compartido y "Guardar resultado" llama a reportTournamentResult; tournament-result-form.test.tsx verifica que los penales aparecen solo en eliminación con empate, el error de penales iguales y el payload
- tests: src/components/tournaments/tournament-result-form.test.tsx
- gate: src/components/tournaments/tournament-result-form.test.tsx
- estado: pendiente

### T40 — Inicio del grupo
- rol: frontend
- etapa: construccion
- depende_de: T28, T35
- archivos: src/app/(app)/g/[gid]/page.tsx, src/components/groups/group-home.tsx, src/components/groups/group-home.test.tsx
- criterio: el inicio muestra en tarjetas "Próximo partido" (MatchCard o vacío con "Crear partido"), "Pendientes" ("Votá al MVP" por cada partido jugado con votación abierta sin voto propio y "Calificá a tus compañeros" con la cantidad sin calificar) y "Torneos en curso" (TournamentCard); group-home.test.tsx verifica cada tarjeta con datos y vacía
- tests: src/components/groups/group-home.test.tsx
- gate: src/components/groups/group-home.test.tsx
- estado: hecha

### T41 — PWA: manifest e íconos
- rol: frontend
- etapa: construccion
- depende_de: T9
- archivos: src/app/manifest.ts, src/app/icon.tsx, src/app/apple-icon.tsx, src/app/manifest.test.ts
- criterio: manifest.ts devuelve name y short_name "Picado", lang es-AR, start_url /grupos, display standalone, background_color y theme_color con los hex de `background` del tema oscuro de tokens.json y íconos 192 y 512 PNG (con uno maskable) generados con ImageResponse ("P" en Barlow Condensed 700 sobre primary); manifest.test.ts verifica esos campos y los tamaños
- tests: src/app/manifest.test.ts
- gate: src/app/manifest.test.ts
- estado: hecha

### T42 — PWA: service worker y página sin conexión
- rol: frontend
- etapa: construccion
- depende_de: T41
- archivos: public/sw.js, src/components/pwa/, src/app/offline/, src/app/layout.tsx
- criterio: public/sw.js precachea /offline, usa red primero en navegaciones y responde /offline sin conexión (sin cachear respuestas de Supabase ni de /api), SwRegister registra /sw.js solo en producción y si el navegador lo soporta, el layout raíz lo monta y /offline dice "Estás sin conexión" con "Reintentar"; sw-register.test.tsx verifica que registra en producción, no registra en desarrollo ni sin soporte
- tests: src/components/pwa/sw-register.test.tsx
- gate: src/components/pwa
- estado: hecha

### T43 — Integración: build de producción y rutas completas
- rol: frontend
- etapa: construccion
- depende_de: T24, T25, T26, T27, T29, T30, T31, T33, T34, T36, T38, T39, T40, T42
- archivos: src/app/, src/components/
- criterio: `npm run build` pasa sin errores y routes.test.ts verifica que existen las 24 páginas de Estructura de carpetas (incluida /offline); se corrigen solo los errores de integración que aparezcan, sin agregar funcionalidad
- tests: src/app/routes.test.ts
- gate: frontend
- estado: pendiente

### T44 — QA e2e: cuenta, grupo y partido
- rol: qa
- etapa: calidad
- depende_de: T43
- archivos: tests/e2e/helpers.ts, tests/e2e/account-group.spec.ts, tests/e2e/match.spec.ts
- criterio: account-group.spec.ts cubre registrarse, crear grupo, copiar el link y que un segundo usuario se una; match.spec.ts cubre crear partido, confirmar con 4 usuarios, Armar parejo, cargar resultado con goles y votar MVP; helpers.ts crea usuarios con email único vía admin API y nunca resetea la base; los bugs encontrados quedan como hallazgos con el test que los reproduce
- tests: tests/e2e/account-group.spec.ts, tests/e2e/match.spec.ts
- gate: e2e
- estado: pendiente

### T45 — QA e2e: cartas y torneos
- rol: qa
- etapa: calidad
- depende_de: T44
- archivos: tests/e2e/cards.spec.ts, tests/e2e/tournament.spec.ts
- criterio: cards.spec.ts cubre que la carta es provisional con 2 calificaciones y muestra OVR con 3; tournament.spec.ts cubre una liga de 4 equipos (empezar, cargar resultados, tabla correcta, campeón) y una eliminación de 3 equipos (bye en la final, empate con penales, campeón); los bugs quedan como hallazgos con reproducción
- tests: tests/e2e/cards.spec.ts, tests/e2e/tournament.spec.ts
- gate: e2e
- estado: pendiente

### T46 — Revisión de seguridad
- rol: security
- etapa: calidad
- depende_de: T43
- archivos: .yolo/reviews/security.md
- criterio: el gate security queda en verde (npm audit sin altas ni críticas sin justificar, sin secretos en el cliente ni .env commiteados, tests de RLS en verde) y security.md lista los hallazgos en el formato de agents.md, revisando en particular RPC security definer sin chequeo de permisos, grants por columna, rutas de (app) sin sesión, safeNextPath y que ningún voto o calificación individual sea legible por otro usuario
- tests: —
- gate: security
- estado: pendiente

### T47 — Revisión de código
- rol: review
- etapa: calidad
- depende_de: T43
- archivos: .yolo/reviews/review.md
- criterio: el gate review queda en verde (lint, typecheck, sin `any` ni `console.log` en src/) y review.md lista los hallazgos en el formato de agents.md, revisando en particular divergencias con database.types.ts, colores o tamaños sueltos fuera de los tokens, textos sin voseo o sin sentence case y más de un Button primary por pantalla
- tests: —
- gate: review
- estado: pendiente

## Riesgos
- Muchos agentes en paralelo sobre un solo repo y una sola base local: el typecheck ve archivos a medio escribir de otra tarea, dos `npm install` o dos `next build` simultáneos se pisan y un `db reset` rompe los tests de otro. → Dependencias y componentes de shadcn se instalan en el Setup y ninguna tarea instala paquetes; las tareas de base comparten `supabase/migrations/` y por eso corren en fila; ningún test resetea la base; las tareas de UI usan gates por ruta y el build corre solo en T43 y en los e2e, que van en fila. Si un gate falla solo por archivos fuera del alcance de la tarea, el director lo re-corre al cerrar la tanda antes de subir de modelo.
- Supabase local depende de Docker: si la sesión no tiene el grupo docker activo, los comandos de supabase fallan. → `sg docker -c "<comando>"`; el primer `supabase start` baja ~2–3 GB de imágenes y conviene hacerlo en el Setup.
- Cuenta sin confirmación de email ni recuperación de contraseña: alguien puede registrarse con un email ajeno y quien olvida la contraseña queda afuera. → Los datos solo se ven dentro de grupos con invitación; SMTP propio + confirmación + recuperar contraseña quedan como primer pendiente del PR.
- La lógica de la llave en plpgsql (T4) es la tarea más difícil del plan. → La regla de avance está escrita en Reglas de negocio con el mismo criterio que usa `nextSlot` de T13, y el test de T4 cubre el avance y el cierre del torneo; la escalera puede subirla a Opus.

## Auditoría
_(la completa `plan.py audit`)_
