import { useState, useCallback, useRef } from 'react';
import { Search, Building2, Mail, CheckCircle, Copy, RotateCcw, Loader, AlertCircle, ChevronRight, Zap } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { jsResearch, jsProfiling, jsEmail } from '../../services/jsApi';

const JS_PROFILE_KEY  = 'kestrel_jobseeker_profile';
const APPS_KEY        = 'kestrel_js_applications';

const TONES = ['Professional', 'Enthusiastic', 'Concise'];

function readProfile() {
  try { const v = localStorage.getItem(JS_PROFILE_KEY); return v ? JSON.parse(v) : {}; } catch { return {}; }
}
function saveApp(app) {
  try {
    const raw  = localStorage.getItem(APPS_KEY);
    const apps = raw ? JSON.parse(raw) : [];
    localStorage.setItem(APPS_KEY, JSON.stringify([{ id: Date.now(), ...app, createdAt: new Date().toISOString() }, ...apps]));
  } catch { /* private mode */ }
}

const STEPS = ['Research', 'Company Profile', 'Write Email'];

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: done ? '#34d399' : active ? 'rgba(0,212,200,0.2)' : '#1E3030', border: done ? '2px solid #34d399' : active ? '2px solid #00D4C8' : '2px solid #264040', color: done ? '#0A0F0F' : active ? '#00D4C8' : '#4A7A78', flexShrink: 0 }}>
                {done ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#E8F5F4' : done ? '#4A7A78' : '#4A7A78', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} color="#264040" style={{ margin: '0 8px', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Skeleton({ height = 16, width = '100%', style = {} }) {
  return <div style={{ height, width, background: 'linear-gradient(90deg,#1E3030 25%,#264040 50%,#1E3030 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.4s infinite', ...style }} />;
}

