'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

type Question = {
  id: string;
  title: string;
  question_text: string;
  difficulty: string;
  topic: string | null;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
};

const difficulties = ['all', 'easy', 'medium', 'hard'];

export default function AptitudePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topic, setTopic] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadQuestions() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data, error } = await supabase
        .from('questions')
        .select('id,title,question_text,difficulty,topic,options,correct_answer,explanation')
        .eq('question_type', 'aptitude')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) setMessage(error.message);
      else setQuestions((data ?? []) as Question[]);
      setLoading(false);
    }

    loadQuestions();
  }, []);

  const topics = useMemo(() => {
    const values = questions.map((q) => q.topic).filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(values))];
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) =>
      (topic === 'all' || q.topic === topic) &&
      (difficulty === 'all' || q.difficulty === difficulty)
    );
  }, [questions, topic, difficulty]);

  const question = filteredQuestions[index];
  const finished = index >= filteredQuestions.length && filteredQuestions.length > 0;
  const percentage = useMemo(
    () => filteredQuestions.length ? Math.round((score / filteredQuestions.length) * 100) : 0,
    [score, filteredQuestions.length]
  );

  function resetPractice() {
    setIndex(0);
    setSelected('');
    setScore(0);
    setAnswered(false);
  }

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    resetPractice();
  }

  function choose(option: string) {
    if (answered || !question) return;
    setSelected(option);
    setAnswered(true);
    if (option === question.correct_answer) setScore((value) => value + 1);
  }

  function next() {
    setSelected('');
    setAnswered(false);
    setIndex((value) => value + 1);
  }

  if (loading) {
    return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · APTITUDE</p><h1>Loading practice...</h1></main>;
  }

  if (message) {
    return <main className="practice-page"><p className="eyebrow">SKILLCAMPUS · APTITUDE</p><h1>Unable to load questions</h1><p>{message}</p><Link className="secondary-link" href="/dashboard">Back to dashboard</Link></main>;
  }

  if (finished) {
    return (
      <main className="practice-page">
        <div className="practice-header"><div><p className="eyebrow">SKILLCAMPUS · APTITUDE</p><h1>Practice complete 🎉</h1><p>You scored <strong>{score}/{filteredQuestions.length}</strong> ({percentage}%).</p></div><Link className="secondary-link" href="/dashboard">Dashboard</Link></div>
        <section className="result-card"><h2>Keep improving</h2><p>Try another topic or difficulty level from the question bank.</p><button className="primary-link" onClick={resetPractice}>Practice again</button></section>
      </main>
    );
  }

  return (
    <main className="practice-page">
      <header className="practice-header">
        <div><p className="eyebrow">SKILLCAMPUS · APTITUDE</p><h1>Practice</h1><p>Real questions published by SkillCampus faculty and administrators.</p></div>
        <Link className="secondary-link" href="/dashboard">Dashboard</Link>
      </header>

      <section className="question-card" style={{ marginBottom: 18 }}>
        <h2>Choose your practice</h2>
        <div className="dashboard-grid">
          <label>Topic<select value={topic} onChange={(e) => changeFilter(setTopic, e.target.value)}><option value="all">All topics</option>{topics.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Difficulty<select value={difficulty} onChange={(e) => changeFilter(setDifficulty, e.target.value)}>{difficulties.map((value) => <option key={value} value={value}>{value === 'all' ? 'All levels' : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        </div>
      </section>

      {filteredQuestions.length === 0 ? (
        <section className="result-card"><h2>No questions found</h2><p>There are no published aptitude questions for this filter yet. Try another filter or ask faculty to publish more questions.</p></section>
      ) : (
        <section className="question-card">
          <div className="question-meta"><span>{question.topic || 'APTITUDE'}</span><span>{question.difficulty}</span><span>Question {index + 1} of {filteredQuestions.length}</span></div>
          <h2>{question.question_text}</h2>
          <div className="options">
            {(question.options ?? []).map((option) => {
              const correct = answered && option === question.correct_answer;
              const wrong = answered && option === selected && option !== question.correct_answer;
              return <button key={option} className={`option ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} onClick={() => choose(option)}>{option}</button>;
            })}
          </div>
          {answered && <div className={`feedback ${selected === question.correct_answer ? 'success' : 'failure'}`}><strong>{selected === question.correct_answer ? 'Correct!' : 'Not quite.'}</strong><p>{question.explanation || 'Keep practicing and review the concept behind this question.'}</p><button onClick={next}>{index === filteredQuestions.length - 1 ? 'See result' : 'Next question'}</button></div>}
        </section>
      )}
    </main>
  );
}
