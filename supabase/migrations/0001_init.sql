-- StitchBook: initial schema, row-level security and private photo storage.
-- Run in the Supabase SQL editor, or with `supabase db push`.
-- Safe rules: no service-role key in the browser; admins are decided only here, never by the client.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 60),
  email       text not null,
  role        text not null default 'worker' check (role in ('worker','admin')),
  status      text not null default 'pending' check (status in ('pending','active','inactive')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- New sign-ups always start as a pending worker, whatever the client sends.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email,'@',1)),
          new.email, 'worker', 'pending');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper checks used by policies. security definer so they can read profiles without recursion.
create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and role = 'admin');
$$;

-- ----------------------------------------------------------- production records
create table public.production_records (
  id             uuid primary key default gen_random_uuid(),
  worker_id      uuid not null references public.profiles(id),
  work_date      date not null check (work_date <= current_date),
  machine_no     text not null check (machine_no ~ '^[A-Za-z0-9][A-Za-z0-9 _/-]{0,19}$'),
  work_count     integer not null check (work_count between 1 and 9999),
  stitch_count   integer not null check (stitch_count between 1 and 9999999),
  fabric_length  numeric generated always as (work_count * 6) stored,  -- work count x 6 metres
  notes          text check (char_length(notes) <= 300),
  client_key     uuid,                                                 -- idempotency for double-submits
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (worker_id, work_date, machine_no),                           -- one record per worker, machine, day
  unique (worker_id, client_key)
);
create index on public.production_records (work_date);
create index on public.production_records (worker_id, work_date desc);

create table public.record_edits (
  id         uuid primary key default gen_random_uuid(),
  record_id  uuid not null references public.production_records(id) on delete cascade,
  edited_by  uuid not null references public.profiles(id),
  reason     text not null check (char_length(reason) >= 5),
  changes    jsonb not null,
  created_at timestamptz not null default now()
);

create table public.record_photos (
  id           uuid primary key default gen_random_uuid(),
  record_id    uuid not null references public.production_records(id) on delete cascade,
  storage_path text not null unique,
  size_bytes   integer not null check (size_bytes <= 12582912),
  mime_type    text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  created_at   timestamptz not null default now()
);
create index on public.record_photos (record_id);

-- A record needs 2 to 12 photos once submitted. Enforced when the client calls submit_record().
create or replace function public.photo_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.record_photos where record_id = new.record_id) >= 12 then
    raise exception 'A record can have at most 12 photos';
  end if;
  return new;
end $$;
create trigger record_photos_limit before insert on public.record_photos
  for each row execute function public.photo_limit();

-- Workers may edit their own record for 2 days. Admins may edit any record.
create or replace function public.can_edit_record(r public.production_records) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or (r.worker_id = auth.uid() and public.is_active() and r.work_date >= current_date - 2);
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger production_records_touch before update on public.production_records
  for each row execute function public.touch_updated_at();

-- Workers cannot move a record to another worker or change its date.
create or replace function public.guard_record_update() returns trigger
language plpgsql as $$
begin
  if new.worker_id <> old.worker_id then raise exception 'Owner cannot be changed'; end if;
  if new.work_date <> old.work_date and not public.is_admin() then raise exception 'Only an admin can change the date'; end if;
  return new;
end $$;
create trigger production_records_guard before update on public.production_records
  for each row execute function public.guard_record_update();

-- ---------------------------------------------------------------- audit log
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id),
  action     text not null,
  detail     text not null,
  created_at timestamptz not null default now()
);

create or replace function public.log_audit(p_action text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log (actor_id, action, detail) values (auth.uid(), p_action, p_detail);
$$;

-- Append-only: nobody, including admins, can update or delete rows.
create or replace function public.audit_immutable() returns trigger
language plpgsql as $$ begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_no_update before update or delete on public.audit_log
  for each row execute function public.audit_immutable();

-- Audit sensitive actions automatically so the client cannot skip them.
create or replace function public.audit_profile_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, detail)
    values (auth.uid(), 'status_change', new.full_name || ' (' || new.email || '): ' || old.status || ' -> ' || new.status);
  end if;
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, detail)
    values (auth.uid(), 'role_change', new.full_name || ' (' || new.email || '): ' || old.role || ' -> ' || new.role);
  end if;
  return new;
end $$;
create trigger profiles_audit after update on public.profiles
  for each row execute function public.audit_profile_change();

create or replace function public.audit_record_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, action, detail)
    values (auth.uid(), 'record_create', 'Record ' || new.work_date || ' machine ' || new.machine_no || ', ' || new.work_count || ' units');
  else
    insert into public.audit_log (actor_id, action, detail)
    values (auth.uid(), 'record_edit', 'Record ' || new.id || ' (' || new.work_date || ', ' || new.machine_no || ') updated');
  end if;
  return new;
end $$;
create trigger records_audit after insert or update on public.production_records
  for each row execute function public.audit_record_change();

