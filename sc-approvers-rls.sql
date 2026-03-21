-- RLS + grants for sc_approvers.
-- Update the policy "USING" clause to match how store_id maps to auth.uid().

-- RPC to get all approvers, bypassing RLS.
drop function if exists public.get_all_sc_approvers();
create or replace function public.get_all_sc_approvers()
returns setof sc_approvers
language sql
security definer
set search_path = public
as $$
  select * from sc_approvers;
$$;

grant execute on function public.get_all_sc_approvers() to anon, authenticated;

-- RPC to get approvers for a specific store
drop function if exists public.get_sc_approvers_by_store(uuid);
create or replace function public.get_sc_approvers_by_store(p_store_id uuid)
returns setof sc_approvers
language sql
security definer
set search_path = public
as $$
  select * from sc_approvers where store_id = p_store_id;
$$;

grant execute on function public.get_sc_approvers_by_store(uuid) to anon, authenticated;

-- RPCs (plaintext password)
drop function if exists public.sc_upsert_approver(uuid, bigint, text, text, text, text);
drop function if exists public.sc_delete_approver(uuid, bigint);
drop function if exists public.sc_upsert_approver(uuid, uuid, text, text, text, text);
drop function if exists public.sc_delete_approver(uuid, uuid);
create or replace function public.sc_upsert_approver(
  p_store_id uuid,
  p_approver_id uuid,
  p_full_name text,
  p_designation text,
  p_username text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  designation text,
  username text,
  password_hash text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_approver_id is null then
    insert into sc_approvers (store_id, full_name, designation, username, password_hash)
    values (
      p_store_id,
      p_full_name,
      p_designation,
      lower(p_username),
      coalesce(p_password, '')
    )
    returning sc_approvers.id, sc_approvers.full_name, sc_approvers.designation, sc_approvers.username, sc_approvers.password_hash
    into id, full_name, designation, username, password_hash;
  else
    update sc_approvers
    set
      full_name = p_full_name,
      designation = p_designation,
      username = lower(p_username),
      password_hash = coalesce(nullif(p_password, ''), password_hash)
    where sc_approvers.id = p_approver_id
      and sc_approvers.store_id = p_store_id
    returning sc_approvers.id, sc_approvers.full_name, sc_approvers.designation, sc_approvers.username, sc_approvers.password_hash
    into id, full_name, designation, username, password_hash;
  end if;

  return next;
end;
$$;

create or replace function public.sc_delete_approver(
  p_store_id uuid,
  p_approver_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from sc_approvers
  where id = p_approver_id
    and store_id = p_store_id;
end;
$$;

-- Enable RLS (recommended)
alter table sc_approvers enable row level security;

-- Grants for RPC usage (recommended)
grant execute on function public.sc_upsert_approver(uuid, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.sc_delete_approver(uuid, uuid) to anon, authenticated;

-- Refresh PostgREST schema cache after changes
select pg_notify('pgrst', 'reload schema');

-- Optional: direct table access if you ever call the table directly from the client
-- grant select, insert, update, delete on table sc_approvers to anon, authenticated;

-- This file stores plaintext passwords in password_hash (hashing disabled).

-- Policy option A: store_id is auth.uid()
-- create policy "sc_approvers_select"
-- on sc_approvers
-- for select
-- using (store_id = auth.uid());

-- create policy "sc_approvers_insert"
-- on sc_approvers
-- for insert
-- with check (store_id = auth.uid());

-- create policy "sc_approvers_update"
-- on sc_approvers
-- for update
-- using (store_id = auth.uid())
-- with check (store_id = auth.uid());

-- create policy "sc_approvers_delete"
-- on sc_approvers
-- for delete
-- using (store_id = auth.uid());

-- Policy option B: store_id maps via a user -> store table
-- Replace sc_users and columns to match your schema.
-- create policy "sc_approvers_select"
-- on sc_approvers
-- for select
-- using (
--   store_id = (
--     select store_id from sc_users
--     where user_id = auth.uid()
--   )
-- );
--
-- create policy "sc_approvers_insert"
-- on sc_approvers
-- for insert
-- with check (
--   store_id = (
--     select store_id from sc_users
--     where user_id = auth.uid()
--   )
-- );
--
-- create policy "sc_approvers_update"
-- on sc_approvers
-- for update
-- using (
--   store_id = (
--     select store_id from sc_users
--     where user_id = auth.uid()
--   )
-- )
-- with check (
--   store_id = (
--     select store_id from sc_users
--     where user_id = auth.uid()
--   )
-- );
--
-- create policy "sc_approvers_delete"
-- on sc_approvers
-- for delete
-- using (
--   store_id = (
--     select store_id from sc_users
--     where user_id = auth.uid()
--   )
-- );
