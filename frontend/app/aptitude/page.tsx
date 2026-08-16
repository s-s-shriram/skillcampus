'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const questions = [
  {
    id: 1,
    topic: 'Quantitative Aptitude',
    difficulty: 'Easy',
    question: 'A train travels 120 km in 2 hours. What is its average speed?',
    options: ['40 km/h', '50 km/h', '60 km/h', '80 km/h'],
    answer: '60 km/h',
    explanation: 'Average speed = distance ÷ time = 120 ÷ 2 = 60 km/h.'
  },
  {
    id: 2,
    topic: 'Percentages',
    difficulty: 'Easy',
    question: 'What is 20% of 250?',
    options: ['25', '40', '50', '60'],
    answer: '50',
    explanation: '20% of 250 = (20/100) × 250 = 50.'
  },
  {
    id: 3,
    topic: 'Logical Reasoning',
    difficulty: 'Medium',
    question: 'Find the next number: 2, 6, 12, 20, 30, ?',
    options: ['36', '40', '42', '44'],
    answer: '42',
    explanation: 'The differences are 4, 6, 8, 10, so the next difference is 12. Therefore 30 + 12 = 42.'
  },
  {
    id: 4,
    topic: 'Verbal Ability',
    difficulty: 'Easy',
    question: 'Choose the word closest in meaning to “abundant”.',
    options: ['Rare', 'Plentiful', 'Empty', 'Weak'],
    answer: 'Plentiful',
    explanation: 'Abundant means existing in large quantities; plentiful has the same meaning.'
  },
  {
    id: 5,
    topic: 'Time and Work',
    difficulty: 'Medium',
    question: 'A person completes a job in 10 days. What fraction of the job is completed in one day at the same rate?',
    options: ['1/5', '1/10', '1/20', '10/1'],
    answer: '1/10',
    explanation: 'If the complete job takes 10 equal-rate days, one day completes 1/10 of the job.'
  }
];

export default function AptitudePage() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const question = questions[index];
  const finished = index === questions.length;
  const percentage = useMemo(() => Math.round((score / questions.length) * 100), [score]);

  function choose(option: string) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === question.answer) setScore((value) => value + 1);
  }

  function next() {
    setSelected('');
    setAnswered(false);
    setIndex((value) => value + 1);
  }

  if (finished) {
    return (
      <main className="practice-page">
        <div className="practice-header"><p className="eyebrow">SKILLCAMPUS · APTITUDE</p><h1>Practice complete 🎉</h1><p>You scored <strong>{score}/{questions.length}</strong> ({percentage}%).</p></div>
        <section className="result-card"><h2>Keep improving</h2><p>Practice different topics and difficulty levels. Your attempt engine is ready; the next step is connecting this practice bank to Supabase.</p><Link className="primary-link" href="/dashboard">Back to dashboard</Link></section>
      </main>
    );
  }

  return (
    <main className="practice-page">
      <header className="practice-header">
        <div><p className="eyebrow">SKILLCAMPUS · APTITUDE</p><h1>Practice</h1><p>Question {index + 1} of {questions.length} · Score {score}</p></div>
        <Link className="secondary-link" href="/dashboard">Dashboard</Link>
      </header>

      <section className="question-card">
        <div className="question-meta"><span>{question.topic}</span><span>{question.difficulty}</span></div>
        <h2>{question.question}</h2>
        <div className="options">
          {question.options.map((option) => {
            const correct = answered && option === question.answer;
            const wrong = answered && option === selected && option !== question.answer;
            return <button key={option} className={`option ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} onClick={() => choose(option)}>{option}</button>;
          })}
        </div>
        {answered && <div className={`feedback ${selected === question.answer ? 'success' : 'failure'}`}><strong>{selected === question.answer ? 'Correct!' : 'Not quite.'}</strong><p>{question.explanation}</p><button onClick={next}>{index === questions.length - 1 ? 'See result' : 'Next question'}</button></div>}
      </section>
    </main>
  );
}
