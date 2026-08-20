-- SkillCampus question bank permissions
-- Run after 001_initial_schema.sql and 002_auth_profiles.sql.

create or replace function public.is_content_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin')
  );
$$;

grant execute on function public.is_content_manager() to authenticated;

grant select on table public.questions to authenticated;
grant insert, update, delete on table public.questions to authenticated;

drop policy if exists "questions_student_read_published" on public.questions;
create policy "questions_student_read_published"
on public.questions
for select
to authenticated
using (is_published = true or created_by = auth.uid() or public.is_content_manager());

drop policy if exists "questions_manager_insert" on public.questions;
create policy "questions_manager_insert"
on public.questions
for insert
to authenticated
with check (public.is_content_manager() and created_by = auth.uid());

drop policy if exists "questions_manager_update" on public.questions;
create policy "questions_manager_update"
on public.questions
for update
to authenticated
using (public.is_content_manager())
with check (public.is_content_manager());

drop policy if exists "questions_manager_delete" on public.questions;
create policy "questions_manager_delete"
on public.questions
for delete
to authenticated
using (public.is_content_manager());
