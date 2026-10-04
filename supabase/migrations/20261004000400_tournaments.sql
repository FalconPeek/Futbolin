-- T4: Contrato de torneos

-- Enums
create type public.tournament_format as enum ('liga', 'eliminacion');
create type public.tournament_status as enum ('borrador', 'en_curso', 'finalizado');
create type public.tmatch_status as enum ('pendiente', 'jugado');

-- tournaments table
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  name text not null check (length(name) >= 2 and length(name) <= 60),
  format public.tournament_format not null,
  legs smallint not null default 1 check (legs in (1, 2)),
  status public.tournament_status not null default 'borrador',
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz default now()
);

create index idx_tournaments_group_id on public.tournaments (group_id);

alter table public.tournaments enable row level security;

-- tournament_teams table
create table public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  name text not null check (length(name) >= 1 and length(name) <= 30),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz default now(),
  unique (tournament_id, name)
);

alter table public.tournament_teams enable row level security;

-- tournament_matches table
create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments on delete cascade,
  round smallint not null check (round >= 1),
  slot smallint not null check (slot >= 0),
  home_team_id uuid references public.tournament_teams on delete cascade,
  away_team_id uuid references public.tournament_teams on delete cascade,
  home_score smallint check (home_score >= 0 and home_score <= 99),
  away_score smallint check (away_score >= 0 and away_score <= 99),
  home_pens smallint check (home_pens >= 0),
  away_pens smallint check (away_pens >= 0),
  status public.tmatch_status not null default 'pendiente',
  created_at timestamptz default now(),
  unique (tournament_id, round, slot)
);

alter table public.tournament_matches enable row level security;

-- Trigger: reject team 17
create or replace function public.check_team_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_count bigint;
begin
  select count(*) into v_team_count from public.tournament_teams
  where tournament_id = new.tournament_id;

  if v_team_count >= 16 then
    raise exception 'TOO_MANY_TEAMS';
  end if;

  return new;
end
$$;

create trigger before_insert_tournament_team
before insert on public.tournament_teams
for each row
execute function public.check_team_limit();

