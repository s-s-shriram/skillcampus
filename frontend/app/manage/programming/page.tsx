'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

type Question = { id: string; title: string; language: string; topic: string; difficulty: string; question_type: string; is_published: boolean; question: string };

const roles = ['faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin'];

export default function ManageProgrammingPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [language, setLanguage] = useState('java');
  const [topic, setTopic] = useState('Basics');
  const [difficulty, setDifficulty] = useState('easy');
  const [type, setType] = useState('mcq');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [a, setA] = useState(''); const [b, setB] = useState(''); const [c, setC] = useState(''); const [d, setD] = useState('');
  const [answer, setAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !roles.includes(profile.role)) { setMessage('Faculty or authorized administrator access is required.'); setLoading(false); return; }
    const { data, error } = await supabase.from('programming_questions').select('id,title,language,topic,difficulty,question_type,is_published,question').order('created_at', { ascending: false });
    if (error) setMessage(error.message); else setQuestions((data || []) as Question[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createQuestion(e: React.FormEvent) {
    e.preventDefault(); setMessage(''); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { error } = await supabase.from('programming_questions').insert({
      created_by: user.id, title: title.trim(), question: question.trim(), language, topic: topic.trim() || 'General', difficulty,
      question_type: type, option_a: a.trim() || null, option_b: b.trim() || null, option_c: c.trim() || null, option_d: d.trim() || null,
      correct_answer: answer.trim(), explanation: explanation.trim() || null, is_published: publish
    });
    if (error) setMessage(error.message); else { setTitle(''); setQuestion(''); setA(''); setB(''); setC(''); setD(''); setAnswer('A'); setExplanation(''); setPublish(false); setMessage('Programming question created successfully.'); await load(); }
    setSaving(false);
  }

  async function togglePublish(q: Question) {
    const { error } = await createClient().from('programming_questions').update({ is_published: !q.is_published }).eq('id', q.id);
    if (error) setMessage(error.message); else await load();
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this programming question?')) return;
    const { error } = await createClient().from('programming_questions').delete().eq('id', id);
    if (error) setMessage(error.message); else await load();
  }

  if (loading) return <main className="auth-page"><p>Loading programming manager...</p></main>;
  return <main className="practice-page">
    <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · PROGRAMMING MANAGEMENT</p><h1>Programming Question Bank</h1><p>Create and publish C, C++, Java, Python and SQL practice questions.</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
    {message && <p className="error">{message}</p>}
    <section className="question-card" style={{ marginBottom: 20 }}>
      <h2>Add programming question</h2>
      <form className="manager-form" onSubmit={createQuestion}>
        <input placeholder="Question title" value={title} onChange={e => setTitle(e.target.value)} required />
        <textarea placeholder="Question text" value={question} onChange={e => setQuestion(e.target.value)} required />
        <div className="dashboard-grid">
          <label>Language<select value={language} onChange={e => setLanguage(e.target.value)}><option value="c">C</option><option value="cpp">C++</option><option value="java">Java</option><option value="python">Python</option><option value="sql">SQL</option></select></label>
          <label>Topic<input value={topic} onChange={e => setTopic(e.target.value)} required /></label>
          <label>Difficulty<select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <label>Question type<select value={type} onChange={e => setType(e.target.value)}><option value="mcq">MCQ</option><option value="output">Output</option><option value="debugging">Debugging</option><option value="concept">Concept</option><option value="sql">SQL</option></select></label>
        </div>
        <div className="dashboard-grid">
          <input placeholder="Option A" value={a} onChange={e => setA(e.target.value)} />
          <input placeholder="Option B" value={b} onChange={e => setB(e.target.value)} />
          <input placeholder="Option C" value={c} onChange={e => setC(e.target.value)} />
          <input placeholder="Option D" value={d} onChange={e => setD(e.target.value)} />
        </div>
        <label>Correct answer<input placeholder="A, B, C or D (or expected answer)" value={answer} onChange={e => setAnswer(e.target.value)} required /></label>
        <textarea placeholder="Explanation shown after answering" value={explanation} onChange={e => setExplanation(e.target.value)} />
        <label className="checkbox"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} /> Publish immediately</label>
        <button className="primary-link" disabled={saving}>{saving ? 'Saving...' : 'Create question'}</button>
      </form>
    </section>
    <section className="dashboard-grid">
      {questions.length === 0 ? <article className="dashboard-card"><h2>No questions yet</h2><p>Add your first programming question above.</p></article> : questions.map(q => <article className="dashboard-card" key={q.id}>
        <span>{q.is_published ? 'PUBLISHED' : 'DRAFT'}</span><h2>{q.title}</h2><p>{q.language.toUpperCase()} · {q.topic} · {q.difficulty} · {q.question_type}</p><p>{q.question}</p>
        <div className="action-row"><button onClick={() => togglePublish(q)}>{q.is_published ? 'Unpublish' : 'Publish'}</button><button className="danger" onClick={() => deleteQuestion(q.id)}>Delete</button></div>
      </article>)}
    </section>
  </main>;
}
