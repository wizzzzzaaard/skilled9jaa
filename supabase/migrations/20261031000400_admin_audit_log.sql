-- Record of every change an admin makes through the admin-actions function.
-- Status: NOT APPLIED. Only the service role writes; admins read through the function.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  detail jsonb not null default '{}'::jsonb,
  reason text
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
-- No policies: the browser can neither read nor write it directly.
