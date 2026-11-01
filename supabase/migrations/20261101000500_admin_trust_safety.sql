-- Trust & safety, admin roles, notes, refunds and data requests.
-- Status: NOT APPLIED. Needs 20261031000400_admin_audit_log.sql first.
-- Every admin change still goes through the admin-actions function (service role).

-- 1. Admin roles. "owner" can do everything; "support" handles members and
--    moderation but not money, settings or personal-data requests.
--    Members can't set this: profile updates are limited to a column list
--    (see 20261031000100), and admin_role isn't on it.
alter table public.profiles add column if not exists admin_role text
  check (admin_role in ('owner', 'support'));
update public.profiles set admin_role = 'owner' where is_admin and admin_role is null;

-- 2. Reports from members (scam jobs, fake profiles, abusive posts, reviews).
create table if not exists public.content_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('job', 'profile', 'post', 'review')),
  target_id text not null check (length(target_id) between 1 and 64),
  reason text not null check (reason in ('scam', 'fake', 'abuse', 'spam', 'other')),
  details text check (length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  resolution text
);
create index if not exists content_reports_open_idx on public.content_reports (status, created_at desc);
-- One open report per member per thing.
create unique index if not exists content_reports_once on public.content_reports (reporter_id, target_type, target_id) where status = 'open';

alter table public.content_reports enable row level security;
create policy "Members report as themselves" on public.content_reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'open' and resolved_at is null);
create policy "Members see their own reports" on public.content_reports
  for select to authenticated using (reporter_id = auth.uid());
create policy "Admins read reports" on public.content_reports
  for select to authenticated using (public.is_current_user_admin());
revoke update, delete on public.content_reports from anon, authenticated;

-- At most 20 reports a day per member, so the queue can't be flooded.
create or replace function public.limit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from content_reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Too many reports today' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.limit_reports() from public, anon, authenticated;
drop trigger if exists limit_reports on public.content_reports;
create trigger limit_reports before insert on public.content_reports for each row execute function public.limit_reports();

-- 3. Hiding posts and reviews.
alter table public.posts add column if not exists hidden_at timestamptz;
alter table public.posts add column if not exists hidden_reason text;
drop policy if exists "Allow public read access to posts from PAID users" on public.posts;
create policy "Allow public read access to posts from PAID users" on public.posts
  for select using (
    hidden_at is null
    and exists (select 1 from public.profiles where profiles.id = posts.user_id and profiles.payment_status = 'verified'::payment_status_enum)
  );
-- Owners still see their own hidden posts (existing "own posts" policy).
alter table public.bookings add column if not exists review_hidden boolean not null default false;

-- 4. Private notes on members (admins only, through the function).
create table if not exists public.admin_notes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  body text not null check (length(body) between 1 and 2000)
);
create index if not exists admin_notes_member_idx on public.admin_notes (member_id, created_at desc);
alter table public.admin_notes enable row level security; -- no policies

-- 5. Refund records.
alter table public.orders add column if not exists refunded_at timestamptz;
alter table public.orders add column if not exists refund_amount numeric;
alter table public.user_payments add column if not exists refunded_at timestamptz;
alter table public.user_payments add column if not exists refund_amount integer;

-- 6. Personal-data requests (Nigeria Data Protection Act 2023: access and erasure).
create table if not exists public.data_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('export', 'delete')),
  status text not null default 'open' check (status in ('open', 'done', 'rejected')),
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  note text
);
create unique index if not exists data_requests_once on public.data_requests (user_id, kind) where status = 'open';
alter table public.data_requests enable row level security;
create policy "Members request for themselves" on public.data_requests
  for insert to authenticated with check (user_id = auth.uid() and status = 'open' and completed_at is null);
create policy "Members see their own requests" on public.data_requests
  for select to authenticated using (user_id = auth.uid());
create policy "Admins read data requests" on public.data_requests
  for select to authenticated using (public.is_current_user_admin());
revoke update, delete on public.data_requests from anon, authenticated;

-- 7. Withdrawal requests: members may only create a plain pending request,
--    never one that already looks paid, and only one at a time.
drop policy if exists "Allow users to create their own withdrawal requests" on public.withdrawal_requests;
create policy "Allow users to create their own withdrawal requests" on public.withdrawal_requests
  for insert to authenticated with check (
    auth.uid() = user_id and status = 'pending' and amount >= 1000
    and processed_at is null and processed_by is null and fee_charged is null and net_amount is null and rejection_reason is null
  );
create unique index if not exists withdrawal_one_pending on public.withdrawal_requests (user_id) where status = 'pending';
