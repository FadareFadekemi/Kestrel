import { useState } from 'react';
import { Zap, Mail, Lock, User, Loader, AlertCircle, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { login, signup } from '../services/authApi';
import { useTheme } from '../context/ThemeContext';

const BASE = '/api';

async function requestPasswordReset(email) {
  const r = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function submitPasswordReset(token, password) {
  const r = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || 'Reset failed');
  return data;
}

export default function AuthPage({ onAuth, initialMode = 'login', resetToken = null }) {
  const { colors: c } = useTheme();
  const [mode,      setMode]      = useState(resetToken ? 'reset' : initialMode);
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [name,      setName]      = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login' || mode === 'signup') {
        const isNewUser = mode === 'signup';
        const user = isNewUser
          ? await signup(email, password, name)
          : await login(email, password);
        onAuth(user, isNewUser);
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setSuccess('If that email is registered, a reset link has been sent. Check your inbox.');
      } else if (mode === 'reset') {
        if (password !== password2) {
          setError('Passwords do not match.');
          return;
        }
        await submitPasswordReset(resetToken, password);
        setSuccess('Password updated! You can now sign in.');
        setTimeout(() => setMode('login'), 1800);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
  };

  const titles = {
    login:  ['Welcome back',         'Sign in to your techcori workspace'],
    signup: ['Create your account',  'Start researching leads in seconds'],
    forgot: ['Reset your password',  'Enter your email and we\'ll send a reset link'],
    reset:  ['Set a new password',   'Choose a strong password for your account'],
  };
  const [title, subtitle] = titles[mode];

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, var(--accent-dim) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-mid))',
            boxShadow: '0 0 28px var(--accent-glow)', marginBottom: 14,
          }}>
            <Zap size={24} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: "'Clash Display', sans-serif" }}>techcori</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>work smart, rise sharp</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
        }}>
          {/* Back link for forgot/reset */}
          {(mode === 'forgot' || mode === 'reset') && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 20, padding: 0 }}>
              <ArrowLeft size={14} /> Back to sign in
            </button>
          )}

          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>{title}</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>{subtitle}</p>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: 'var(--error-dim)', border: '1px solid var(--error)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <AlertCircle size={14} color="var(--error)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--error)' }}>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: 'var(--success-dim)', border: '1px solid var(--success)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <CheckCircle size={14} color="var(--success)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--success)' }}>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'signup' && (
              <Field icon={<User size={14} />} type="text" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
              <Field icon={<Mail size={14} />} type="email" placeholder="Email address"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div style={{ position: 'relative' }}>
                <Field icon={<Lock size={14} />}
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'reset' ? 'New password (min. 8 characters)' : mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required paddingRight={40}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex',
                }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <Field icon={<Lock size={14} />}
                type={showPw ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={password2} onChange={e => setPassword2(e.target.value)}
                autoComplete="new-password" required
              />
            )}

            <button type="submit" disabled={loading} style={{
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--accent), var(--accent-mid))',
              color: loading ? 'var(--muted)' : '#fff',
              border: 'none', borderRadius: 10, padding: '11px',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s', marginTop: 4,
            }}>
              {loading
                ? <><Loader size={14} className="animate-spin-icon" /> Processing…</>
                : mode === 'login'  ? 'Sign in'
                : mode === 'signup' ? 'Create account'
                : mode === 'forgot' ? 'Send reset link'
                : 'Set new password'}
            </button>
          </form>

          {/* Forgot password link — only on login */}
          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0 }}>
                Forgot your password?
              </button>
            </div>
          )}

          {/* Switch between login / signup */}
          {(mode === 'login' || mode === 'signup') && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20, marginBottom: 0 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={switchMode} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, paddingRight, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}>
        {icon}
      </div>
      <input
        {...props}
        style={{
          width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)',
          borderRadius: 8, padding: `10px 12px 10px 36px`,
          paddingRight: paddingRight || 12,
          color: 'var(--text)', fontSize: 13, outline: 'none',
          transition: 'border-color 0.15s', fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
        onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e   => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  );
}
