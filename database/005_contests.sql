-- SkillCampus contests and leaderboard
create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  test_id uuid not null references public.tests(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists contests_schedule_idx on public.contests(starts_at, ends_at);

alter table public.contests enable row level security;
grant select, insert, update, delete on public.contests to authenticated;

drop policy if exists "contests_student_read" on public.contests;
create policy "contests_student_read" on public.contests
for select to authenticated
using (status = 'published' or created_by = auth.uid() or public.is_content_manager());

drop policy if exists "contests_manager_insert" on public.contests;
create policy "contests_manager_insert" on public.contests
for insert to authenticated
with check (public.is_content_manager() and created_by = auth.uid());

drop policy if exists "contests_manager_update" on public.contests;
create policy "contests_manager_update" on public.contests
for update to authenticated
using (public.is_content_manager()) with check (public.is_content_manager());

drop policy if exists "contests_manager_delete" on public.contests;
create policy "contests_manager_delete" on public.contests
for delete to authenticated
using (public.is_content_manager());

-- Leaderboard is calculated from submitted test attempts for the contest's linked test.
create or replace function public.get_contest_leaderboard(p_contest_id uuid)
returns table(rank bigint, student_name text, score numeric, correct_count integer, wrong_count integer)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (order by a.score desc, a.submitted_at asc) as rank,
      coalesce(p.full_name, 'Student') as student_name,
      a.score,
      a.correct_count,
      a.wrong_count
    from public.contests c
    join public.test_attempts a on a.test_id = c.test_id and a.status = 'submitted'
    join public.profiles p on p.id = a.student_id
    where c.id = p_contest_id
  )
  select rank, student_name, score, correct_count, wrong_count
  from ranked
  order by rank
  limit 100;
$$;

grant execute on function public.get_contest_leaderboard(uuid) to authenticated;
