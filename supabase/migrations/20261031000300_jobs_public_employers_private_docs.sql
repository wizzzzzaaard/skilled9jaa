-- ============================================================================
-- Jobs: public employer names, private application documents, no duplicates
-- Status: NOT APPLIED. Apply after 20261031000100 (security lockdown).
-- The app already works without this file and uses it as soon as it exists.
-- ============================================================================
begin;

-- 1. Employer name and logo for job listings, readable by anyone, with no
--    contact details. Lets job pages show who is hiring and lets Google list
--    them in job search (JobPosting needs the hiring organisation's name).
create or replace view public.public_employers
with (security_invoker = false) as
select p.id,
       coalesce(nullif(trim(p.company_name), ''), p.full_name) as name,
       p.company_logo_url as logo_url,
       p.company_website as website,
       p.city,
       p.state
  from public.profiles p
 where p.account_status = 'active'
   and exists (select 1 from public.jobs j where j.employer_id = p.id and j.status = 'active');

grant select on public.public_employers to anon, authenticated;

-- 2. One application per person per job (the app also checks, this makes it certain).
create unique index if not exists job_applications_one_per_person
  on public.job_applications (job_id, applicant_id);

-- 3. Private bucket for CVs and ID documents. Files are reachable only by the
--    applicant and the employer of that job, through short-lived signed links.
insert into storage.buckets (id, name, public)
values ('application-docs', 'application-docs', false)
on conflict (id) do update set public = false;

-- Path layout: <applicant_id>/<job_id>/<file>
create policy "Applicants upload their own documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'application-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Applicants read their own documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'application-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Employers read documents sent to their jobs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'application-docs'
    and exists (
      select 1 from public.jobs j
       where j.id::text = (storage.foldername(name))[2]
         and j.employer_id = auth.uid()
    )
  );

-- 4. Stop anyone listing every file in the public bucket (files stay viewable
--    by direct link, which avatars and post photos need).
drop policy if exists "Public can read files" on storage.objects;
create policy "Public can read files"
  on storage.objects for select
  using (bucket_id = 'skilled-niger-assets' and auth.role() = 'authenticated' or (bucket_id = 'skilled-niger-assets' and name not like 'applications/%'));

commit;
