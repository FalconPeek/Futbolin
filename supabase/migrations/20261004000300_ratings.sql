-- T3: Contrato de calificaciones y cartas

-- Enums
create type public.rating_kind as enum ('campo', 'arquero');

-- player_ratings table
create table public.player_ratings (
  group_id uuid not null references public.groups on delete cascade,
  rater_id uuid not null default auth.uid() references public.profiles on delete cascade,
  rated_id uuid not null references public.profiles on delete cascade,
  kind public.rating_kind not null,
  s1 smallint not null check (s1 >= 1 and s1 <= 99),
  s2 smallint not null check (s2 >= 1 and s2 <= 99),
  s3 smallint not null check (s3 >= 1 and s3 <= 99),
  s4 smallint not null check (s4 >= 1 and s4 <= 99),
  s5 smallint not null check (s5 >= 1 and s5 <= 99),
  s6 smallint not null check (s6 >= 1 and s6 <= 99),
  updated_at timestamptz default now(),
  primary key (group_id, rater_id, rated_id)
);

create index idx_player_ratings_group_rated on public.player_ratings (group_id, rated_id);

alter table public.player_ratings enable row level security;

-- Helpers
create or replace function public.rating_kind_for(uid uuid)
returns public.rating_kind
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select position from public.profiles where id = uid) = 'POR' then 'arquero'::public.rating_kind
    else 'campo'::public.rating_kind
  end
$$;

-- RPC: get_group_cards
create or replace function public.get_group_cards(p_group_id uuid)
returns table (
  user_id uuid,
  display_name text,
  nickname text,
  "position" public.player_position,
  kind public.rating_kind,
  raters int,
  s1 int,
  s2 int,
  s3 int,
  s4 int,
  s5 int,
  s6 int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_member boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  select public.is_group_member(p_group_id) into v_is_member;

  if not v_is_member then
    raise exception 'NOT_ALLOWED';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.nickname,
    p.position,
    public.rating_kind_for(p.id),
    count(pr.rater_id)::int as raters,
    case when count(pr.rater_id) >= 3 then round(avg(pr.s1))::int else null end,
    case when count(pr.rater_id) >= 3 then round(avg(pr.s2))::int else null end,
    case when count(pr.rater_id) >= 3 then round(avg(pr.s3))::int else null end,
    case when count(pr.rater_id) >= 3 then round(avg(pr.s4))::int else null end,
    case when count(pr.rater_id) >= 3 then round(avg(pr.s5))::int else null end,
    case when count(pr.rater_id) >= 3 then round(avg(pr.s6))::int else null end
  from public.group_members gm
  join public.profiles p on gm.user_id = p.id
  left join public.player_ratings pr on pr.group_id = gm.group_id
    and pr.rated_id = p.id
    and pr.kind = public.rating_kind_for(p.id)
  where gm.group_id = p_group_id
  group by p.id, p.display_name, p.nickname, p.position;
end
$$;

-- RLS: player_ratings
create policy "player_ratings_select_own"
on public.player_ratings
for select
to authenticated
using (rater_id = auth.uid());

create policy "player_ratings_insert_member"
on public.player_ratings
for insert
to authenticated
with check (
  rater_id = auth.uid()
  and rater_id <> rated_id
  and public.is_group_member(group_id)
  and exists (
    select 1 from public.group_members
    where group_id = player_ratings.group_id and user_id = rated_id
  )
  and kind = public.rating_kind_for(rated_id)
);

create policy "player_ratings_update_own"
on public.player_ratings
for update
to authenticated
using (rater_id = auth.uid())
with check (
  rater_id = auth.uid()
  and rater_id <> rated_id
  and public.is_group_member(group_id)
  and exists (
    select 1 from public.group_members
    where group_id = player_ratings.group_id and user_id = rated_id
  )
  and kind = public.rating_kind_for(rated_id)
);

create policy "player_ratings_delete_own"
on public.player_ratings
for delete
to authenticated
using (rater_id = auth.uid());

-- Permisos de ejecución
revoke execute on function public.rating_kind_for(uuid) from public, anon;
grant execute on function public.rating_kind_for(uuid) to authenticated;

revoke execute on function public.get_group_cards(uuid) from public, anon;
grant execute on function public.get_group_cards(uuid) to authenticated;
