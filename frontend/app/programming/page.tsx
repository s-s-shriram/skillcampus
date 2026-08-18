'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

type Question = {
  id: string;
  title: string;
  question: string;
  language: string;
  topic: string;
  difficulty: string;
  question_type: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  explanation: string | null;
};

type CodingProblem = {
  id: string;
  title: string;
  description: string;
  language: string;
  topic: string;
  difficulty: string;
  starter_code: string | null;
  sample_input: string | null;
  sample_output: string | null;
};

const languages = ['all', 'c', 'cpp', 'java', 'python', 'sql'];
const difficulties = ['all', 'easy', 'medium', 'hard'];

export default function ProgrammingPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  const [language, setLanguage] = useState('all');
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadProgramming() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const [questionsResult, problemsResult] = await Promise.all([
        supabase
          .from('programming_questions')
          .select('id,title,question,language,topic,difficulty,question_type,option_a,option_b,option_c,option_d,correct_answer,explanation')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('coding_problems')
          .select('id,title,description,language,topic,difficulty,starter_code,sample_input,sample_output')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
      ]);

      if (questionsResult.error) setMessage(questionsResult.error.message);
      else setQuestions((questionsResult.data ?? []) as Question[]);

      if (problemsResult.error) setMessage(problemsResult.error.message);
      else setCodingProblems((problemsResult.data ?? []) as CodingProblem[]);

      setLoading(false);
    }
    loadProgramming();
  }, []);

  const topics = useMemo(() => {
    const values = questions
      .filter((q) => language === 'all' || q.language === language)
      .map((q) => q.topic);
    return ['all', ...Array.from(new Set(values))];
  }, [questions, language]);

  const filteredQuestions = useMemo(() => questions.filter((q) =>
    (language === 'all' || q.language === language) &&
    (topic === 'all' || q.topic === topic) &&
    (difficulty === 'all' || q.difficulty === difficulty)
  ), [questions, language, topic, difficulty]);

  const filteredProblems = useMemo(() => codingProblems.filter((problem) =>
    (language === 'all' || problem.language === language) &&
    (topic === 'all' || problem.topic === topic) &&
    (difficulty === 'all' || problem.difficulty === difficulty)
  ), [codingProblems, language, topic, difficulty]);

  const question = filteredQuestions[index];
  const finished = index >= filteredQuestions.length && filteredQuestions.length > 0;
  const percentage = filteredQuestions.length ? Math.round((score / filteredQuestions.length) * 100) : 0;

  function reset() {
    setIndex(0); setSelected(''); setScore(0); setAnswered(false);
  }

  function changeLanguage(value: string) {
    setLanguage(value); setTopic('all'); reset();
  }

  function choose(option: string) {
    if (answered || !question) return;
    setSelected(option); setAnswered(true);
    if (option === question.correct_answer) setScore((value) => value + 1);
  }

  function next() {
    setSelected(''); setAnswered(false); setIndex((value) => value + 1);
  }

  const languageLabel = (value: string) => value === 'cpp' ? 'C++' : value === 'sql' ? 'SQL' : value.toUpperCase();

  if (loading) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · PROGRAMMING</p><h1>Loading programming practice...</h1></main>;
  if (message) return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · PROGRAMMING</p><h1>Unable to load programming practice</h1><p>{message}</p><Link className="secondary-link" href="/dashboard">Back to dashboard</Link></main>;

  if (finished) return (
    <main className="practice-page">
      <header className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · PROGRAMMING</p><h1>Practice complete 🎉</h1><p>You scored <strong>{score}/{filteredQuestions.length}</strong> ({percentage}%).</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></header>
      <section className="result-card"><h2>Keep coding</h2><p>Change language, topic or difficulty and practice again.</p><button className="primary-link" onClick={reset}>Practice again</button></section>
    </main>
  );

  return (
    <main className="practice-page">
      <header className="practice-header">
        <div><p className="eyebrow">SKILLCAMPUS · PROGRAMMING</p><h1>Programming Practice</h1><p>Practice concepts, output prediction, debugging, SQL and coding problems.</p></div>
        <Link className="secondary-link" href="/dashboard">Dashboard</Link>
      </header>

      <section className="question-card" style={{ marginBottom: 18 }}>
        <h2>Choose your practice</h2>
        <div className="dashboard-grid">
          <label>Language<select value={language} onChange={(e) => changeLanguage(e.target.value)}>{languages.map((value) => <option key={value} value={value}>{value === 'all' ? 'All languages' : value === 'cpp' ? 'C++' : value === 'sql' ? 'SQL' : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
          <label>Topic<select value={topic} onChange={(e) => { setTopic(e.target.value); reset(); }}><option value="all">All topics</option>{topics.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Difficulty<select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); reset(); }}>{difficulties.map((value) => <option key={value} value={value}>{value === 'all' ? 'All levels' : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        </div>
      </section>

      <section className="result-card" style={{ marginBottom: 18 }}>
        <div className="practice-header" style={{ marginBottom: 12 }}>
          <div><p className="eyebrow">CODING</p><h2>Coding Problems</h2><p>Solve programming problems and pass public and hidden test cases.</p></div>
          <strong>{filteredProblems.length} available</strong>
        </div>
        {filteredProblems.length === 0 ? (
          <p>No published coding problems match your selected filters.</p>
        ) : (
          <div className="dashboard-grid">
            {filteredProblems.map((problem) => (
              <article key={problem.id} className="question-card">
                <div className="question-meta"><span>{languageLabel(problem.language)}</span><span>{problem.topic}</span><span>{problem.difficulty}</span></div>
                <h3>{problem.title}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{problem.description}</p>
                <Link className="primary-link" href={`/programming/problems/${problem.id}`}>Solve →</Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="result-card">
        <h2>Practice Questions</h2>
        {filteredQuestions.length === 0 ? (
          <p>No programming questions match your selected filters. Ask faculty to publish questions, then refresh this page.</p>
        ) : (
          <div className="question-card">
            <div className="question-meta"><span>{languageLabel(question.language)}</span><span>{question.topic}</span><span>{question.difficulty}</span><span>Question {index + 1} of {filteredQuestions.length}</span></div>
            <h2>{question.title}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{question.question}</p>
            <div className="options">
              {[question.option_a, question.option_b, question.option_c, question.option_d].filter(Boolean).map((option) => {
                const value = option as string;
                const correct = answered && value === question.correct_answer;
                const wrong = answered && value === selected && value !== question.correct_answer;
                return <button key={value} className={`option ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} onClick={() => choose(value)}>{value}</button>;
              })}
            </div>
            {answered && <div className={`feedback ${selected === question.correct_answer ? 'success' : 'failure'}`}><strong>{selected === question.correct_answer ? 'Correct!' : 'Not quite.'}</strong><p>{question.explanation || 'Review the concept and try another question.'}</p><button onClick={next}>{index === filteredQuestions.length - 1 ? 'See result' : 'Next question'}</button></div>}
          </div>
        )}
      </section>
    </main>
  );
}
