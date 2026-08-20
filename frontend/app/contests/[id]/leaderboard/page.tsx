'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/client';

type Row = { rank: number; student_name: string; score: number; correct_count: number; wrong_count: number };

export default function LeaderboardPage() {
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState('Contest leaderboard');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data: contest, error: ce } = await supabase.from('contests').select('title').eq('id', params.id).single();
      if (ce) { setMessage(ce.message); return; }
      setTitle(contest.title);
      const { data, error } = await supabase.rpc('get_contest_leaderboard', { p_contest_id: params.id });
      if (error) setMessage(error.message); else setRows((data ?? []) as Row[]);
    }
    if (params.id) load();
  }, [params.id]);

  return <main className="practice-page">
    <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · LEADERBOARD</p><h1>{title}</h1><p>Top 100 participants ranked by score, then submission time.</p></div><Link className="secondary-link" href="/contests">Back to contests</Link></header>
    {message && <p className="error">{message}</p>}
    {!message && <section className="result-card">
      {rows.length === 0 ? <p>No submitted attempts yet.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Rank</th><th align="left">Student</th><th align="left">Score</th><th align="left">Correct</th><th align="left">Wrong</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.rank}-${row.student_name}`}><td>{row.rank}</td><td>{row.student_name}</td><td>{row.score}</td><td>{row.correct_count}</td><td>{row.wrong_count}</td></tr>)}</tbody></table></div>}
    </section>}
  </main>;
}
