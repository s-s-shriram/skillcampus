# SkillCampus Database

The production database will use PostgreSQL through Supabase.

Core entities planned for Phase 1:

- profiles and roles
- departments
- aptitude questions and options
- coding problems and test cases
- tests and test questions
- contests and contest problems
- test attempts
- coding submissions
- contest participants
- leaderboard/statistics

Security will use role-based access control and database policies. Student data must be isolated from other students; faculty access will be scoped to assigned departments/students; admin access will be broader.

The actual SQL schema will be added after the entity relationships and permission matrix are finalized.
