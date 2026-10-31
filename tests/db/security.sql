-- Database security checks. Run on a Supabase BRANCH after applying the
-- migrations, never on production:  psql "$BRANCH_DB_URL" -f tests/db/security.sql
-- Every block raises an exception if the protection is missing; the whole
-- script runs in a transaction that is rolled back.

begin;

-- A throwaway signed-in user.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'sec-test@example.com',
        '{"full_name":"Sec Test","is_artisan":true,"signup_niche":"plumbers","utm_source":"whatsapp"}');

do $$
begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001'
                 and signup_niche = 'plumbers' and utm_source = 'whatsapp') then
    raise exception 'FAIL: signup attribution not copied to profile';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- 1. A user cannot make themselves admin or active.
do $$
begin
  begin
    update public.profiles set is_admin = true where id = auth.uid();
    raise exception 'FAIL: user could set is_admin';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set account_status = 'active' where id = auth.uid();
    raise exception 'FAIL: user could set account_status';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 2. Safe columns still work.
update public.profiles set bio = 'Plumber in Yaba' where id = auth.uid();

-- 3. Non-admin cannot approve payments.
do $$
begin
  begin
    perform public.approve_payment('00000000-0000-4000-8000-000000000001'::uuid);
    raise exception 'FAIL: non-admin could approve a payment';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 4. complete_signup activates only the caller.
select public.complete_signup();
do $$
begin
  if (select account_status from public.profiles where id = auth.uid()) <> 'active' then
    raise exception 'FAIL: complete_signup did not activate the account';
  end if;
end $$;

-- 5. Orders: cannot insert for someone else, cannot update own.
do $$
begin
  begin
    insert into public.orders (user_id, amount, status, order_type)
    values ('00000000-0000-4000-8000-000000000002', 100, 'pending', 'artisan_subscription');
    raise exception 'FAIL: user created an order for someone else';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

reset role;

-- 6. Logged-out callers cannot run admin functions at all.
set local role anon;
do $$
begin
  begin
    perform public.approve_job_payment(gen_random_uuid());
    raise exception 'FAIL: anon could call approve_job_payment';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
