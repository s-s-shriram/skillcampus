'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';

type Question = {
  id: string;
  title: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  topic: string | null;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
  is_published: boolean;
};

const roles = ['faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin'];

export default function QuestionManagerPage() {
  const [allowed, setAllowed] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [message, setMessage] = useState('Loading...');
  const [form, setForm] = useState({ title: '', question_text: '', topic: '', difficulty: 'easy', options: '', correct_answer: '', explanation: '', is_published: true });

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !roles.includes(profile.role)) {
      setAllowed(false);
      setMessage('Faculty or authorized administrator access is required.');
      return;
    }

    setAllowed(true);
    const { data, error } = await supabase.from('questions').select('id,title,question_text,question_type,difficulty,topic,options,correct_answer,explanation,is_published').order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else { setQuestions((data ?? []) as Question[]); setMessage(''); }
  }

  useEffect(() => { load(); }, []);

  async function addQuestion(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const options = form.options.split('\n').map((item) => item.trim()).filter(Boolean);
    if (options.length < 2 || !options.includes(form.correct_answer.trim())) {
      setMessage('Enter at least 2 options, with the correct answer matching one option exactly.');
      return;
    }

    const { error } = await supabase.from('questions').insert({
      created_by: user.id,
      title: form.title.trim(),
      question_text: form.question_text.trim(),
      question_type: 'aptitude',
      difficulty: form.difficulty,
      topic: form.topic.trim() || null,
      options,
      correct_answer: form.correct_answer.trim(),
      explanation: form.explanation.trim() || null,
      is_published: form.is_published,
    });

    if (error) setMessage(error.message);
    else {
      setForm({ title: '', question_text: '', topic: '', difficulty: 'easy', options: '', correct_answer: '', explanation: '', is_published: true });
      setMessage('Question added successfully.');
      load();
    }
  }

  if (!allowed) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · QUESTION BANK</p><h1>Access restricted</h1><p>{message}</p><Link className="secondary-link" href="/dashboard">Back to dashboard</Link></main>;

  return (
    <main className="practice-page">
      <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · FACULTY / ADMIN</p><h1>Question Bank</h1><p>Create and publish aptitude questions for students.</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
      {message && <p className="error">{message}</p>}
      <section className="question-card">
        <h2>Add aptitude question</h2>
        <form onSubmit={addQuestion} className="manager-form">
          <input required placeholder="Question title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea required placeholder="Question text" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
          <input placeholder="Topic e.g. Percentages" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
          <textarea required placeholder="Options — one per line" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
          <input required placeholder="Correct answer (must match an option)" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
          <textarea placeholder="Explanation" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          <label className="checkbox"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publish immediately</label>
          <button className="primary-link" type="submit">Add question</button>
        </form>
      </section>
      <section className="dashboard-grid" style={{ marginTop: 18 }}>
        {questions.map((q) => <article className="dashboard-card" key={q.id}><span>{q.topic || 'APTITUDE'} · {q.difficulty.toUpperCase()}</span><h2>{q.title}</h2><p>{q.question_text}</p><p><strong>{q.is_published ? 'Published' : 'Draft'}</strong></p></article>)}
      </section>
    </main>
  );
}
