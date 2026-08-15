'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function RegisterPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, requested_role: 'STUDENT' } },
    });

    if (error) setError(error.message);
    else setMessage('Account created. Check your email to verify your account.');
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">SKILLCAMPUS</p>
        <h1>Create your account</h1>
        <p className="muted">Join SkillCampus for learning, practice and placement preparation.</p>
        <form onSubmit={handleRegister}>
          <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label>College email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label>Confirm password<input type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="muted">Students are registered as STUDENT. Faculty/Admin accounts will be provisioned securely by authorized administrators.</p>
      </div>
    </main>
  );
}
