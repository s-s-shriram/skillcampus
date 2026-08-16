-- SkillCampus college-wide role foundation
-- Roles: student, faculty, hod, placement_officer, principal

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS college_name text;

-- Keep the existing role column and constrain it to supported SkillCampus roles.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('student','faculty','hod','placement_officer','principal','admin'));

CREATE INDEX IF NOT EXISTS profiles_department_idx
ON public.profiles(department);

-- Helper: current user's role.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Helper: users with college-level management access.
CREATE OR REPLACE FUNCTION public.is_college_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text IN ('principal','placement_officer','admin')
     FROM public.profiles WHERE id = auth.uid()), false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_college_manager() TO authenticated;

-- Helper: department managers (HOD) plus college managers.
CREATE OR REPLACE FUNCTION public.is_department_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text IN ('hod','principal','placement_officer','admin')
     FROM public.profiles WHERE id = auth.uid()), false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_department_manager() TO authenticated;

-- Safe profile visibility: users see themselves; college managers see college profiles;
-- HODs/faculty can be given department-specific policies in the next phase.
DROP POLICY IF EXISTS "profiles_select_college_managers" ON public.profiles;
CREATE POLICY "profiles_select_college_managers"
ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_college_manager()
  OR (
    public.is_department_manager()
    AND department = (SELECT department FROM public.profiles WHERE id = auth.uid())
  )
);

-- Prevent ordinary users from changing their own privileged role/department through the
-- client. Profile updates remain restricted to the existing owner policy until an admin
-- management screen is added.
