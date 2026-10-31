-- ============================================================================
-- Skilled9ja: security lockdown + signup attribution
-- Status: NOT APPLIED. Test on a Supabase branch first, then apply to
-- "skilled9ja improved" after review. Safe with the code on branch
-- feat/niche-landing-pages (it no longer sets account_status from the browser).
-- ============================================================================

begin;

-- ── 1. Signup attribution ───────────────────────────────────────────────────
alter table public.profiles
  add column if not exists signup_niche   text,
  add column if not exists utm_source     text,
  add column if not exists utm_medium     text,
  add column if not exists utm_campaign   text,
  add column if not exists utm_content    text,
  add column if not exists referral_code  text,
  add column if not exists consent_terms_at timestamptz;

create index if not exists profiles_signup_niche_idx on public.profiles (signup_niche);

-- Copy the landing-page tags the browser sends in user metadata into the profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  clip constant int := 64;
begin
  insert into public.profiles (
    id, full_name, email, phone_number,
    is_client, is_artisan, is_home_service_provider, is_company,
    account_status, active_mode, signup_step, is_mock, is_published,
    signup_niche, utm_source, utm_medium, utm_campaign, utm_content, referral_code, consent_terms_at
  ) values (
    new.id,
    left(coalesce(m->>'full_name', ''), 80),
    new.email,
    left(coalesce(m->>'phone_number', ''), 20),
    coalesce((m->>'is_client')::boolean, true),
    coalesce((m->>'is_artisan')::boolean, false),
    coalesce((m->>'is_home_service_provider')::boolean, false),
    coalesce((m->>'is_company')::boolean, false),
    'incomplete'::account_status_enum,
    'client'::active_mode_enum,
    1, false, false,
    left(m->>'signup_niche', clip),
    left(m->>'utm_source', clip),
    left(m->>'utm_medium', clip),
    left(m->>'utm_campaign', clip),
    left(m->>'utm_content', clip),
    left(m->>'ref', clip),
    case when m ? 'consent_terms_at' then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2. Profiles: users may only edit safe columns ──────────────────────────
-- Before: any user could set is_admin, account_status, payment_status, etc.
revoke update on public.profiles from anon, authenticated;
grant update (
  full_name, bio, phone_number, additional_phone_number, profile_image_url,
  state, city, lga, landmarks, latitude, longitude,
  whatsapp_url, telegram_url, linkedin_url, instagram_url, twitter,
  company_name, company_description, company_website, company_size, industry,
  business_type, company_logo_url, hr_contact_name, hr_contact_phone, hr_contact_email,
  provider_bio, years_of_experience, is_available_now,
  is_client, is_artisan, is_company, is_home_service_provider, active_mode,
  signup_step, updated_at
) on public.profiles to authenticated;
revoke insert, delete, truncate on public.profiles from anon, authenticated;

-- Finish signup on the server (free signup). Moves only the caller's own
-- unfinished account to active.
create or replace function public.complete_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.profiles
     set account_status = 'active',
         signup_step = 6,
         signup_completed_at = now()
   where id = auth.uid()
     and account_status in ('incomplete', 'pending_payment', 'pending_manual');
end;
$$;
revoke all on function public.complete_signup() from public, anon;
grant execute on function public.complete_signup() to authenticated;

-- ── 3. Admin-only functions must check for an admin ────────────────────────
create or replace function public.approve_payment(user_id_to_approve uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_current_user_admin(), false) then
    raise exception 'admins only' using errcode = '42501';
  end if;
  update public.profiles
     set payment_status = 'verified',
         is_published = true,
         subscription_expires_at = now() + interval '1 year'
   where id = user_id_to_approve;
end;
$$;

create or replace function public.approve_job_payment(job_id_to_approve uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_current_user_admin(), false) then
    raise exception 'admins only' using errcode = '42501';
  end if;
  update public.jobs set payment_status = 'verified', status = 'active' where id = job_id_to_approve;
end;
$$;

revoke all on function public.approve_payment(uuid) from public, anon;
revoke all on function public.approve_job_payment(uuid) from public, anon;
grant execute on function public.approve_payment(uuid) to authenticated;      -- still checks admin inside
grant execute on function public.approve_job_payment(uuid) to authenticated;  -- still checks admin inside

-- Trigger functions are never meant to be called over the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_wallet_for_new_user() from public, anon, authenticated;

-- Only the booking's provider may enter its start code.
create or replace function public.use_booking_start_code(p_booking_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_record booking_start_codes%rowtype;
  v_booking     bookings%rowtype;
  v_duration    integer;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found or v_booking.provider_id is distinct from auth.uid() then
    return jsonb_build_object('success', false, 'error', 'Booking not found');
  end if;

  select * into v_code_record from booking_start_codes where booking_id = p_booking_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Code not found');
  end if;
  if v_code_record.is_used then
    return jsonb_build_object('success', false, 'error', 'Code already used');
  end if;
  if v_code_record.attempts >= v_code_record.max_attempts then
    return jsonb_build_object('success', false, 'error', 'Too many attempts, contact support');
  end if;
  if v_code_record.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'Code expired');
  end if;

  if v_code_record.code <> p_code then
    update booking_start_codes set attempts = attempts + 1 where booking_id = p_booking_id;
    if v_code_record.attempts + 1 >= v_code_record.max_attempts then
      update bookings set status = 'disputed', dispute_reason = 'Max code attempts reached' where id = p_booking_id;
    end if;
    return jsonb_build_object('success', false, 'error', 'Incorrect code',
      'attempts_left', v_code_record.max_attempts - v_code_record.attempts - 1);
  end if;

  v_duration := coalesce(v_booking.duration_mins, 60);
  update bookings set
    status = 'started',
    work_started_at = now(),
    auto_release_at = now() + make_interval(mins => v_duration),
    updated_at = now()
  where id = p_booking_id;
  update booking_start_codes set is_used = true, used_at = now() where booking_id = p_booking_id;

  return jsonb_build_object('success', true, 'started_at', now(),
    'auto_release_at', now() + make_interval(mins => v_duration));
end;
$$;
revoke all on function public.use_booking_start_code(uuid, text) from public, anon;
grant execute on function public.use_booking_start_code(uuid, text) to authenticated;

-- ── 4. Jobs: employers can't mark their own job as paid ────────────────────
create or replace function public.guard_job_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  posting_is_paid boolean;
begin
  -- Admins and the service role (webhooks) may change anything.
  if coalesce(public.is_current_user_admin(), false) or auth.role() = 'service_role' then
    return new;
  end if;

  select coalesce(is_paid, false) into posting_is_paid from job_posting_settings limit 1;

  if tg_op = 'INSERT' then
    new.payment_status := case when posting_is_paid then 'unpaid' else 'verified' end;
    new.tier := 'free';
  else
    new.payment_status := old.payment_status;
    new.tier := old.tier;
  end if;

  if new.status = 'active' and new.payment_status is distinct from 'verified' then
    new.status := 'pending_payment';
  end if;
  return new;
end;
$$;

-- Employers must still see their own jobs while they wait for payment.
drop policy if exists "Employers can view their own jobs" on public.jobs;
create policy "Employers can view their own jobs" on public.jobs
  for select to authenticated using (employer_id = auth.uid() or public.is_current_user_admin());

drop trigger if exists trg_guard_job_payment_fields on public.jobs;
create trigger trg_guard_job_payment_fields
  before insert or update on public.jobs
  for each row execute function public.guard_job_payment_fields();

-- ── 5. Tables that had no access rules at all ──────────────────────────────
alter table public.orders                    enable row level security;
alter table public.admin_users               enable row level security;  -- no policies: service role only
alter table public.site_settings             enable row level security;
alter table public.perks                     enable row level security;
alter table public.job_perks                 enable row level security;
alter table public.job_skills                enable row level security;
alter table public.business_types            enable row level security;
alter table public.marketplace_pricing_tiers enable row level security;
-- spatial_ref_sys belongs to PostGIS; move the extension out of "public" instead
-- (Supabase docs: database linter 0014).

-- orders: users see and start their own; only the server or an admin changes them.
create policy "Users view own orders" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_current_user_admin());
create policy "Users start own pending orders" on public.orders
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and amount > 0);
create policy "Admins update orders" on public.orders
  for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());

