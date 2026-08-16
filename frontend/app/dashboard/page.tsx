'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

type Profile = { full_name: string; email: string; role: string };

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data, error } = await supabase.from('profiles').select('full_name, email, role').eq('id', user.id).single();
      if (error) setMessage(error.message); else setProfile(data);
      setLoading(false);
    };
    loadProfile();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  if (loading) return <main className="auth-page"><p>Loading SkillCampus...</p></main>;
  const manager = profile && ['faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin'].includes(profile.role);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div><p className="eyebrow">SKILLCAMPUS</p><h1>Welcome{profile ? `, ${profile.full_name}` : ''}!</h1><p className="muted">Your learning and placement dashboard.</p></div>
        <button onClick={signOut}>Sign out</button>
      </header>
      {message && <p className="error">{message}</p>}
      {profile && <section className="dashboard-grid">
        <article className="dashboard-card"><span>ACCOUNT</span><h2>{profile.role.toUpperCase()}</h2><p>{profile.email}</p></article>
        <article className="dashboard-card"><span>APTITUDE</span><h2>Practice</h2><p>Quantitative, logical and verbal preparation.</p><Link className="card-link" href="/aptitude">Start practice →</Link></article>
        <article className="dashboard-card"><span>TESTS</span><h2>Assessments</h2><p>Take timed tests and track your results.</p><Link className="card-link" href="/tests">View tests →</Link></article>
        <article className="dashboard-card"><span>CONTESTS</span><h2>Compete</h2><p>Join scheduled competitions and climb the leaderboard.</p><Link className="card-link" href="/contests">View contests →</Link></article>
        <article className="dashboard-card"><span>CODING</span><h2>Coming next</h2><p>Programming, DSA and SQL practice.</p></article>
        {manager && <>
          <article className="dashboard-card"><span>MANAGEMENT</span><h2>Tests</h2><p>Create and publish assessments from the question bank.</p><Link className="card-link" href="/manage/tests">Manage tests →</Link></article>
          <article className="dashboard-card"><span>MANAGEMENT</span><h2>Contests</h2><p>Schedule competitions and monitor leaderboards.</p><Link className="card-link" href="/manage/contests">Manage contests →</Link></article>
        </>}
      </section>}
    </main>
  );
}