-- Role and status can only be changed by an admin, and an admin cannot remove the last admin.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL editor and server-side jobs, so first-admin setup still works.
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.status is distinct from old.status
          or new.email is distinct from old.email) and not public.is_admin() then
    raise exception 'Only an admin can change role, status or email';
  end if;
  if old.role = 'admin' and old.status = 'active'
     and (new.role <> 'admin' or new.status <> 'active')
     and (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
    raise exception 'Cannot remove the last active admin';
  end if;
  if new.status = 'active' and old.status <> 'active' then
    new.approved_by = auth.uid(); new.approved_at = now();
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ------------------------------------------------------------------ RLS
alter table public.profiles            enable row level security;
alter table public.production_records  enable row level security;
alter table public.record_photos       enable row level security;
alter table public.record_edits        enable row level security;
alter table public.audit_log           enable row level security;

-- profiles
create policy profiles_read   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin())
                                                   with check (id = auth.uid() or public.is_admin());
-- no insert/delete policies: rows are created by the auth trigger only

-- production records
create policy records_read   on public.production_records for select
  using (public.is_admin() or (worker_id = auth.uid() and public.is_active()));
create policy records_insert on public.production_records for insert
  with check (worker_id = auth.uid() and public.is_active() and work_date >= current_date - 2);
create policy records_update on public.production_records for update
  using (public.can_edit_record(production_records)) with check (public.can_edit_record(production_records));
-- no delete policy: records are corrected, not removed

-- photos follow their record
create policy photos_read on public.record_photos for select using (
  exists (select 1 from public.production_records r where r.id = record_id
          and (public.is_admin() or (r.worker_id = auth.uid() and public.is_active()))));
create policy photos_insert on public.record_photos for insert with check (
  exists (select 1 from public.production_records r where r.id = record_id and public.can_edit_record(r)));
create policy photos_delete on public.record_photos for delete using (
  exists (select 1 from public.production_records r where r.id = record_id and public.can_edit_record(r)));

-- correction history
create policy edits_read on public.record_edits for select using (
  exists (select 1 from public.production_records r where r.id = record_id
          and (public.is_admin() or (r.worker_id = auth.uid() and public.is_active()))));
create policy edits_insert on public.record_edits for insert with check (
  edited_by = auth.uid()
  and exists (select 1 from public.production_records r where r.id = record_id and public.can_edit_record(r)));

-- audit: admins read; writes only through triggers and log_audit()
create policy audit_read on public.audit_log for select using (public.is_admin());

-- Submit a record with its photos in one step, rejecting fewer than 2 photos.
create or replace function public.submit_record(
  p_date date, p_machine text, p_work int, p_stitch int, p_notes text, p_client_key uuid, p_photos jsonb
) returns uuid language plpgsql security invoker as $$
declare rid uuid; p jsonb; n int := coalesce(jsonb_array_length(p_photos), 0);
begin
  if n < 2 or n > 12 then raise exception 'Attach 2 to 12 photos (got %)', n; end if;
  insert into public.production_records (worker_id, work_date, machine_no, work_count, stitch_count, notes, client_key)
  values (auth.uid(), p_date, upper(trim(p_machine)), p_work, p_stitch, nullif(trim(p_notes), ''), p_client_key)
  on conflict (worker_id, client_key) do nothing
  returning id into rid;
  if rid is null then  -- repeated click or retry: return the original record
    select id into rid from public.production_records where worker_id = auth.uid() and client_key = p_client_key;
    return rid;
  end if;
  for p in select * from jsonb_array_elements(p_photos) loop
    insert into public.record_photos (record_id, storage_path, size_bytes, mime_type)
    values (rid, p->>'path', (p->>'size')::int, p->>'mime');
  end loop;
  return rid;
end $$;

-- ------------------------------------------------------------- photo storage
-- Private bucket. Files live at  <worker_id>/<record_id>/<file>. Browsers use short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('production-photos', 'production-photos', false, 12582912, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy photos_obj_read on storage.objects for select using (
  bucket_id = 'production-photos'
  and (public.is_admin() or ((storage.foldername(name))[1] = auth.uid()::text and public.is_active())));
create policy photos_obj_insert on storage.objects for insert with check (
  bucket_id = 'production-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active());
create policy photos_obj_delete on storage.objects for delete using (
  bucket_id = 'production-photos'
  and (public.is_admin() or ((storage.foldername(name))[1] = auth.uid()::text and public.is_active())));

-- ------------------------------------------------------------------ reports
create or replace view public.production_summary with (security_invoker = true) as
select r.work_date, r.worker_id, p.full_name, count(*) as records,
       sum(r.work_count) as work_count, sum(r.stitch_count) as stitch_count, sum(r.fabric_length) as fabric_length
from public.production_records r join public.profiles p on p.id = r.worker_id
group by r.work_date, r.worker_id, p.full_name;