-- Reference data: anyone reads, admins write.
do $$
declare t text;
begin
  foreach t in array array['site_settings','perks','business_types','marketplace_pricing_tiers','job_skills','job_perks'] loop
    execute format('create policy "Anyone can read %1$s" on public.%1$I for select using (true)', t);
    execute format('create policy "Admins write %1$s" on public.%1$I for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin())', t);
  end loop;
end $$;

-- Employers attach perks and skills to their own jobs.
create policy "Employers manage perks on own jobs" on public.job_perks
  for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_perks.job_id and j.employer_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = job_perks.job_id and j.employer_id = auth.uid()));
create policy "Employers manage skills on own jobs" on public.job_skills
  for all to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_skills.job_id and j.employer_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = job_skills.job_id and j.employer_id = auth.uid()));

-- ── 6. Bills: look up one bill by its token, never list them all ───────────
drop policy if exists "Anyone can view bill by token" on public.custom_bills;

create or replace function public.get_bill_by_token(p_token text)
returns setof public.custom_bills
language sql
stable
security definer
set search_path = public
as $$
  select * from public.custom_bills
   where token = p_token and length(p_token) >= 32 and status in ('sent', 'paid')
   limit 1;
$$;
revoke all on function public.get_bill_by_token(text) from public;
grant execute on function public.get_bill_by_token(text) to anon, authenticated;

-- ── 7. Views and functions flagged by the security advisor ─────────────────
alter view public.wallet_balances set (security_invoker = true);
alter view public.v_listings_with_payments set (security_invoker = true);

alter function public.calculate_listing_fee(numeric, boolean) set search_path = public;
alter function public.release_escrow_funds(uuid) set search_path = public;
alter function public.get_nearby_providers(numeric, numeric, numeric, uuid) set search_path = public;
alter function public.handle_artisan_mode_change() set search_path = public;
alter function public.increment_job_applications_count() set search_path = public;
alter function public.decrement_job_applications_count() set search_path = public;
alter function public.update_jobs_updated_at() set search_path = public;
alter function public.create_wallet_for_new_user() set search_path = public;
alter function public.approve_payment(uuid, uuid) set search_path = public;
alter function public.auto_create_listing_payment() set search_path = public;

-- release_escrow_funds moves money: never callable from the browser.
revoke all on function public.release_escrow_funds(uuid) from public, anon, authenticated;
revoke all on function public.approve_payment(uuid, uuid) from public, anon;

commit;

-- After applying: run the security advisor again, then the database tests in
-- tests/db/security.sql.
