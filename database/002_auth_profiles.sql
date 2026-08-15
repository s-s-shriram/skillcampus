-- SkillCampus authentication/profile bootstrap
-- Run this once in Supabase SQL Editor after 001_initial_schema.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Authenticated users can read their own profile.
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Authenticated users can see departments for registration/profile display.
create policy "departments_select_authenticated"
on public.departments
for select
to authenticated
using (true);
