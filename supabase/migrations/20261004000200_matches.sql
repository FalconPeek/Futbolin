-- T2: Contrato de partidos y MVP

-- Enums
create type public.match_status as enum ('programado', 'finalizado', 'cancelado');
create type public.attendance_status as enum ('confirmado', 'baja');
create type public.team_side as enum ('A', 'B');

-- matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  scheduled_at timestamptz not null,
  location text not null check (length(location) >= 2 and length(location) <= 80),
  players_per_team smallint not null default 5 check (players_per_team >= 3 and players_per_team <= 11),
  status public.match_status not null default 'programado',
  score_a smallint check (score_a >= 0 and score_a <= 99),
  score_b smallint check (score_b >= 0 and score_b <= 99),
  created_by uuid not null default auth.uid() references public.profiles,
  finalized_at timestamptz,
  created_at timestamptz default now()
);

create index idx_matches_group_scheduled on public.matches (group_id, scheduled_at);

alter table public.matches enable row level security;

-- match_players
create table public.match_players (
  match_id uuid not null references public.matches on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  attendance public.attendance_status not null default 'confirmado',
  team public.team_side,
  goals smallint not null default 0 check (goals >= 0),
  assists smallint not null default 0 check (assists >= 0),
  created_at timestamptz default now(),
  primary key (match_id, user_id)
);

create index idx_match_players_user_id on public.match_players (user_id);

alter table public.match_players enable row level security;

-- mvp_votes
create table public.mvp_votes (
  match_id uuid not null references public.matches on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles on delete cascade,
  voted_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz default now(),
  primary key (match_id, voter_id)
);

alter table public.mvp_votes enable row level security;

