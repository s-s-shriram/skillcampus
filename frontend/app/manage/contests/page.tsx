'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

type Test = { id: string; title: string };

type Contest = { id: string; title: string; status: string; starts_at: string; ends_at: string; test_id: string };

const managers = ['faculty','admin','hod','placement_officer','principal','super_admin'];

export default function ManageContestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [role, setRole] = useState('');
  const [form, setForm] = useState({ title: '', description: '', test_id: '', starts_at: '', ends_at: '' });
  const [message, setMessage] = useState('');

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    setRole(profile?.role ?? '');
    if (!profile || !managers.includes(profile.role)) return;
    const [tr, cr] = await Promise.all([
      supabase.from('tests').select('id,title').eq('status','published').order('created_at', { ascending: false }),
      supabase.from('contests').select('id,title,status,starts_at,ends_at,test_id').order('created_at', { ascending: false })
    ]);
    if (tr.error) setMessage(tr.error.message); else setTests(tr.data ?? []);
    if (cr.error) setMessage(cr.error.message); else setContests(cr.data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createContest(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('contests').insert({ ...form, created_by: user.id, status: 'draft' });
    if (error) setMessage(error.message); else { setMessage('Contest created as draft.'); setForm({ title:'',description:'',test_id:'',starts_at:'',ends_at:'' }); load(); }
  }

  async function publish(id: string) {
    const { error } = await createClient().from('contests').update({ status: 'published' }).eq('id', id);
    if (error) setMessage(error.message); else load();
  }

  async function close(id: string) {
    const { error } = await createClient().from('contests').update({ status: 'closed' }).eq('id', id);
    if (error) setMessage(error.message); else load();
  }

  if (!managers.includes(role)) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS</p><h1>Management access required</h1><p>Only authorized faculty and administrators can manage contests.</p><Link className="secondary-link" href="/dashboard">Back to dashboard</Link></main>;

  return <main className="practice-page">
    <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · MANAGEMENT</p><h1>Contest Manager</h1><p>Create scheduled competitions using published tests.</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
    {message && <p className="error">{message}</p>}
    <section className="result-card"><h2>Create contest</h2><form onSubmit={createContest} style={{ display:'grid', gap:12 }}>
      <input placeholder="Contest title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
      <input placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
      <select value={form.test_id} onChange={e=>setForm({...form,test_id:e.target.value})} required><option value="">Select published test</option>{tests.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
      <label>Starts <input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})} required /></label>
      <label>Ends <input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})} required /></label>
      <button className="primary-link" type="submit">Create draft</button>
    </form></section>
    <section className="dashboard-grid">{contests.map(c=><article className="dashboard-card" key={c.id}><span>{c.status.toUpperCase()}</span><h2>{c.title}</h2><p>{new Date(c.starts_at).toLocaleString()} → {new Date(c.ends_at).toLocaleString()}</p>{c.status==='draft' && <button onClick={()=>publish(c.id)}>Publish</button>}{c.status==='published' && <button onClick={()=>close(c.id)}>Close</button>}<Link className="card-link" href={`/contests/${c.id}/leaderboard`}>Leaderboard →</Link></article>)}</section>
  </main>;
}
