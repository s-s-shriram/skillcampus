-- SkillCampus tests and assessment permissions
-- Run after 003_question_bank.sql.

create table if not exists public.test_attempt_answers (
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer text,
  is_correct boolean not null default false,
  marks_awarded numeric(8,2) not null default 0,
  primary key (attempt_id, question_id)
);

create index if not exists test_questions_order_idx
  on public.test_questions(test_id, question_order);
create index if not exists test_attempt_answers_attempt_idx
  on public.test_attempt_answers(attempt_id);

alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.test_attempt_answers enable row level security;

grant select, insert, update, delete on public.tests to authenticated;
grant select, insert, update, delete on public.test_questions to authenticated;
grant select, insert, update on public.test_attempts to authenticated;
grant select, insert, update on public.test_attempt_answers to authenticated;

drop policy if exists "tests_student_read_published" on public.tests;
create policy "tests_student_read_published"
on public.tests for select to authenticated
using (status = 'published' or created_by = auth.uid() or public.is_content_manager());

drop policy if exists "tests_manager_insert" on public.tests;
create policy "tests_manager_insert"
on public.tests for insert to authenticated
with check (public.is_content_manager() and created_by = auth.uid());

drop policy if exists "tests_manager_update" on public.tests;
create policy "tests_manager_update"
on public.tests for update to authenticated
using (public.is_content_manager()) with check (public.is_content_manager());

drop policy if exists "tests_manager_delete" on public.tests;
create policy "tests_manager_delete"
on public.tests for delete to authenticated
using (public.is_content_manager());

drop policy if exists "test_questions_read" on public.test_questions;
create policy "test_questions_read"
on public.test_questions for select to authenticated
using (
  public.is_content_manager()
  or exists (select 1 from public.tests t where t.id = test_id and t.status = 'published')
);

drop policy if exists "test_questions_manager_insert" on public.test_questions;
create policy "test_questions_manager_insert"
on public.test_questions for insert to authenticated
with check (public.is_content_manager());

drop policy if exists "test_questions_manager_update" on public.test_questions;
create policy "test_questions_manager_update"
on public.test_questions for update to authenticated
using (public.is_content_manager()) with check (public.is_content_manager());

drop policy if exists "test_questions_manager_delete" on public.test_questions;
create policy "test_questions_manager_delete"
on public.test_questions for delete to authenticated
using (public.is_content_manager());

drop policy if exists "attempts_student_select" on public.test_attempts;
create policy "attempts_student_select"
on public.test_attempts for select to authenticated
using (student_id = auth.uid() or public.is_content_manager());

drop policy if exists "attempts_student_insert" on public.test_attempts;
create policy "attempts_student_insert"
on public.test_attempts for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists "attempts_student_update" on public.test_attempts;
create policy "attempts_student_update"
on public.test_attempts for update to authenticated
using (student_id = auth.uid() or public.is_content_manager())
with check (student_id = auth.uid() or public.is_content_manager());

drop policy if exists "attempt_answers_student_select" on public.test_attempt_answers;
create policy "attempt_answers_student_select"
on public.test_attempt_answers for select to authenticated
using (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and (a.student_id = auth.uid() or public.is_content_manager()))
);

drop policy if exists "attempt_answers_student_insert" on public.test_attempt_answers;
create policy "attempt_answers_student_insert"
on public.test_attempt_answers for insert to authenticated
with check (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and a.student_id = auth.uid())
);

drop policy if exists "attempt_answers_student_update" on public.test_attempt_answers;
create policy "attempt_answers_student_update"
on public.test_attempt_answers for update to authenticated
using (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and a.student_id = auth.uid())
)
with check (
  exists (select 1 from public.test_attempts a where a.id = attempt_id and a.student_id = auth.uid())
);

-- Secure server-side grading. The client submits only question_id -> selected answer.
create or replace function public.submit_test_attempt(p_attempt_id uuid, p_answers jsonb)
returns table(score numeric, correct_count integer, wrong_count integer, total_questions integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_total integer := 0;
  v_correct integer := 0;
  v_wrong integer := 0;
  v_score numeric(8,2) := 0;
  q record;
  v_answer text;
  v_correct_answer text;
  v_marks numeric(6,2);
  v_negative numeric(5,2);
begin
  select * into v_attempt
  from public.test_attempts
  where id = p_attempt_id and student_id = auth.uid()
  for update;

  if not found then
    raise exception 'Attempt not found';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Attempt is already submitted';
  end if;

  select t.negative_mark into v_negative
  from public.tests t where t.id = v_attempt.test_id;

  for q in
    select tq.question_id, tq.marks, qu.correct_answer
    from public.test_questions tq
    join public.questions qu on qu.id = tq.question_id
    where tq.test_id = v_attempt.test_id
    order by tq.question_order
  loop
    v_total := v_total + 1;
    v_marks := q.marks;
    v_correct_answer := q.correct_answer;
    v_answer := nullif(p_answers ->> q.question_id::text, '');

    if v_answer is not null then
      if v_answer = v_correct_answer then
        v_correct := v_correct + 1;
        v_score := v_score + v_marks;
        insert into public.test_attempt_answers(attempt_id, question_id, selected_answer, is_correct, marks_awarded)
        values (v_attempt.id, q.question_id, v_answer, true, v_marks)
        on conflict (attempt_id, question_id) do update set selected_answer = excluded.selected_answer, is_correct = true, marks_awarded = excluded.marks_awarded;
      else
        v_wrong := v_wrong + 1;
        v_score := v_score - v_negative;
        insert into public.test_attempt_answers(attempt_id, question_id, selected_answer, is_correct, marks_awarded)
        values (v_attempt.id, q.question_id, v_answer, false, -v_negative)
        on conflict (attempt_id, question_id) do update set selected_answer = excluded.selected_answer, is_correct = false, marks_awarded = excluded.marks_awarded;
      end if;
    else
      insert into public.test_attempt_answers(attempt_id, question_id, selected_answer, is_correct, marks_awarded)
      values (v_attempt.id, q.question_id, null, false, 0)
      on conflict (attempt_id, question_id) do update set selected_answer = null, is_correct = false, marks_awarded = 0;
    end if;
  end loop;

  update public.test_attempts
  set submitted_at = now(), score = v_score, correct_count = v_correct, wrong_count = v_wrong, status = 'submitted'
  where id = v_attempt.id;

  return query select v_score, v_correct, v_wrong, v_total;
end;
$$;

grant execute on function public.submit_test_attempt(uuid, jsonb) to authenticated;