-- Helpers
create or replace function public.tournament_group_id(tid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select group_id from public.tournaments where id = tid
$$;

create or replace function public.is_tournament_organizer(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = tid
      and (t.created_by = auth.uid() or public.is_group_admin(t.group_id))
  )
$$;

-- RPC: start_tournament
create or replace function public.start_tournament(p_tournament_id uuid, p_fixtures jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament record;
  v_team_count bigint;
  v_fixture record;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if not public.is_tournament_organizer(p_tournament_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id;

  if v_tournament is null then
    raise exception 'INVALID_INPUT';
  end if;

  if v_tournament.status != 'borrador' then
    raise exception 'TOURNAMENT_NOT_DRAFT';
  end if;

  select count(*) into v_team_count from public.tournament_teams
  where tournament_id = p_tournament_id;

  if v_team_count < 2 then
    raise exception 'NOT_ENOUGH_TEAMS';
  end if;

  -- Validate all team IDs in fixtures
  for v_fixture in select * from jsonb_to_recordset(p_fixtures) as x(
    round smallint,
    slot smallint,
    home_team_id uuid,
    away_team_id uuid
  ) loop
    if v_fixture.home_team_id is not null then
      select count(*) into v_team_count from public.tournament_teams
      where id = v_fixture.home_team_id and tournament_id = p_tournament_id;

      if v_team_count != 1 then
        raise exception 'INVALID_INPUT';
      end if;
    end if;

    if v_fixture.away_team_id is not null then
      select count(*) into v_team_count from public.tournament_teams
      where id = v_fixture.away_team_id and tournament_id = p_tournament_id;

      if v_team_count != 1 then
        raise exception 'INVALID_INPUT';
      end if;
    end if;

    -- Insert match
    insert into public.tournament_matches (
      tournament_id,
      round,
      slot,
      home_team_id,
      away_team_id
    ) values (
      p_tournament_id,
      v_fixture.round,
      v_fixture.slot,
      v_fixture.home_team_id,
      v_fixture.away_team_id
    );
  end loop;

  -- Update tournament status
  update public.tournaments
  set status = 'en_curso'
  where id = p_tournament_id;
end
$$;

-- RPC: report_tournament_result
create or replace function public.report_tournament_result(
  p_match_id uuid,
  p_home int,
  p_away int,
  p_home_pens int default null,
  p_away_pens int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tournament_id uuid;
  v_tournament_format public.tournament_format;
  v_tournament_status public.tournament_status;
  v_match_round smallint;
  v_match_slot smallint;
  v_home_team_id uuid;
  v_away_team_id uuid;
  v_next_round smallint;
  v_next_slot smallint;
  v_next_match_id uuid;
  v_next_match_status public.tmatch_status;
  v_next_home_team_id uuid;
  v_next_away_team_id uuid;
  v_winner_id uuid;
  v_pending_count bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  -- Get match details
  select tm.tournament_id, tm.round, tm.slot, tm.home_team_id, tm.away_team_id
  into v_tournament_id, v_match_round, v_match_slot, v_home_team_id, v_away_team_id
  from public.tournament_matches tm
  where tm.id = p_match_id;

  if v_tournament_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  -- Get tournament details and check permission (lock row for concurrent updates)
  select format, status
  into v_tournament_format, v_tournament_status
  from public.tournaments
  where id = v_tournament_id
  for update;

  if not public.is_tournament_organizer(v_tournament_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  if v_home_team_id is null or v_away_team_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_home < 0 or p_home > 99 or p_away < 0 or p_away > 99 then
    raise exception 'INVALID_INPUT';
  end if;

  -- For elimination: check NEXT_PLAYED before TOURNAMENT_NOT_RUNNING
  if v_tournament_format = 'eliminacion' then
    v_next_round := v_match_round + 1;
    v_next_slot := floor(v_match_slot::float / 2)::smallint;

    select id, status into v_next_match_id, v_next_match_status
    from public.tournament_matches
    where tournament_id = v_tournament_id
      and round = v_next_round
      and slot = v_next_slot;

    if v_next_match_id is not null and v_next_match_status = 'jugado' then
      raise exception 'NEXT_PLAYED';
    end if;
  end if;

  if v_tournament_status != 'en_curso' then
    raise exception 'TOURNAMENT_NOT_RUNNING';
  end if;

  -- Handle penalties logic
  if v_tournament_format = 'eliminacion' and p_home = p_away then
    if p_home_pens is null or p_away_pens is null or p_home_pens = p_away_pens then
      raise exception 'PENALTIES_REQUIRED';
    end if;
  else
    p_home_pens := null;
    p_away_pens := null;
  end if;

  -- Determine winner
  if p_home > p_away then
    v_winner_id := v_home_team_id;
  elsif p_away > p_home then
    v_winner_id := v_away_team_id;
  else
    -- Tied on goals
    if v_tournament_format = 'eliminacion' then
      if p_home_pens > p_away_pens then
        v_winner_id := v_home_team_id;
      else
        v_winner_id := v_away_team_id;
      end if;
    else
      v_winner_id := null;
    end if;
  end if;

  -- For elimination: advance winner to next round
  if v_tournament_format = 'eliminacion' and v_winner_id is not null then
    select id, status into v_next_match_id, v_next_match_status
    from public.tournament_matches
    where tournament_id = v_tournament_id
      and round = v_next_round
      and slot = v_next_slot;

    if v_next_match_id is not null then

      -- Get current team assignments from next match
      select home_team_id, away_team_id
      into v_next_home_team_id, v_next_away_team_id
      from public.tournament_matches
      where id = v_next_match_id;

      -- Determine if winner goes to home or away slot
      if v_match_slot % 2 = 0 then
        v_next_home_team_id := v_winner_id;
      else
        v_next_away_team_id := v_winner_id;
      end if;

      update public.tournament_matches
      set home_team_id = v_next_home_team_id,
          away_team_id = v_next_away_team_id
      where id = v_next_match_id;
    end if;
  end if;

  -- Update match with result
  update public.tournament_matches
  set
    home_score = p_home,
    away_score = p_away,
    home_pens = p_home_pens,
    away_pens = p_away_pens,
    status = 'jugado'
  where id = p_match_id;

  -- Check if tournament is finished (no more pending matches)
  select count(*) into v_pending_count from public.tournament_matches
  where tournament_id = v_tournament_id and status = 'pendiente';

  if v_pending_count = 0 then
    update public.tournaments
    set status = 'finalizado'
    where id = v_tournament_id;
  end if;
end
$$;

-- RLS Policies: tournaments
create policy "Users can see tournaments of groups they belong to"
on public.tournaments
for select
to authenticated
using (public.is_group_member(group_id));

create policy "Users can create tournaments in their groups as any member"
on public.tournaments
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
  and status = 'borrador'
);

create policy "Only tournament organizer can update"
on public.tournaments
for update
to authenticated
using (public.is_tournament_organizer(id))
with check (public.is_tournament_organizer(id));

create policy "Only tournament organizer can delete draft"
on public.tournaments
for delete
to authenticated
using (public.is_tournament_organizer(id) and status = 'borrador');

revoke update on public.tournaments from authenticated, anon;
grant update (name) on public.tournaments to authenticated;

-- RLS Policies: tournament_teams
create policy "Users can see tournament teams from accessible tournaments"
on public.tournament_teams
for select
to authenticated
using (public.is_group_member(public.tournament_group_id(tournament_id)));

create policy "Only tournament organizer can add teams to draft"
on public.tournament_teams
for insert
to authenticated
with check (
  public.is_tournament_organizer(tournament_id)
  and (select status from public.tournaments where id = tournament_id) = 'borrador'
);

create policy "Only tournament organizer can update teams in draft"
on public.tournament_teams
for update
to authenticated
using (
  public.is_tournament_organizer(tournament_id)
  and (select status from public.tournaments where id = tournament_id) = 'borrador'
)
with check (
  public.is_tournament_organizer(tournament_id)
  and (select status from public.tournaments where id = tournament_id) = 'borrador'
);

create policy "Only tournament organizer can delete teams from draft"
on public.tournament_teams
for delete
to authenticated
using (
  public.is_tournament_organizer(tournament_id)
  and (select status from public.tournaments where id = tournament_id) = 'borrador'
);

revoke update on public.tournament_teams from authenticated, anon;
grant update (name, color) on public.tournament_teams to authenticated;

-- RLS Policies: tournament_matches
create policy "Users can see tournament matches from accessible tournaments"
on public.tournament_matches
for select
to authenticated
using (public.is_group_member(public.tournament_group_id(tournament_id)));

-- No direct updates allowed (only via RPC)
revoke update on public.tournament_matches from authenticated, anon;

-- Revoke and grant permissions for helpers
revoke execute on function public.tournament_group_id(uuid) from public, anon;
grant execute on function public.tournament_group_id(uuid) to authenticated;

revoke execute on function public.is_tournament_organizer(uuid) from public, anon;
grant execute on function public.is_tournament_organizer(uuid) to authenticated;

-- Revoke and grant permissions for RPCs
revoke execute on function public.start_tournament(uuid, jsonb) from public, anon;
grant execute on function public.start_tournament(uuid, jsonb) to authenticated;

revoke execute on function public.report_tournament_result(uuid, int, int, int, int) from public, anon;
grant execute on function public.report_tournament_result(uuid, int, int, int, int) to authenticated;

-- Revoke and grant permissions for triggers (nobody calls them directly)
revoke execute on function public.check_team_limit() from public, anon, authenticated;