export default function OutreachAssistantPage() {
  const isMobile   = useIsMobile();
  const profile    = readProfile();
  const targetRole = profile.targetRole || '';

  const [step,       setStep]       = useState(0);
  const [company,    setCompany]    = useState('');
  const [role,       setRole]       = useState(targetRole);
  const [tone,       setTone]       = useState('Professional');
  const [status,     setStatus]     = useState('');
  const [research,   setResearch]   = useState(null);
  const [compProfile, setCompProfile] = useState(null);
  const [email,      setEmail]      = useState(null);
  const [streaming,  setStreaming]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [copyDone,   setCopyDone]   = useState(false);
  const [saved,      setSaved]      = useState(false);

  const inputStyle = { background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 8, padding: '9px 12px', color: '#E8F5F4', fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' };
  const onF = e => (e.target.style.borderColor = '#00D4C8');
  const onB = e => (e.target.style.borderColor = '#1E3030');

  const reset = () => {
    setStep(0); setResearch(null); setCompProfile(null); setEmail(null);
    setStreaming(''); setError(''); setStatus(''); setSaved(false); setCopyDone(false);
  };

  // Step 0 → 1: Research
  const handleResearch = async () => {
    if (!company.trim() || !role.trim()) return;
    setLoading(true); setError(''); setStreaming(''); setStatus('');
    try {
      const result = await jsResearch(company.trim(), role.trim(), {
        onStatus: t => setStatus(t),
      });
      setResearch(result);
      // Auto-advance to profiling
      setStep(1);
      await handleProfile(result);
    } catch (err) {
      setError(err.message || 'Research failed. Try again.');
    }
    setLoading(false); setStatus('');
  };

  // Step 1 → 2: Profile
  const handleProfile = async (researchData) => {
    setStatus('Scoring company for your profile…');
    try {
      const result = await jsProfiling(researchData, role.trim(), {
        onStream: t => setStreaming(prev => prev + t),
      });
      setStreaming('');
      setCompProfile(result);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Profiling failed. Try again.');
    }
    setStatus('');
  };

  // Step 2: Write email
  const handleWriteEmail = async () => {
    if (!compProfile || !research) return;
    setLoading(true); setError(''); setStreaming(''); setStatus(`Writing ${tone} outreach email…`);
    try {
      const candidate = {
        name:       profile.fullName || 'the candidate',
        targetRole: role,
        experience: profile.experience || '',
        skills:     '',
      };
      const result = await jsEmail(compProfile, research, candidate, tone, {
        onStream: t => setStreaming(prev => prev + t),
      });
      setStreaming('');
      setEmail(result);
    } catch (err) {
      setError(err.message || 'Email generation failed.');
    }
    setLoading(false); setStatus('');
  };

  const handleCopy = () => {
    if (!email) return;
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`).then(() => {
      setCopyDone(true); setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleSaveToApplications = () => {
    saveApp({ company: company.trim(), role: role.trim(), status: 'Draft', appliedDate: new Date().toISOString().slice(0, 10), emailSubject: email?.subject || '' });
    setSaved(true);
  };

  const ScoreBar = ({ label, score }) => {
    const color = score >= 70 ? '#34d399' : score >= 40 ? '#00D4C8' : '#f87171';
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#4A7A78' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{score}</span>
        </div>
        <div style={{ height: 5, background: '#1E3030', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(score, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Outreach Assistant</h1>
          <p style={{ fontSize: 13, color: '#4A7A78', marginTop: 4 }}>Research a company → score the fit → write a personalised email</p>
        </div>
        {step > 0 && (
          <button onClick={reset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #264040', borderRadius: 8, padding: '7px 14px', color: '#4A7A78', fontSize: 12, cursor: 'pointer' }}>
            <RotateCcw size={13} /> Start over
          </button>
        )}
      </div>

      <div style={{ maxWidth: 780 }}>
        <StepIndicator current={step} />

        {/* Step 0: Input */}
        {step === 0 && (
          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 16px' }}>Who are you reaching out to?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company name</label>
                <input value={company} onChange={e => setCompany(e.target.value)} onFocus={onF} onBlur={onB}
                  placeholder="e.g. Paystack, MTN Nigeria, Flutterwave" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target role</label>
                <input value={role} onChange={e => setRole(e.target.value)} onFocus={onF} onBlur={onB}
                  placeholder={targetRole || 'e.g. Software Engineer, Product Manager'} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email tone</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${tone === t ? 'rgba(0,212,200,0.4)' : '#1E3030'}`, background: tone === t ? 'rgba(0,212,200,0.1)' : 'transparent', color: tone === t ? '#00D4C8' : '#4A7A78', fontSize: 12, fontWeight: tone === t ? 600 : 400, cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
              </div>
            )}

            <button onClick={handleResearch} disabled={loading || !company.trim() || !role.trim()}
              style={{ width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: loading ? 'rgba(0,212,200,0.06)' : 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 10, padding: '12px', color: '#00D4C8', fontSize: 14, fontWeight: 700, cursor: (loading || !company.trim() || !role.trim()) ? 'not-allowed' : 'pointer', opacity: (!company.trim() || !role.trim()) ? 0.5 : 1 }}>
              {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
              {loading ? (status || 'Researching…') : 'Research & Score Company'}
            </button>
          </div>
        )}

        {/* Step 1: Loading/profiling */}
        {step === 1 && (loading || status) && (
          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: '#4A7A78', fontSize: 13 }}>
              <Loader size={15} style={{ animation: 'spin 1s linear infinite', color: '#00D4C8' }} />
              {status || 'Scoring company fit…'}
            </div>
            {streaming && <p style={{ fontSize: 13, color: '#4A7A78', margin: 0, lineHeight: 1.7, fontFamily: 'monospace' }}>{streaming}</p>}
            {!streaming && (
              <div>
                <Skeleton height={14} width="70%" style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="50%" style={{ marginBottom: 16 }} />
                {[100, 80, 65, 90].map((w, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <Skeleton height={10} width={`${w}%`} style={{ marginBottom: 4 }} />
                    <Skeleton height={5} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Company profile shown */}
        {step === 2 && compProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Profile card */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>{compProfile.companyName || company}</p>
                  <p style={{ fontSize: 12, color: '#4A7A78', margin: '4px 0 0' }}>{compProfile.industry} · {compProfile.companySize} · {compProfile.location}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: compProfile.scores?.overall >= 70 ? '#34d399' : compProfile.scores?.overall >= 40 ? '#00D4C8' : '#f87171' }}>{compProfile.scores?.overall}</div>
                  <div style={{ fontSize: 10, color: '#4A7A78' }}>Overall fit</div>
                </div>
              </div>

              {compProfile.culture && <p style={{ fontSize: 12, color: '#8ABAB8', margin: '0 0 16px', lineHeight: 1.6, borderLeft: '2px solid #264040', paddingLeft: 10 }}>{compProfile.culture}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div>
                  {compProfile.scores && Object.entries({ 'Role Fit': compProfile.scores.roleFit, 'Culture Fit': compProfile.scores.cultureFit, 'Growth Stage': compProfile.scores.growthStage, 'Hiring Activity': compProfile.scores.hiringActivity }).map(([label, score]) => (
                    <ScoreBar key={label} label={label} score={score} />
                  ))}
                </div>
                <div>
                  {compProfile.hiringSignals?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hiring signals</p>
                      <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                        {compProfile.hiringSignals.slice(0, 3).map((s, i) => <li key={i} style={{ fontSize: 12, color: '#8ABAB8', marginBottom: 4, lineHeight: 1.5 }}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {compProfile.hiringManagerHint && (
                    <div style={{ background: 'rgba(0,212,200,0.05)', border: '1px solid rgba(0,212,200,0.15)', borderRadius: 7, padding: '8px 10px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#00D4C8', margin: '0 0 3px' }}>Likely recipient</p>
                      <p style={{ fontSize: 12, color: '#8ABAB8', margin: 0 }}>{compProfile.hiringManagerHint}</p>
                    </div>
                  )}
                </div>
              </div>

              {compProfile.scoreReasoning && <p style={{ fontSize: 12, color: '#4A7A78', margin: '14px 0 0', lineHeight: 1.6 }}>{compProfile.scoreReasoning}</p>}
            </div>

            {/* Tone selector */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 12px' }}>Email tone</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${tone === t ? 'rgba(0,212,200,0.4)' : '#1E3030'}`, background: tone === t ? 'rgba(0,212,200,0.1)' : 'transparent', color: tone === t ? '#00D4C8' : '#4A7A78', fontSize: 12, fontWeight: tone === t ? 600 : 400, cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                  <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
                </div>
              )}

              {!email && (
                <button onClick={handleWriteEmail} disabled={loading}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: loading ? 'rgba(0,212,200,0.06)' : 'rgba(0,212,200,0.12)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 10, padding: '12px', color: '#00D4C8', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={15} />}
                  {loading ? (status || 'Writing email…') : 'Write Outreach Email'}
                </button>
              )}

              {loading && streaming && <p style={{ fontSize: 12, color: '#4A7A78', margin: '12px 0 0', lineHeight: 1.7, fontFamily: 'monospace' }}>{streaming}</p>}
              {loading && !streaming && status && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: '#4A7A78', fontSize: 12 }}>
                  <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> {status}
                </div>
              )}
            </div>

            {/* Email result */}
            {email && (
              <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>Your outreach email</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleWriteEmail} disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #264040', borderRadius: 7, padding: '6px 10px', color: '#4A7A78', fontSize: 12, cursor: 'pointer' }}>
                      <RotateCcw size={12} /> Regenerate
                    </button>
                    <button onClick={handleCopy}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: copyDone ? 'rgba(52,211,153,0.1)' : 'rgba(0,212,200,0.1)', border: `1px solid ${copyDone ? 'rgba(52,211,153,0.25)' : 'rgba(0,212,200,0.25)'}`, borderRadius: 7, padding: '6px 12px', color: copyDone ? '#34d399' : '#00D4C8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {copyDone ? <CheckCircle size={12} /> : <Copy size={12} />} {copyDone ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div style={{ background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F5F4', margin: '0 0 16px' }}>{email.subject}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Body</p>
                  <p style={{ fontSize: 13, color: '#C5E8E6', margin: 0, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{email.body}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#4A7A78' }}>{email.wordCount || '—'} words · {email.tone} tone</span>
                  <button onClick={handleSaveToApplications} disabled={saved}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: saved ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)', border: `1px solid ${saved ? 'rgba(52,211,153,0.25)' : 'rgba(96,165,250,0.25)'}`, borderRadius: 8, padding: '8px 14px', color: saved ? '#34d399' : '#60a5fa', fontSize: 12, fontWeight: 600, cursor: saved ? 'default' : 'pointer' }}>
                    {saved ? <CheckCircle size={13} /> : <Zap size={13} />} {saved ? 'Saved to Applications' : 'Save to Applications'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
