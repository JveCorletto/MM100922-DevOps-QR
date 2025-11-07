-- Activar RLS
alter table public.profiles enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.responses enable row level security;
alter table public.response_items enable row level security;
alter table public.audit_log enable row level security;

-- Helpers
create policy "read_own_profile" on public.profiles
for select to authenticated
using ( id = auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') );

create policy "update_own_profile" on public.profiles
for update to authenticated
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- surveys
create policy "owner_crud_surveys" on public.surveys
for all to authenticated
using ( owner_id = auth.uid() )
with check ( owner_id = auth.uid() );

create policy "admin_all_surveys" on public.surveys
for all to authenticated
using ( exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') )
with check ( exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') );

create policy "public_read_published_surveys" on public.surveys
for select to anon
using ( status = 'published' );

-- questions
create policy "owner_crud_questions" on public.survey_questions
for all to authenticated
using ( exists (select 1 from public.surveys s where s.id=survey_id and s.owner_id=auth.uid()) )
with check ( exists (select 1 from public.surveys s where s.id=survey_id and s.owner_id=auth.uid()) );

create policy "public_read_questions_of_published" on public.survey_questions
for select to anon
using ( exists (select 1 from public.surveys s where s.id=survey_id and s.status='published') );

-- responses: allow anonymous inserts; creators/admins aggregate reads
create policy "anon_insert_responses" on public.responses
for insert to anon
with check ( true );

create policy "owner_read_responses" on public.responses
for select to authenticated
using ( exists (select 1 from public.surveys s where s.id=survey_id and s.owner_id=auth.uid()) );

-- response_items
create policy "anon_insert_response_items" on public.response_items
for insert to anon
with check ( true );

create policy "owner_read_response_items" on public.response_items
for select to authenticated
using ( exists (
  select 1 from public.responses r
  join public.surveys s on s.id = r.survey_id
  where r.id = response_id and s.owner_id = auth.uid()
) );

-- audit_log
create policy "admin_read_audit" on public.audit_log
for select to authenticated
using ( exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') );

create policy "owner_read_audit_own" on public.audit_log
for select to authenticated
using ( exists (
  select 1 from public.surveys s where s.owner_id = auth.uid() and s.id = audit_log.target_id
) );
