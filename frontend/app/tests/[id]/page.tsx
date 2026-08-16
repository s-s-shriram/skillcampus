'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

type Test = { id: string; title: string; description: string | null; duration_minutes: number; total_marks: number; negative_mark: number };
type Question = { id: string; question_text: string; options: string[] | null; explanation: string | null; marks: number; question_order: number };
type Result = { score: number; correct_count: number; wrong_count: number; total_questions: number };

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data: t, error: te } = await supabase.from('tests').select('id,title,description,duration_minutes,total_marks,negative_mark').eq('id', testId).eq('status', 'published').single();
      if (te || !t) { setMessage(te?.message || 'Test not found.'); setLoading(false); return; }
      setTest(t as Test);

      const { data: tq, error: qe } = await supabase.from('test_questions').select('question_id,marks,question_order').eq('test_id', testId).order('question_order');
      if (qe) { setMessage(qe.message); setLoading(false); return; }
      const ids = (tq ?? []).map((x) => x.question_id);
      const { data: qd, error: qde } = ids.length ? await supabase.from('questions').select('id,question_text,options,explanation').in('id', ids) : { data: [], error: null };
      if (qde) { setMessage(qde.message); setLoading(false); return; }
      const ordered = (tq ?? []).map((row) => {
        const q = (qd ?? []).find((item) => item.id === row.question_id);
        return q ? { ...q, marks: Number(row.marks), question_order: row.question_order } : null;
      }).filter(Boolean) as Question[];
      setQuestions(ordered);

      const { data: existing } = await supabase.from('test_attempts').select('id,status,score,correct_count,wrong_count,started_at').eq('test_id', testId).eq('student_id', user.id).maybeSingle();
      if (existing?.status === 'submitted') {
        setAttemptId(existing.id);
        setResult({ score: Number(existing.score ?? 0), correct_count: existing.correct_count, wrong_count: existing.wrong_count, total_questions: ordered.length });
      } else if (existing) {
        setAttemptId(existing.id);
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(existing.started_at).getTime()) / 1000));
        setSeconds(Math.max(0, Number(t.duration_minutes) * 60 - elapsed));
        const { data: saved } = await supabase.from('test_attempt_answers').select('question_id,selected_answer').eq('attempt_id', existing.id);
        const restored: Record<string, string> = {};
        (saved ?? []).forEach((row) => { if (row.selected_answer) restored[row.question_id] = row.selected_answer; });
        setAnswers(restored);
      } else {
        // Next.js development mode may run effects twice. If two loads race,
        // the unique constraint protects the database; the second load simply
        // fetches the attempt that the first load created.
        const { data: created, error: ae } = await supabase.from('test_attempts').insert({ test_id: testId, student_id: user.id }).select('id,started_at').single();
        if (created) {
          setAttemptId(created.id);
          setSeconds(Number(t.duration_minutes) * 60);
        } else if (ae?.code === '23505') {
          const { data: raced, error: re } = await supabase.from('test_attempts').select('id,status,score,correct_count,wrong_count,started_at').eq('test_id', testId).eq('student_id', user.id).single();
          if (re || !raced) setMessage(re?.message || 'Unable to recover test attempt.');
          else if (raced.status === 'submitted') {
            setAttemptId(raced.id);
            setResult({ score: Number(raced.score ?? 0), correct_count: raced.correct_count, wrong_count: raced.wrong_count, total_questions: ordered.length });
          } else {
            setAttemptId(raced.id);
            const elapsed = Math.max(0, Math.floor((Date.now() - new Date(raced.started_at).getTime()) / 1000));
            setSeconds(Math.max(0, Number(t.duration_minutes) * 60 - elapsed));
          }
        } else {
          setMessage(ae?.message || 'Unable to start test.');
        }
      }
      setLoading(false);
    }
    if (testId) load();
  }, [testId]);

  useEffect(() => {
    if (!attemptId || result || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [attemptId, result, seconds]);

  const formattedTime = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds]);

  async function choose(questionId: string, answer: string) {
    setAnswers((value) => ({ ...value, [questionId]: answer }));
    if (attemptId) await createClient().from('test_attempt_answers').upsert({ attempt_id: attemptId, question_id: questionId, selected_answer: answer });
  }

  async function submit() {
    if (!attemptId || submitting || result) return;
    setSubmitting(true);
    const { data, error } = await createClient().rpc('submit_test_attempt', { p_attempt_id: attemptId, p_answers: answers });
    if (error) setMessage(error.message);
    else {
      const row = Array.isArray(data) ? data[0] : data;
      setResult({ score: Number(row.score), correct_count: row.correct_count, wrong_count: row.wrong_count, total_questions: row.total_questions });
    }
    setSubmitting(false);
  }

  useEffect(() => {
    if (seconds === 0 && attemptId && !result && !loading) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  if (loading) return <main className="auth-page"><p>Loading test...</p></main>;
  if (message && !test) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · TEST</p><h1>Unable to load test</h1><p className="error">{message}</p><Link className="secondary-link" href="/tests">Back to tests</Link></main>;
  if (!test) return null;

  if (result) return <main className="practice-page"><header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · RESULT</p><h1>{test.title}</h1><p>Assessment submitted successfully.</p></div><Link className="secondary-link" href="/tests">All tests</Link></header><section className="result-card"><h2>Score: {result.score}</h2><p><strong>{result.correct_count}</strong> correct · <strong>{result.wrong_count}</strong> wrong · {result.total_questions - result.correct_count - result.wrong_count} unanswered</p><p>Total marks: {test.total_marks}</p><Link className="card-link" href="/dashboard">Back to dashboard</Link></section></main>;

  return <main className="practice-page">
    <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · TEST</p><h1>{test.title}</h1><p>{test.description || 'Answer all questions before time runs out.'}</p></div><Link className="secondary-link" href="/tests">Exit</Link></header>
    <div className="timer">Time remaining: {formattedTime}</div>
    {message && <p className="error">{message}</p>}
    <section className="options" style={{ gap: 18 }}>
      {questions.map((q, index) => <article className="question-card" key={q.id}>
        <div className="question-meta"><span>Question {index + 1}</span><span>{q.marks} mark{q.marks === 1 ? '' : 's'}</span></div>
        <h2>{q.question_text}</h2>
        <div className="options">{(q.options ?? []).map((option) => <button key={option} className={`option ${answers[q.id] === option ? 'correct' : ''}`} onClick={() => choose(q.id, option)}>{option}</button>)}</div>
      </article>)}
    </section>
    <button className="primary-link" disabled={submitting} onClick={submit}>{submitting ? 'Submitting...' : 'Submit test'}</button>
  </main>;
}
