'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';

type Problem = {
  id: string;
  title: string;
  language: string;
  topic: string;
  difficulty: string;
  is_published: boolean;
  created_at: string;
};

type TestCase = {
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
};

const roles = ['faculty', 'admin', 'hod', 'placement_officer', 'principal', 'super_admin'];

export default function ManageCodingProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('java');
  const [topic, setTopic] = useState('Basics');
  const [difficulty, setDifficulty] = useState('easy');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [publish, setPublish] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([{ input_data: '', expected_output: '', is_hidden: false }]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !roles.includes(profile.role)) {
      setMessage('Faculty or authorized administrator access is required.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('coding_problems')
      .select('id,title,language,topic,difficulty,is_published,created_at')
      .order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    setProblems((data ?? []) as Problem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function updateCase(index: number, field: keyof TestCase, value: string | boolean) {
    setTestCases((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addCase() {
    setTestCases((items) => [...items, { input_data: '', expected_output: '', is_hidden: true }]);
  }

  function removeCase(index: number) {
    setTestCases((items) => items.length === 1 ? items : items.filter((_, i) => i !== index));
  }

  async function createProblem(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!title.trim() || !description.trim()) { setMessage('Title and description are required.'); return; }
    const validCases = testCases.filter((item) => item.input_data.trim() || item.expected_output.trim());
    if (validCases.some((item) => !item.input_data.trim() || !item.expected_output.trim())) {
      setMessage('Every test case needs both input and expected output.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: problem, error } = await supabase.from('coding_problems').insert({
      title: title.trim(),
      description: description.trim(),
      language,
      topic: topic.trim() || 'General',
      difficulty,
      input_format: inputFormat.trim() || null,
      output_format: outputFormat.trim() || null,
      constraints: constraints.trim() || null,
      starter_code: starterCode || null,
      sample_input: sampleInput || null,
      sample_output: sampleOutput || null,
      is_published: publish,
      created_by: user.id
    }).select('id').single();

    if (error || !problem) { setMessage(error?.message || 'Unable to create problem.'); setSaving(false); return; }

    if (validCases.length) {
      const { error: caseError } = await supabase.from('coding_test_cases').insert(
        validCases.map((item) => ({ question_id: problem.id, input_data: item.input_data, expected_output: item.expected_output, is_hidden: item.is_hidden }))
      );
      if (caseError) {
        await supabase.from('coding_problems').delete().eq('id', problem.id);
        setMessage(caseError.message);
        setSaving(false);
        return;
      }
    }

    setTitle(''); setDescription(''); setTopic('Basics'); setDifficulty('easy'); setInputFormat(''); setOutputFormat(''); setConstraints(''); setStarterCode(''); setSampleInput(''); setSampleOutput(''); setPublish(false); setTestCases([{ input_data: '', expected_output: '', is_hidden: false }]);
    setMessage('Coding problem created successfully.');
    await load();
    setSaving(false);
  }

  async function togglePublish(problem: Problem) {
    const { error } = await createClient().from('coding_problems').update({ is_published: !problem.is_published }).eq('id', problem.id);
    if (error) setMessage(error.message); else await load();
  }

  async function deleteProblem(id: string) {
    if (!confirm('Delete this coding problem?')) return;
    const { error } = await createClient().from('coding_problems').delete().eq('id', id);
    if (error) setMessage(error.message); else await load();
  }

  if (loading) return <main className="auth-page"><p>Loading coding problems...</p></main>;

  return (
    <main className="practice-page">
      <header className="practice-header">
        <div><p className="eyebrow">SKILLCAMPUS · PROGRAMMING MANAGEMENT</p><h1>Coding Problems</h1><p>Create coding challenges with public and hidden test cases.</p></div>
        <div className="action-row"><Link className="secondary-link" href="/manage/programming">Question Bank</Link><Link className="secondary-link" href="/dashboard">Dashboard</Link></div>
      </header>
      {message && <p className="error">{message}</p>}

      <section className="question-card" style={{ marginBottom: 20 }}>
        <h2>New coding problem</h2>
        <form className="manager-form" onSubmit={createProblem}>
          <input placeholder="Problem title e.g. Sum of Two Numbers" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea placeholder="Problem description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <div className="dashboard-grid">
            <label>Language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="c">C</option><option value="cpp">C++</option><option value="java">Java</option><option value="python">Python</option><option value="sql">SQL</option></select></label>
            <label>Topic<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Arrays" /></label>
            <label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          </div>
          <div className="dashboard-grid">
            <label>Input format<textarea value={inputFormat} onChange={(e) => setInputFormat(e.target.value)} /></label>
            <label>Output format<textarea value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} /></label>
          </div>
          <label>Constraints<textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} /></label>
          <label>Starter code<textarea value={starterCode} onChange={(e) => setStarterCode(e.target.value)} placeholder="Optional starter code shown in the editor." /></label>
          <div className="dashboard-grid">
            <label>Sample input<textarea value={sampleInput} onChange={(e) => setSampleInput(e.target.value)} /></label>
            <label>Sample output<textarea value={sampleOutput} onChange={(e) => setSampleOutput(e.target.value)} /></label>
          </div>

          <h3>Test cases</h3>
          <p className="muted">Public cases can be shown to students. Hidden cases are used for final validation.</p>
          {testCases.map((item, index) => (
            <div className="question-card" key={index} style={{ marginBottom: 12 }}>
              <strong>Test case {index + 1}</strong>
              <div className="dashboard-grid">
                <label>Input<textarea value={item.input_data} onChange={(e) => updateCase(index, 'input_data', e.target.value)} /></label>
                <label>Expected output<textarea value={item.expected_output} onChange={(e) => updateCase(index, 'expected_output', e.target.value)} /></label>
              </div>
              <label className="checkbox"><input type="checkbox" checked={item.is_hidden} onChange={(e) => updateCase(index, 'is_hidden', e.target.checked)} /> Hidden test case</label>
              <button type="button" className="danger" onClick={() => removeCase(index)}>Remove</button>
            </div>
          ))}
          <div className="action-row"><button type="button" onClick={addCase}>+ Add test case</button><label className="checkbox"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish immediately</label></div>
          <button className="primary-link" disabled={saving}>{saving ? 'Creating...' : 'Create coding problem'}</button>
        </form>
      </section>

      <section className="dashboard-grid">
        {problems.map((problem) => (
          <article className="dashboard-card" key={problem.id}>
            <span>{problem.is_published ? 'PUBLISHED' : 'DRAFT'}</span>
            <h2>{problem.title}</h2>
            <p>{problem.language.toUpperCase()} · {problem.topic} · {problem.difficulty}</p>
            <div className="action-row"><button onClick={() => togglePublish(problem)}>{problem.is_published ? 'Unpublish' : 'Publish'}</button><button className="danger" onClick={() => deleteProblem(problem.id)}>Delete</button></div>
          </article>
        ))}
      </section>
    </main>
  );
}
