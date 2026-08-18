'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/client';

type Problem = {
  id: string;
  title: string;
  description: string;
  language: string;
  topic: string;
  difficulty: string;
  input_format: string | null;
  output_format: string | null;
  constraints: string | null;
  starter_code: string | null;
  sample_input: string | null;
  sample_output: string | null;
};

type TestCase = {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
};

export default function CodingProblemPage() {
  const params = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ id: string; passed: boolean; actual: string; expected: string }[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: p, error: pe } = await supabase
        .from('coding_problems')
        .select('id,title,description,language,topic,difficulty,input_format,output_format,constraints,starter_code,sample_input,sample_output')
        .eq('id', params.id)
        .eq('is_published', true)
        .single();

      if (pe) { setMessage(pe.message); setLoading(false); return; }

      const { data: tc, error: te } = await supabase
        .from('coding_test_cases')
        .select('id,input,expected_output,is_hidden')
        .eq('problem_id', params.id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (te) setMessage(te.message);
      setProblem(p as Problem);
      setTests((tc ?? []) as TestCase[]);
      setCode(p?.starter_code ?? '');
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function runTests() {
    if (!problem) return;
    setRunning(true);
    setResults([]);

    const output = code.trim();
    const nextResults = tests.map((test) => ({
      id: test.id,
      passed: output === test.expected_output.trim(),
      actual: output,
      expected: test.expected_output.trim(),
    }));
    setResults(nextResults);
    setRunning(false);
  }

  if (loading) return <main className="practice-page"><p>Loading coding problem...</p></main>;
  if (message || !problem) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · CODING</p><h1>Unable to load coding problem</h1><p>{message || 'Problem not found or not published.'}</p><Link className="secondary-link" href="/programming">Back to programming</Link></main>;

  return (
    <main className="practice-page">
      <header className="practice-header">
        <div>
          <p className="eyebrow">SKILLCAMPUS · CODING</p>
          <h1>{problem.title}</h1>
          <div className="question-meta"><span>{problem.language === 'cpp' ? 'C++' : problem.language.toUpperCase()}</span><span>{problem.topic}</span><span>{problem.difficulty}</span></div>
        </div>
        <Link className="secondary-link" href="/programming">Back</Link>
      </header>

      <section className="question-card">
        <h2>Problem</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{problem.description}</p>
        {problem.input_format && <><h3>Input Format</h3><p style={{ whiteSpace: 'pre-wrap' }}>{problem.input_format}</p></>}
        {problem.output_format && <><h3>Output Format</h3><p style={{ whiteSpace: 'pre-wrap' }}>{problem.output_format}</p></>}
        {problem.constraints && <><h3>Constraints</h3><p style={{ whiteSpace: 'pre-wrap' }}>{problem.constraints}</p></>}
        {(problem.sample_input || problem.sample_output) && <div className="dashboard-grid"><div><h3>Sample Input</h3><pre>{problem.sample_input || ''}</pre></div><div><h3>Sample Output</h3><pre>{problem.sample_output || ''}</pre></div></div>}
      </section>

      <section className="question-card" style={{ marginTop: 18 }}>
        <div className="question-meta"><span>Language: {problem.language === 'cpp' ? 'C++' : problem.language.toUpperCase()}</span><span>{tests.length} public test case{tests.length === 1 ? '' : 's'}</span></div>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={18} spellCheck={false} style={{ width: '100%', fontFamily: 'monospace', padding: 16, borderRadius: 10 }} />
        <div style={{ marginTop: 14 }}><button className="primary-link" onClick={runTests} disabled={running}>{running ? 'Running...' : '▶ Run Code'}</button></div>
        {results.length > 0 && <div style={{ marginTop: 18 }}><h2>Test Results</h2>{results.map((result, i) => <div key={result.id} className={`feedback ${result.passed ? 'success' : 'failure'}`}><strong>{result.passed ? '✓ Passed' : '✗ Failed'} — Test Case {i + 1}</strong><p>Expected: {result.expected}</p><p>Actual: {result.actual}</p></div>)}</div>}
      </section>
    </main>
  );
}
