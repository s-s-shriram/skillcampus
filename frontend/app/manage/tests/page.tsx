'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

type Question = { id: string; title: string; question_text: string; topic: string | null; difficulty: string; };

type TestRow = { id: string; title: string; description: string | null; duration_minutes: number; total_marks: number; negative_mark: number; status: string; };

export default function ManageTestsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [marks, setMarks] = useState('1');
  const [negative, setNegative] = useState('0');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin'].includes(profile.role)) {
      setMessage('Faculty or authorized administrator access is required.');
      setLoading(false);
      return;
    }
    const [{ data: q, error: qe }, { data: t, error: te }] = await Promise.all([
      supabase.from('questions').select('id,title,question_text,topic,difficulty').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('tests').select('id,title,description,duration_minutes,total_marks,negative_mark,status').order('created_at', { ascending: false })
    ]);
    if (qe || te) setMessage(qe?.message || te?.message || 'Unable to load tests.');
    setQuestions((q ?? []) as Question[]);
    setTests((t ?? []) as TestRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleQuestion(id: string) {
    setSelected((value) => value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  async function createTest(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!title.trim() || selected.length === 0) { setMessage('Enter a title and select at least one question.'); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const perQuestion = Number(marks) || 1;
    const { data: test, error } = await supabase.from('tests').insert({
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: Math.max(1, Number(duration) || 30),
      total_marks: Math.max(1, perQuestion * selected.length),
      negative_mark: Math.max(0, Number(negative) || 0),
      status: publish ? 'published' : 'draft'
    }).select('id').single();

    if (error || !test) { setMessage(error?.message || 'Unable to create test.'); setSaving(false); return; }

    const rows = selected.map((question_id, index) => ({ test_id: test.id, question_id, marks: perQuestion, question_order: index + 1 }));
    const { error: qe } = await supabase.from('test_questions').insert(rows);
    if (qe) {
      await supabase.from('tests').delete().eq('id', test.id);
      setMessage(qe.message);
    } else {
      setTitle(''); setDescription(''); setSelected([]); setPublish(false); setMessage('Test created successfully.'); await load();
    }
    setSaving(false);
  }

  async function setStatus(test: TestRow, status: string) {
    const { error } = await createClient().from('tests').update({ status }).eq('id', test.id);
    if (error) setMessage(error.message); else await load();
  }

  async function deleteTest(id: string) {
    if (!confirm('Delete this test?')) return;
    const { error } = await createClient().from('tests').delete().eq('id', id);
    if (error) setMessage(error.message); else await load();
  }

  if (loading) return <main className="auth-page"><p>Loading tests...</p></main>;
  return (
    <main className="practice-page">
      <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · TEST MANAGEMENT</p><h1>Create tests</h1><p>Build timed assessments from your published question bank.</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
      {message && <p className="error">{message}</p>}
      <section className="question-card" style={{ marginBottom: 20 }}>
        <h2>New test</h2>
        <form className="manager-form" onSubmit={createTest}>
          <input placeholder="Test title e.g. Placement Aptitude Mock 1" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="dashboard-grid">
            <label>Duration (minutes)<input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
            <label>Marks per question<input type="number" min="0.5" step="0.5" value={marks} onChange={(e) => setMarks(e.target.value)} /></label>
            <label>Negative mark<input type="number" min="0" step="0.25" value={negative} onChange={(e) => setNegative(e.target.value)} /></label>
          </div>
          <label className="checkbox"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish immediately</label>
          <h3>Select questions ({selected.length})</h3>
          <div className="select-list">
            {questions.length === 0 ? <p className="muted">Publish aptitude questions first.</p> : questions.map((q) => (
              <label key={q.id} className="select-item"><input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggleQuestion(q.id)} /><span><strong>{q.title}</strong><small>{q.topic || 'General'} · {q.difficulty} · {q.question_text}</small></span></label>
            ))}
          </div>
          <button className="primary-link" disabled={saving}>{saving ? 'Creating...' : 'Create test'}</button>
        </form>
      </section>

      <section className="dashboard-grid">
        {tests.map((test) => <article className="dashboard-card" key={test.id}>
          <span>{test.status.toUpperCase()}</span><h2>{test.title}</h2><p>{test.description || 'No description.'}</p><p><strong>{test.duration_minutes} min</strong> · {test.total_marks} marks · {test.negative_mark} negative</p>
          <div className="action-row">
            {test.status === 'published' ? <button onClick={() => setStatus(test, 'closed')}>Close</button> : <button onClick={() => setStatus(test, 'published')}>Publish</button>}
            {test.status !== 'draft' && <button onClick={() => setStatus(test, 'draft')}>Move to draft</button>}
            <button className="danger" onClick={() => deleteTest(test.id)}>Delete</button>
          </div>
        </article>)}
      </section>
    </main>
  );
}
