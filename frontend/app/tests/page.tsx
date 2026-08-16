'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

type Test = { id: string; title: string; description: string | null; duration_minutes: number; total_marks: number; negative_mark: number; status: string };
type Attempt = { test_id: string; score: number | null; status: string };

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const [{ data, error }, { data: a }] = await Promise.all([
        supabase.from('tests').select('id,title,description,duration_minutes,total_marks,negative_mark,status').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('test_attempts').select('test_id,score,status').eq('student_id', user.id)
      ]);
      if (error) setMessage(error.message); else setTests((data ?? []) as Test[]);
      setAttempts((a ?? []) as Attempt[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <main className="auth-page"><p>Loading tests...</p></main>;
  return <main className="practice-page">
    <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · TESTS</p><h1>Tests & exams</h1><p>Take timed assessments created by faculty and placement administrators.</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
    {message && <p className="error">{message}</p>}
    {tests.length === 0 ? <section className="result-card"><h2>No published tests yet</h2><p>Faculty can create and publish a test from the test management page.</p></section> : <section className="test-list">
      {tests.map((test) => {
        const attempt = attempts.find((a) => a.test_id === test.id);
        return <article className="dashboard-card" key={test.id}>
          <div><span>{test.duration_minutes} MIN · {test.total_marks} MARKS</span><h2>{test.title}</h2><p>{test.description || 'Timed SkillCampus assessment.'}</p><p className="muted">Negative marking: {test.negative_mark}</p></div>
          <div>{attempt?.status === 'submitted' ? <Link className="secondary-link" href={`/tests/${test.id}`}>View result →</Link> : <Link className="card-link" href={`/tests/${test.id}`}>{attempt?.status === 'in_progress' ? 'Resume test →' : 'Start test →'}</Link>}</div>
        </article>;
      })}
    </section>}
  </main>;
}
