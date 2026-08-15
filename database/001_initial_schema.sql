-- SkillCampus initial database schema
-- Apply this in Supabase SQL Editor after reviewing.
-- RLS is enabled on all application tables.

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin');
create type public.question_type as enum ('aptitude', 'logical_reasoning', 'verbal', 'technical_mcq', 'coding', 'sql');
create type public.difficulty_level as enum ('easy', 'medium', 'hard');
create type public.test_status as enum ('draft', 'published', 'closed');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'student',
  department_id uuid references public.departments(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  question_text text not null,
  question_type public.question_type not null,
  difficulty public.difficulty_level not null default 'easy',
  topic text,
  options jsonb,
  correct_answer text,
  explanation text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coding_test_cases (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  input_data text not null,
  expected_output text not null,
  is_hidden boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  total_marks integer not null check (total_marks > 0),
  negative_mark numeric(5,2) not null default 0,
  status public.test_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.test_questions (
  test_id uuid not null references public.tests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  marks numeric(6,2) not null default 1 check (marks > 0),
  question_order integer not null,
  primary key (test_id, question_id)
);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(8,2),
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  unique (test_id, student_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  language text,
  source_code text,
  status text,
  score numeric(8,2),
  execution_time_ms integer,
  submitted_at timestamptz not null default now()
);

create table public.contests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.contest_questions (
  contest_id uuid not null references public.contests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  points integer not null default 1 check (points > 0),
  question_order integer not null,
  primary key (contest_id, question_id)
);

create table public.contest_participants (
  contest_id uuid not null references public.contests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  total_score numeric(8,2) not null default 0,
  primary key (contest_id, student_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.student_achievements (
  student_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (student_id, achievement_id)
);

create index profiles_department_idx on public.profiles(department_id);
create index questions_type_idx on public.questions(question_type);
create index questions_topic_idx on public.questions(topic);
create index questions_created_by_idx on public.questions(created_by);
create index submissions_student_idx on public.submissions(student_id);
create index submissions_question_idx on public.submissions(question_id);
create index test_attempts_student_idx on public.test_attempts(student_id);

-- RLS is enabled now; policies will be added after the role matrix is finalized.
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.coding_test_cases enable row level security;
alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.submissions enable row level security;
alter table public.contests enable row level security;
alter table public.contest_questions enable row level security;
alter table public.contest_participants enable row level security;
alter table public.achievements enable row level security;
alter table public.student_achievements enable row level security;
