-- SkillCampus Phase 1: Programming practice foundation
-- Supports MCQ/output/debugging questions now and isolated code execution later.

create table if not exists public.programming_questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  question text not null,
  language text not null check (language in ('c','cpp','java','python','sql')),
  topic text not null,
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  question_type text not null default 'mcq' check (question_type in ('mcq','output','debugging','concept','sql')),
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text not null,
  explanation text,
  is_published boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists programming_questions_filter_idx
on public.programming_questions(language, topic, difficulty, is_published);

alter table public.programming_questions enable row level security;
grant select, insert, update, delete on public.programming_questions to authenticated;

drop policy if exists "programming_questions_student_read" on public.programming_questions;
create policy "programming_questions_student_read"
on public.programming_questions for select to authenticated
using (is_published = true or created_by = auth.uid() or public.is_content_manager());

drop policy if exists "programming_questions_manager_insert" on public.programming_questions;
create policy "programming_questions_manager_insert"
on public.programming_questions for insert to authenticated
with check (public.is_content_manager() and created_by = auth.uid());

drop policy if exists "programming_questions_manager_update" on public.programming_questions;
create policy "programming_questions_manager_update"
on public.programming_questions for update to authenticated
using (public.is_content_manager()) with check (public.is_content_manager());

drop policy if exists "programming_questions_manager_delete" on public.programming_questions;
create policy "programming_questions_manager_delete"
on public.programming_questions for delete to authenticated
using (public.is_content_manager());

create table if not exists public.coding_problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  language text not null check (language in ('c','cpp','java','python','sql')),
  topic text not null,
  difficulty text not null default 'easy' check (difficulty in ('easy','medium','hard')),
  input_format text,
  output_format text,
  constraints text,
  starter_code text,
  sample_input text,
  sample_output text,
  time_limit_ms integer not null default 2000,
  memory_limit_mb integer not null default 256,
  is_published boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists coding_problems_filter_idx
on public.coding_problems(language, topic, difficulty, is_published);

alter table public.coding_problems enable row level security;
grant select, insert, update, delete on public.coding_problems to authenticated;

drop policy if exists "coding_problems_student_read" on public.coding_problems;
create policy "coding_problems_student_read"
on public.coding_problems for select to authenticated
using (is_published = true or created_by = auth.uid() or public.is_content_manager());

drop policy if exists "coding_problems_manager_insert" on public.coding_problems;
create policy "coding_problems_manager_insert"
on public.coding_problems for insert to authenticated
with check (public.is_content_manager() and created_by = auth.uid());

drop policy if exists "coding_problems_manager_update" on public.coding_problems;
create policy "coding_problems_manager_update"
on public.coding_problems for update to authenticated
using (public.is_content_manager()) with check (public.is_content_manager());

drop policy if exists "coding_problems_manager_delete" on public.coding_problems;
create policy "coding_problems_manager_delete"
on public.coding_problems for delete to authenticated
using (public.is_content_manager());

-- Test cases are stored separately so hidden cases never need to be exposed to students.
create table if not exists public.coding_test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.coding_problems(id) on delete cascade,
  input text not null,
  expected_output text not null,
  is_hidden boolean not null default true,
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default now()
);

create index if not exists coding_test_cases_problem_idx
on public.coding_test_cases(problem_id);

alter table public.coding_test_cases enable row level security;
grant select, insert, update, delete on public.coding_test_cases to authenticated;

drop policy if exists "coding_test_cases_student_sample_read" on public.coding_test_cases;
create policy "coding_test_cases_student_sample_read"
on public.coding_test_cases for select to authenticated
using (
  not is_hidden
  and exists (
    select 1 from public.coding_problems p
    where p.id = problem_id and p.is_published = true
  )
);

drop policy if exists "coding_test_cases_manager_all" on public.coding_test_cases;
create policy "coding_test_cases_manager_all"
on public.coding_test_cases for all to authenticated
using (public.is_content_manager())
with check (public.is_content_manager());
