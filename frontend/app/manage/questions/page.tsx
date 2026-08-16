'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';

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
const emptyForm = { title: '', question_text: '', topic: '', difficulty: 'easy', options: '', correct_answer: '', explanation: '', is_published: true };

export default function QuestionManagerPage() {
  const [allowed, setAllowed] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [message, setMessage] = useState('Loading...');
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    const { data, error } = await supabase.from('questions')
      .select('id,title,question_text,question_type,difficulty,topic,options,correct_answer,explanation,is_published')
      .order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else { setQuestions((data ?? []) as Question[]); setMessage(''); }
  }

  useEffect(() => { load(); }, []);

  const topics = useMemo(() => Array.from(new Set(questions.map((q) => q.topic).filter(Boolean) as string[])).sort(), [questions]);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      const matchesSearch = !term || `${q.title} ${q.question_text} ${q.topic ?? ''}`.toLowerCase().includes(term);
      const matchesTopic = topicFilter === 'all' || q.topic === topicFilter;
      const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'published' ? q.is_published : !q.is_published);
      return matchesSearch && matchesTopic && matchesDifficulty && matchesStatus;
    });
  }, [questions, search, topicFilter, difficultyFilter, statusFilter]);

  function startEdit(q: Question) {
    setEditingId(q.id);
    setForm({
      title: q.title,
      question_text: q.question_text,
      topic: q.topic ?? '',
      difficulty: q.difficulty,
      options: (q.options ?? []).join('\n'),
      correct_answer: q.correct_answer ?? '',
      explanation: q.explanation ?? '',
      is_published: q.is_published,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
  }

  async function saveQuestion(event: FormEvent) {
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

    const payload = {
      title: form.title.trim(),
      question_text: form.question_text.trim(),
      difficulty: form.difficulty,
      topic: form.topic.trim() || null,
      options,
      correct_answer: form.correct_answer.trim(),
      explanation: form.explanation.trim() || null,
      is_published: form.is_published,
    };

    const result = editingId
      ? await supabase.from('questions').update(payload).eq('id', editingId)
      : await supabase.from('questions').insert({ ...payload, created_by: user.id, question_type: 'aptitude' });

    if (result.error) setMessage(result.error.message);
    else {
      setMessage(editingId ? 'Question updated successfully.' : 'Question added successfully.');
      cancelEdit();
      await load();
    }
  }

  async function togglePublish(q: Question) {
    const supabase = createClient();
    const { error } = await supabase.from('questions').update({ is_published: !q.is_published }).eq('id', q.id);
    if (error) setMessage(error.message);
    else await load();
  }

  async function deleteQuestion(q: Question) {
    if (!window.confirm(`Delete "${q.title}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('questions').delete().eq('id', q.id);
    if (error) setMessage(error.message);
    else {
      setMessage('Question deleted.');
      await load();
    }
  }

  if (!allowed) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · QUESTION BANK</p><h1>Access restricted</h1><p>{message}</p><Link className="secondary-link" href="/dashboard">Back to dashboard</Link></main>;

  return (
    <main className="practice-page">
      <header className="practice-header">
        <div><p className="eyebrow">SKILLCAMPUS · FACULTY / ADMIN</p><h1>Question Bank</h1><p>Create, search, edit and publish aptitude questions.</p></div>
        <Link className="secondary-link" href="/dashboard">Dashboard</Link>
      </header>

      {message && <p className="error">{message}</p>}

      <section className="question-card">
        <h2>{editingId ? 'Edit aptitude question' : 'Add aptitude question'}</h2>
        <form onSubmit={saveQuestion} className="manager-form">
          <input required placeholder="Question title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea required placeholder="Question text" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
          <input placeholder="Topic e.g. Percentages" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
          <textarea required placeholder="Options — one per line" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
          <input required placeholder="Correct answer (must match an option)" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
          <textarea placeholder="Explanation" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          <label className="checkbox"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publish immediately</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="primary-link" type="submit">{editingId ? 'Save changes' : 'Add question'}</button>
            {editingId && <button className="secondary-link" type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="question-card" style={{ marginTop: 18 }}>
        <h2>Manage questions ({filteredQuestions.length})</h2>
        <div className="manager-form">
          <input placeholder="Search title, question or topic" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}><option value="all">All topics</option>{topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select>
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}><option value="all">All difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="published">Published</option><option value="draft">Draft</option></select>
        </div>
      </section>

      <section className="dashboard-grid" style={{ marginTop: 18 }}>
        {filteredQuestions.map((q) => (
          <article className="dashboard-card" key={q.id}>
            <span>{q.topic || 'APTITUDE'} · {q.difficulty.toUpperCase()}</span>
            <h2>{q.title}</h2>
            <p>{q.question_text}</p>
            <p><strong>{q.is_published ? 'Published' : 'Draft'}</strong></p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="secondary-link" onClick={() => startEdit(q)}>Edit</button>
              <button className="secondary-link" onClick={() => togglePublish(q)}>{q.is_published ? 'Unpublish' : 'Publish'}</button>
              <button className="secondary-link" onClick={() => deleteQuestion(q)}>Delete</button>
            </div>
          </article>
        ))}
        {!filteredQuestions.length && <p>No questions match the current filters.</p>}
      </section>
    </main>
  );
}
