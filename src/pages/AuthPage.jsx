import { useState } from 'react';
import { Zap, Mail, Lock, User, Loader, AlertCircle, Eye, EyeOff,
         ArrowLeft, CheckCircle, Building2, Target } from 'lucide-react';
import { login, signup } from '../services/authApi';
import { useTheme } from '../context/ThemeContext';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

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

export default function AuthPage({ onAuth, resetToken = null }) {
  const { isDark, colors: c } = useTheme();
  const [mode,       setMode]       = useState(resetToken ? 'reset' : 'landing');
  // 'landing' = choose type first, 'login', 'signup', 'forgot', 'reset'
  const [accountType, setAccountType] = useState(null); // 'jobseeker' | 'company'
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [password2,  setPassword2]  = useState('');
  const [name,       setName]       = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const selectType = (type, nextMode) => {
    setAccountType(type);
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(email, password, accountType || '');
        onAuth(user);
      } else if (mode === 'signup') {
        const user = await signup(email, password, name, accountType);
        onAuth(user);
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setSuccess('If that email is registered, a reset link has been sent. Check your inbox.');
      } else if (mode === 'reset') {
        if (password !== password2) { setError('Passwords do not match.'); return; }
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

  const goBack = () => {
    setMode('landing');
    setAccountType(null);
    setError('');
    setSuccess('');
  };

  const cardBg = 'var(--card)';

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

      <div style={{ width: '100%', maxWidth: mode === 'landing' ? 640 : 420, position: 'relative', zIndex: 1, transition: 'max-width 0.2s' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-mid))',
            boxShadow: '0 0 24px var(--accent-glow)', marginBottom: 12,
          }}>
            <Zap size={22} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: "'Clash Display', sans-serif" }}>techcori</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>work smart, rise sharp</p>
        </div>

        {/* ── Landing: choose account type (for both login & signup) ───── */}
        {mode === 'landing' && (
          <div>
            <h2 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text)', textAlign: 'center', margin: '0 0 6px' }}>
              Who are you?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', margin: '0 0 28px' }}>
              Each account type is completely separate. One email can only be registered to one account type.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <TypeCard
                icon={<Target size={28} color="var(--accent)" />}
                title="Job Seeker"
                description="Find jobs, optimise your CV, and reach hiring managers directly."
                note="Any email works"
                onLogin={() => selectType('jobseeker', 'login')}
                onSignup={() => selectType('jobseeker', 'signup')}
                isDark={isDark}
              />
              <TypeCard
                icon={<Building2 size={28} color="var(--accent)" />}
                title="Company"
                description="Research leads, write outreach, and post verified job listings."
                note="Work email required for signup"
                noteWarning
                onLogin={() => selectType('company', 'login')}
                onSignup={() => selectType('company', 'signup')}
                isDark={isDark}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              One email address = one account type. To use both, register with two different email addresses.
            </p>
          </div>
        )}

        {/* ── Login / Signup / Forgot / Reset form ─────────────────────── */}
        {mode !== 'landing' && (
          <div style={{
            background: cardBg, border: '1px solid var(--border)',
            borderRadius: 16, padding: 32,
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.4)' : '0 12px 40px rgba(0,0,0,0.08)',
          }}>
            {/* Back button */}
            <button onClick={mode === 'forgot' || mode === 'reset' ? () => { setMode('login'); setError(''); setSuccess(''); } : goBack}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 18, padding: 0 }}>
              <ArrowLeft size={14} />
              {mode === 'forgot' || mode === 'reset' ? 'Back to sign in' : 'Back'}
            </button>

            {/* Account type chip */}
            {accountType && (mode === 'login' || mode === 'signup') && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '4px 12px', marginBottom: 16 }}>
                {accountType === 'company' ? <Building2 size={12} color="var(--accent)" /> : <Target size={12} color="var(--accent)" />}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                  {accountType === 'company' ? 'Company Account' : 'Job Seeker Account'}
                </span>
              </div>
            )}

            {/* Title */}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
              {mode === 'login'  ? 'Welcome back'
               : mode === 'signup' && accountType === 'company'   ? 'Create company account'
               : mode === 'signup' ? 'Create job seeker account'
               : mode === 'forgot' ? 'Reset your password'
               : 'Set a new password'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>
              {mode === 'login'  ? `Signing in as ${accountType === 'company' ? 'a company' : 'a job seeker'}`
               : mode === 'signup' && accountType === 'company' ? 'Work email required — no Gmail, Yahoo, Hotmail, etc.'
               : mode === 'signup' ? 'Any email address works'
               : mode === 'forgot' ? "Enter your email and we'll send a reset link"
               : 'Choose a strong new password'}
            </p>

            {/* Error / success */}
            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--error-dim)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                <AlertCircle size={14} color="var(--error)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--error)', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}
            {success && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                <CheckCircle size={14} color="var(--success)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--success)' }}>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <Field icon={<User size={14} />} type="text" placeholder="Your full name"
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
                    placeholder={mode === 'reset' ? 'New password (min. 8 chars)' : mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
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
                <Field icon={<Lock size={14} />} type={showPw ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={password2} onChange={e => setPassword2(e.target.value)}
                  autoComplete="new-password" required />
              )}

              <button type="submit" disabled={loading} style={{
                background: loading ? 'var(--border)' : 'linear-gradient(135deg, var(--accent), var(--accent-mid))',
                color: loading ? 'var(--muted)' : '#fff',
                border: 'none', borderRadius: 10, padding: '12px',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s', marginTop: 4,
              }}>
                {loading ? <><Loader size={14} className="animate-spin-icon" /> Processing…</>
                  : mode === 'login'  ? 'Sign in'
                  : mode === 'signup' ? 'Create account'
                  : mode === 'forgot' ? 'Send reset link'
                  : 'Set new password'}
              </button>
            </form>

            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
                {error && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Wrong account type?{' '}
                    <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                      Go back
                    </button>
                  </span>
                )}
                <button onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: 0, marginLeft: 'auto' }}>
                  Forgot your password?
                </button>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20, marginBottom: 0 }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={switchMode} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypeCard({ icon, title, description, note, noteWarning, onLogin, onSignup, isDark }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1.5px solid var(--border)',
      borderRadius: 14, padding: '20px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
      textAlign: 'center', alignItems: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--accent-dim)', border: '1px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px', fontFamily: "'Clash Display', sans-serif" }}>{title}</p>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{description}</p>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600,
        color: noteWarning ? 'var(--warning)' : 'var(--success)',
        background: noteWarning ? 'var(--warning-dim)' : 'var(--success-dim)',
        borderRadius: 6, padding: '3px 8px',
      }}>
        {note}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        <button onClick={onSignup} style={{
          width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          Sign up
        </button>
        <button onClick={onLogin} style={{
          width: '100%', padding: '7px 0', borderRadius: 8,
          border: '1.5px solid var(--border)', background: 'transparent',
          color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Sign in
        </button>
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
