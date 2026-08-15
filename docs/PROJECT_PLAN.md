# SkillCampus Project Plan

## Vision
SkillCampus is an all-in-one college learning, coding, aptitude, and placement platform.

## Phase 1 MVP
- Student, Faculty, and Admin authentication/roles
- Student dashboard
- Aptitude practice and mock tests
- Coding problem practice
- Faculty/Admin question management
- Test creation and conducting
- Contest creation and conducting
- Results and submissions
- Global, department, test, and contest leaderboards

## Future Phases
- HOD and department management
- Placement Officer and placement drives
- Principal/higher-official college analytics
- Company-wise preparation
- AI tutor, study planner, and interview simulator

## Initial Architecture
- Frontend: Next.js
- Backend: FastAPI
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- Source control: GitHub
- Deployment: free-tier hosting first
- Code execution: isolated sandbox/service, separate from the main application server

## Development Principle
Build and deploy incrementally. Keep the initial deployment free where practical, design for secure role-based access, and avoid copying copyrighted question banks or branding from existing platforms.
