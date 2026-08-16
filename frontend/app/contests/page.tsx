'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

type Contest = { id: string; title: string; description: string | null; test_id: string; starts_at: string; ends_at: string };

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const now = new Date().toISOString();
      const { data, error } = await supabase.from('contests').select('id,title,description,test_id,starts_at,ends_at').eq('status', 'published').order('starts_at');
      if (error) setMessage(error.message);
      else setContests((data ?? []).filter((c) => new Date(c.ends_at) >= new Date(now)) as Contest[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <main className="auth-page"><p>Loading contests...</p></main>;
  return <main className="practice-page">
    <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · CONTESTS</p><h1>Contests</h1><p>Compete in assessments and climb the leaderboard.</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
    {message && <p className="error">{message}</p>}
    {!contests.length && !message && <section className="result-card"><h2>No active contests</h2><p>Published contests will appear here when they are scheduled.</p></section>}
    <section className="dashboard-grid">
      {contests.map((contest) => <article className="dashboard-card" key={contest.id}>
        <span>CONTEST</span><h2>{contest.title}</h2><p>{contest.description || 'Timed SkillCampus competition.'}</p>
        <p><strong>Starts:</strong> {new Date(contest.starts_at).toLocaleString()}</p>
        <p><strong>Ends:</strong> {new Date(contest.ends_at).toLocaleString()}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="card-link" href={`/tests/${contest.test_id}`}>Enter contest →</Link>
          <Link className="card-link" href={`/contests/${contest.id}/leaderboard`}>Leaderboard →</Link>
        </div>
      </article>)}
    </section>
  </main>;
}
