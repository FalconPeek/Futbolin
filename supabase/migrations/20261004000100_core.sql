-- T1: Contrato núcleo: perfiles, grupos y membresías

-- Enums
create type public.member_role as enum ('admin', 'member');
create type public.player_position as enum ('POR', 'LI', 'DFC', 'LD', 'CAI', 'CAD', 'MCD', 'MC', 'MCO', 'MI', 'MD', 'EI', 'ED', 'SD', 'DC');

-- profiles table
create table public.profiles (
  id uuid primary key references auth.users on delete cascade not null,
  display_name text not null check (length(display_name) >= 2 and length(display_name) <= 40),
  nickname text check (length(nickname) <= 20),
  position public.player_position not null default 'MC',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- groups table
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) >= 2 and length(name) <= 40),
  invite_code text not null unique,
  created_by uuid references public.profiles not null default auth.uid(),
  created_at timestamptz default now()
);

alter table public.groups enable row level security;

-- group_members table
create table public.group_members (
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  role public.member_role not null default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create index idx_group_members_user_id on public.group_members (user_id);

alter table public.group_members enable row level security;

-- Helpers
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  )
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.shares_group(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm1
    where gm1.user_id = auth.uid()
      and exists (
        select 1 from public.group_members gm2
        where gm2.group_id = gm1.group_id and gm2.user_id = uid
      )
  )
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  v_code := '';
  for i in 1..8 loop
    v_code := v_code || substr(v_alphabet, (get_byte(extensions.gen_random_bytes(1), 0) % 32) + 1, 1);
  end loop;
  return v_code;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := (new.raw_user_meta_data->>'display_name');
  if v_display_name is null or length(trim(v_display_name)) < 2 then
    v_display_name := 'Jugador';
  else
    v_display_name := substr(trim(v_display_name), 1, 40);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name);

  return new;
end
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- RPC: create_group
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if length(p_name) < 2 or length(p_name) > 40 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.groups (name, invite_code, created_by)
  values (p_name, public.generate_invite_code(), auth.uid())
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'admin');

  return v_group_id;
end
$$;

-- RPC: join_group
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_is_member boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  select id into v_group_id from public.groups
  where upper(invite_code) = upper(p_code);

  if v_group_id is null then
    raise exception 'INVALID_CODE';
  end if;

  select exists (
    select 1 from public.group_members
    where group_id = v_group_id and user_id = auth.uid()
  ) into v_is_member;

  if v_is_member then
    return v_group_id;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member');

  return v_group_id;
end
$$;

-- RPC: leave_group
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_member boolean;
  v_is_admin boolean;
  v_admin_count bigint;
  v_other_members bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) into v_is_member;

  if not v_is_member then
    raise exception 'NOT_ALLOWED';
  end if;

  select role = 'admin' into v_is_admin from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  if v_is_admin then
    select count(*) into v_admin_count from public.group_members
    where group_id = p_group_id and role = 'admin';

    select count(*) into v_other_members from public.group_members
    where group_id = p_group_id;

    if v_admin_count = 1 and v_other_members > 1 then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  select count(*) into v_other_members from public.group_members
  where group_id = p_group_id;

  if v_other_members = 0 then
    delete from public.groups where id = p_group_id;
  end if;
end
$$;

-- RPC: remove_member
create or replace function public.remove_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if not public.is_group_admin(p_group_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'NOT_ALLOWED';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = p_user_id;
end
$$;

-- RPC: set_member_role
create or replace function public.set_member_role(p_group_id uuid, p_user_id uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_role public.member_role;
  v_admin_count bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if not public.is_group_admin(p_group_id) then
    raise exception 'NOT_ALLOWED';
  end if;

  select role into v_current_role from public.group_members
  where group_id = p_group_id and user_id = p_user_id;

  if v_current_role is null then
    raise exception 'NOT_ALLOWED';
  end if;

  if v_current_role = 'admin' and p_role = 'member' then
    select count(*) into v_admin_count from public.group_members
    where group_id = p_group_id and role = 'admin';

    if v_admin_count = 1 then
      raise exception 'LAST_ADMIN';
    end if;
  end if;

  update public.group_members
  set role = p_role
  where group_id = p_group_id and user_id = p_user_id;
end
$$;

-- RLS Policies: profiles
create policy "Users can see their own profile or profiles of people in shared groups"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.shares_group(id));

create policy "Users can only update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

revoke update on public.profiles from authenticated, anon;
grant update (display_name, nickname, position) on public.profiles to authenticated;

-- RLS Policies: groups
create policy "Users can see groups they are members of"
on public.groups
for select
to authenticated
using (public.is_group_member(id));

create policy "Users can only update their own group as admin"
on public.groups
for update
to authenticated
using (public.is_group_admin(id))
with check (public.is_group_admin(id));

revoke update on public.groups from authenticated, anon;
grant update (name) on public.groups to authenticated;

-- RLS Policies: group_members
create policy "Users can see group members of groups they belong to"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));

-- Revoke and grant permissions for RPCs
revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.join_group(text) to authenticated;

revoke execute on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;

revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

revoke execute on function public.set_member_role(uuid, uuid, member_role) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, member_role) to authenticated;

-- Helpers: solo usuarios logueados (las políticas son `to authenticated`)
revoke execute on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke execute on function public.is_group_admin(uuid) from public, anon;
grant execute on function public.is_group_admin(uuid) to authenticated;
revoke execute on function public.shares_group(uuid) from public, anon;
grant execute on function public.shares_group(uuid) to authenticated;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;

-- El trigger corre como dueño; nadie lo llama por la API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