-- Helpers
create or replace function public.match_group_id(mid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select group_id from public.matches where id = mid
$$;

create or replace function public.is_match_organizer(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id = mid
      and (m.created_by = auth.uid() or public.is_group_admin(m.group_id))
  )
$$;

-- RPC: set_attendance
create or replace function public.set_attendance(p_match_id uuid, p_status public.attendance_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_status public.match_status;
  v_players_per_team smallint;
  v_current public.attendance_status;
  v_confirmed bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if p_match_id is null or p_status is null then
    raise exception 'INVALID_INPUT';
  end if;

  -- Bloquea el partido para serializar confirmaciones concurrentes (cupo).
  select m.group_id, m.status, m.players_per_team
  into v_group_id, v_status, v_players_per_team
  from public.matches m
  where m.id = p_match_id
  for no key update;

  -- Partido inexistente y partido ajeno dan el mismo error: no se revela su existencia.
  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  if v_status <> 'programado' then
    raise exception 'MATCH_CLOSED';
  end if;

  select mp.attendance into v_current
  from public.match_players mp
  where mp.match_id = p_match_id and mp.user_id = auth.uid();

  -- Solo cuenta cupo quien pasa a confirmado; reconfirmar no consume lugar.
  if p_status = 'confirmado' and v_current is distinct from 'confirmado' then
    select count(*) into v_confirmed
    from public.match_players mp
    where mp.match_id = p_match_id and mp.attendance = 'confirmado';

    if v_confirmed >= 2 * v_players_per_team then
      raise exception 'MATCH_FULL';
    end if;
  end if;

  insert into public.match_players as mp (match_id, user_id, attendance)
  values (p_match_id, auth.uid(), p_status)
  on conflict (match_id, user_id) do update
    set attendance = excluded.attendance,
        team = case when excluded.attendance = 'baja' then null else mp.team end;
end
$$;

-- RPC: assign_teams
create or replace function public.assign_teams(p_match_id uuid, p_assignments jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.match_status;
  v_item jsonb;
  v_user_text text;
  v_team_text text;
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if p_match_id is null or not public.is_match_organizer(p_match_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select m.status into v_status
  from public.matches m
  where m.id = p_match_id
  for no key update;

  if v_status <> 'programado' then
    raise exception 'MATCH_CLOSED';
  end if;

  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'INVALID_INPUT';
  end if;

  -- Cualquier error aborta toda la función: no quedan equipos a medias.
  for v_item in select value from jsonb_array_elements(p_assignments) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'INVALID_INPUT';
    end if;

    v_user_text := v_item->>'user_id';
    v_team_text := v_item->>'team';

    if v_user_text is null
       or v_user_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (v_team_text is not null and v_team_text not in ('A', 'B')) then
      raise exception 'INVALID_INPUT';
    end if;

    v_user_id := v_user_text::uuid;

    update public.match_players mp
    set team = v_team_text::public.team_side
    where mp.match_id = p_match_id
      and mp.user_id = v_user_id
      and mp.attendance = 'confirmado';

    if not found then
      raise exception 'INVALID_INPUT';
    end if;
  end loop;
end
$$;

-- RPC: finalize_match
create or replace function public.finalize_match(p_match_id uuid, p_score_a int, p_score_b int, p_stats jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.match_status;
  v_item jsonb;
  v_user_text text;
  v_user_id uuid;
  v_goals int;
  v_assists int;
  v_team public.team_side;
  v_seen uuid[] := array[]::uuid[];
  v_goals_a int := 0;
  v_goals_b int := 0;
  v_assists_a int := 0;
  v_assists_b int := 0;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if p_match_id is null or not public.is_match_organizer(p_match_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select m.status into v_status
  from public.matches m
  where m.id = p_match_id
  for no key update;

  if v_status <> 'programado' then
    raise exception 'MATCH_CLOSED';
  end if;

  if p_score_a is null or p_score_b is null
     or p_score_a not between 0 and 99 or p_score_b not between 0 and 99 then
    raise exception 'INVALID_RESULT';
  end if;

  if p_stats is null or jsonb_typeof(p_stats) <> 'array' then
    raise exception 'INVALID_INPUT';
  end if;

  -- Al menos un jugador en cada equipo (team solo se asigna a confirmados).
  if not exists (select 1 from public.match_players mp where mp.match_id = p_match_id and mp.team = 'A')
     or not exists (select 1 from public.match_players mp where mp.match_id = p_match_id and mp.team = 'B') then
    raise exception 'INVALID_RESULT';
  end if;

  for v_item in select value from jsonb_array_elements(p_stats) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'INVALID_INPUT';
    end if;

    v_user_text := v_item->>'user_id';

    if v_user_text is null
       or v_user_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(v_item->'goals') <> 'number'
       or jsonb_typeof(v_item->'assists') <> 'number'
       or (v_item->>'goals') !~ '^-?[0-9]{1,4}$'
       or (v_item->>'assists') !~ '^-?[0-9]{1,4}$' then
      raise exception 'INVALID_INPUT';
    end if;

    v_user_id := v_user_text::uuid;
    v_goals := (v_item->>'goals')::int;
    v_assists := (v_item->>'assists')::int;

    if v_goals < 0 or v_assists < 0 or v_user_id = any (v_seen) then
      raise exception 'INVALID_RESULT';
    end if;
    v_seen := v_seen || v_user_id;

    select mp.team into v_team
    from public.match_players mp
    where mp.match_id = p_match_id and mp.user_id = v_user_id;

    -- Solo tienen estadísticas quienes jugaron (tienen equipo).
    if v_team is null then
      raise exception 'INVALID_RESULT';
    end if;

    if v_team = 'A' then
      v_goals_a := v_goals_a + v_goals;
      v_assists_a := v_assists_a + v_assists;
    else
      v_goals_b := v_goals_b + v_goals;
      v_assists_b := v_assists_b + v_assists;
    end if;
  end loop;

  -- Por equipo: goles <= goles del equipo y asistencias <= goles del equipo.
  if v_goals_a > p_score_a or v_assists_a > p_score_a
     or v_goals_b > p_score_b or v_assists_b > p_score_b then
    raise exception 'INVALID_RESULT';
  end if;

  update public.matches
  set score_a = p_score_a,
      score_b = p_score_b,
      status = 'finalizado',
      finalized_at = now()
  where id = p_match_id;

  for v_item in select value from jsonb_array_elements(p_stats) loop
    update public.match_players mp
    set goals = (v_item->>'goals')::int,
        assists = (v_item->>'assists')::int
    where mp.match_id = p_match_id
      and mp.user_id = (v_item->>'user_id')::uuid;
  end loop;
end
$$;

-- RPC: vote_mvp
create or replace function public.vote_mvp(p_match_id uuid, p_voted_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_status public.match_status;
  v_finalized_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if p_match_id is null or p_voted_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  select m.group_id, m.status, m.finalized_at
  into v_group_id, v_status, v_finalized_at
  from public.matches m
  where m.id = p_match_id;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  if v_status <> 'finalizado' or now() >= v_finalized_at + interval '72 hours' then
    raise exception 'VOTING_CLOSED';
  end if;

  -- Votante y votado tienen que haber jugado (equipo asignado y confirmados) y ser distintos.
  if auth.uid() = p_voted_id
     or not exists (
       select 1 from public.match_players mp
       where mp.match_id = p_match_id and mp.user_id = auth.uid()
         and mp.attendance = 'confirmado' and mp.team is not null
     )
     or not exists (
       select 1 from public.match_players mp
       where mp.match_id = p_match_id and mp.user_id = p_voted_id
         and mp.attendance = 'confirmado' and mp.team is not null
     ) then
    raise exception 'NOT_ELIGIBLE';
  end if;

  insert into public.mvp_votes (match_id, voter_id, voted_id)
  values (p_match_id, auth.uid(), p_voted_id)
  on conflict (match_id, voter_id) do nothing;

  if not found then
    raise exception 'ALREADY_VOTED';
  end if;
end
$$;

-- RPC: get_match_mvp_summary
create or replace function public.get_match_mvp_summary(p_match_id uuid)
returns table (
  eligible int,
  votes_cast int,
  closed boolean,
  mvp_ids uuid[],
  my_vote uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_status public.match_status;
  v_finalized_at timestamptz;
  v_eligible int;
  v_votes_cast int;
  v_closed boolean;
  v_mvp_ids uuid[] := array[]::uuid[];
  v_my_vote uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  select m.group_id, m.status, m.finalized_at
  into v_group_id, v_status, v_finalized_at
  from public.matches m
  where m.id = p_match_id;

  if v_group_id is null or not public.is_group_member(v_group_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select count(*)::int into v_eligible
  from public.match_players mp
  where mp.match_id = p_match_id and mp.attendance = 'confirmado' and mp.team is not null;

  select count(*)::int into v_votes_cast
  from public.mvp_votes v
  where v.match_id = p_match_id;

  select v.voted_id into v_my_vote
  from public.mvp_votes v
  where v.match_id = p_match_id and v.voter_id = auth.uid();

  -- Solo un partido finalizado puede cerrar su votación.
  v_closed := v_status = 'finalizado'
    and (now() >= v_finalized_at + interval '72 hours' or v_votes_cast >= v_eligible);

  if v_closed and v_votes_cast > 0 then
    select coalesce(array_agg(t.voted_id order by t.voted_id), array[]::uuid[])
    into v_mvp_ids
    from (
      select v.voted_id, count(*) as n
      from public.mvp_votes v
      where v.match_id = p_match_id
      group by v.voted_id
    ) t
    where t.n = (
      select max(c.n) from (
        select count(*) as n
        from public.mvp_votes v
        where v.match_id = p_match_id
        group by v.voted_id
      ) c
    );
  end if;

  return query select v_eligible, v_votes_cast, v_closed, v_mvp_ids, v_my_vote;
end
$$;

-- RLS: matches
create policy "matches_select_member"
on public.matches
for select
to authenticated
using (public.is_group_member(group_id));

create policy "matches_insert_member"
on public.matches
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
  and status = 'programado'
  and score_a is null
  and score_b is null
  and finalized_at is null
);

create policy "matches_update_organizer"
on public.matches
for update
to authenticated
using (public.is_match_organizer(id) and status = 'programado')
with check (status in ('programado', 'cancelado'));

create policy "matches_delete_organizer"
on public.matches
for delete
to authenticated
using (public.is_match_organizer(id) and status = 'programado');

revoke update on public.matches from authenticated, anon;
grant update (scheduled_at, location, players_per_team, status) on public.matches to authenticated;

-- RLS: match_players (escrituras solo por RPC)
create policy "match_players_select_member"
on public.match_players
for select
to authenticated
using (public.is_group_member(public.match_group_id(match_id)));

revoke insert, update, delete on public.match_players from authenticated, anon;

-- RLS: mvp_votes (el voto es anónimo; escrituras solo por RPC)
create policy "mvp_votes_select_own"
on public.mvp_votes
for select
to authenticated
using (voter_id = auth.uid());

revoke insert, update, delete on public.mvp_votes from authenticated, anon;

-- Permisos de ejecución
revoke execute on function public.match_group_id(uuid) from public, anon;
grant execute on function public.match_group_id(uuid) to authenticated;

revoke execute on function public.is_match_organizer(uuid) from public, anon;
grant execute on function public.is_match_organizer(uuid) to authenticated;

revoke execute on function public.set_attendance(uuid, public.attendance_status) from public, anon;
grant execute on function public.set_attendance(uuid, public.attendance_status) to authenticated;

revoke execute on function public.assign_teams(uuid, jsonb) from public, anon;
grant execute on function public.assign_teams(uuid, jsonb) to authenticated;

revoke execute on function public.finalize_match(uuid, int, int, jsonb) from public, anon;
grant execute on function public.finalize_match(uuid, int, int, jsonb) to authenticated;

revoke execute on function public.vote_mvp(uuid, uuid) from public, anon;
grant execute on function public.vote_mvp(uuid, uuid) to authenticated;

revoke execute on function public.get_match_mvp_summary(uuid) from public, anon;
grant execute on function public.get_match_mvp_summary(uuid) to authenticated;
