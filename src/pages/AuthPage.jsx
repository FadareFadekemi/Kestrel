import { useState } from 'react';
import { Zap, Mail, Lock, User, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { login, signup } from '../services/authApi';

export default function AuthPage({ onAuth }) {
  const [mode,     setMode]     = useState('login');   // 'login' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const isNewUser = mode === 'signup';
      const user = isNewUser
        ? await signup(email, password, name)
        : await login(email, password);
      onAuth(user, isNewUser);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); };

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0F0F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,212,200,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #00D4C8, #00B8AD)',
            boxShadow: '0 0 28px rgba(0,212,200,0.3)', marginBottom: 14,
          }}>
            <Zap size={24} color="#0A0F0F" fill="#0A0F0F" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#00D4C8', margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: "'Clash Display', sans-serif" }}>techcori</h1>
          <p style={{ fontSize: 13, color: '#4A7A78', margin: 0 }}>work smart, rise sharp</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111A1A', border: '1px solid #1E3030',
          borderRadius: 16, padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#E8F5F4', margin: '0 0 6px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13, color: '#4A7A78', margin: '0 0 24px' }}>
            {mode === 'login' ? 'Sign in to your techcori workspace' : 'Start researching leads in seconds'}
          </p>

          {error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <AlertCircle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <Field
                icon={<User size={14} color="#4A7A78" />}
                type="text" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <Field
              icon={<Mail size={14} color="#4A7A78" />}
              type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" required
            />
            <div style={{ position: 'relative' }}>
              <Field
                icon={<Lock size={14} color="#4A7A78" />}
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                paddingRight={40}
              />
              <button
                type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4A7A78', padding: 4, display: 'flex' }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? '#1E3030' : 'linear-gradient(135deg, #00D4C8, #00B8AD)',
                color: loading ? '#4A7A78' : '#0A0F0F',
                border: 'none', borderRadius: 10, padding: '11px',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s', marginTop: 4,
              }}
            >
              {loading
                ? <><Loader size={14} className="animate-spin-icon" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                : mode === 'login' ? 'Sign in' : 'Create account'
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#4A7A78', marginTop: 20, marginBottom: 0 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={switchMode} style={{ color: '#00D4C8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>


      </div>
    </div>
  );
}

function Field({ icon, paddingRight, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        {icon}
      </div>
      <input
        {...props}
        style={{
          width: '100%', background: '#0A0F0F', border: '1px solid #264040',
          borderRadius: 8, padding: `10px 12px 10px 36px`,
          paddingRight: paddingRight || 12,
          color: '#E8F5F4', fontSize: 13, outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#00D4C8'}
        onBlur={e  => e.target.style.borderColor = '#264040'}
      />
    </div>
  );
}
