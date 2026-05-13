import { useState, useRef } from 'react';
import { Zap, Target, ArrowRight, Upload, CheckCircle, X } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import { useTheme } from '../context/ThemeContext';

const JS_PROFILE_KEY = 'kestrel_jobseeker_profile';

const EDUCATION_OPTIONS = ['', 'SSCE', 'OND', 'HND', 'BSc', 'MSc', 'PhD'];
const EXPERIENCE_OPTIONS = ['', '0 — Fresh Graduate', '1–2 years', '3–5 years', '5+ years'];
const ROLE_SUGGESTIONS = [
  'Software Engineer', 'Marketing Manager', 'Product Manager', 'Data Analyst',
  'Finance Analyst', 'UI/UX Designer', 'Business Analyst', 'Sales Executive',
  'Human Resources', 'Operations Manager',
];
const ALLOWED_CV_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_CV_EXTS = ['.pdf', '.doc', '.docx'];

function getProgress(form) {
  let p = 0;
  if (form.fullName.trim())   p += 20;
  if (form.targetRole.trim()) p += 20;
  if (form.education)         p += 20;
  if (form.experience)        p += 20;
  if (form.location.trim())   p += 10;
  if (form.cvFileName)        p += 10;
  return p;
}

export default function JobSeekerSetupPage({ user, onComplete }) {
  const { colors: c } = useTheme();
  const isMobile = useIsMobile();
  const fileRef  = useRef(null);

  const [form, setForm] = useState({
    fullName:    user?.name || '',
    targetRole:  '',
    education:   '',
    experience:  '',
    location:    'Lagos, Nigeria',
    cvFileName:  '',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cvError,         setCvError]         = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const progress = getProgress(form);

  const filteredSuggestions = ROLE_SUGGESTIONS.filter(r =>
    r.toLowerCase().includes(form.targetRole.toLowerCase()) && form.targetRole.length > 0
  );

  const handleCVSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_CV_TYPES.includes(file.type) || !ALLOWED_CV_EXTS.includes(ext)) {
      setCvError('Only PDF or Word documents (.pdf, .doc, .docx) are accepted.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCvError('File must be under 5 MB.');
      e.target.value = '';
      return;
    }
    setCvError('');
    set('cvFileName', file.name);
  };

  const handleSave = () => {
    const profile = { ...form, savedAt: new Date().toISOString() };
    try { localStorage.setItem(JS_PROFILE_KEY, JSON.stringify(profile)); } catch { /* private mode */ }
    onComplete();
  };

  const isValid = form.fullName.trim() && form.targetRole.trim() && form.education && form.experience;

  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: c.mut,
    letterSpacing: '0.5px', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  };

  const inputStyle = {
    width: '100%', background: c.bg, border: `1px solid ${c.brd}`,
    borderRadius: 8, padding: '9px 12px', color: c.txt,
    fontSize: 13, outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit',
  };

  const selectStyle = {
    width: '100%', background: c.bg, border: `1px solid ${c.brd}`,
    borderRadius: 8, padding: '9px 12px', color: c.txt,
    fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh', background: c.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 16px' : 40,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 400, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(0,212,200,0.06) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48, borderRadius: 13,
            background: 'linear-gradient(135deg, #00D4C8, #7c3aed)',
            boxShadow: '0 0 24px rgba(0,212,200,0.25)', marginBottom: 14,
          }}>
            <Target size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.txt, margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            Set up your profile
          </h1>
          <p style={{ fontSize: 13, color: c.mut, margin: 0 }}>
            techcori uses this to find the right companies and write emails as you.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: c.mut, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Profile completeness</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: progress >= 80 ? '#34d399' : '#00D4C8' }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: c.brd, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress >= 80 ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #00D4C8, #00B8AD)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: c.card, border: `1px solid ${c.brd}`, borderRadius: 16,
          padding: isMobile ? 20 : 28, boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Full name */}
            <Field label="Full Name *" placeholder="e.g. Amara Okonkwo"
              value={form.fullName} onChange={v => set('fullName', v)}
              labelStyle={labelStyle} inputStyle={inputStyle} />

            {/* Target role with suggestions */}
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Target Role / Industry *</label>
              <input
                value={form.targetRole}
                onChange={e => { set('targetRole', e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. Software Engineer, Marketing Manager"
                style={inputStyle}
                onFocusCap={e => e.target.style.borderColor = '#00D4C8'}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                  background: '#1c1c1f', border: `1px solid ${c.brd}`, borderRadius: 8,
                  overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {filteredSuggestions.map(s => (
                    <button key={s} onMouseDown={() => { set('targetRole', s); setShowSuggestions(false); }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 14px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: c.txt,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = c.brd}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >{s}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Education + Experience */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Highest Education Level *</label>
                <select value={form.education} onChange={e => set('education', e.target.value)} style={selectStyle}
                  onFocus={e => e.target.style.borderColor = '#00D4C8'}
                  onBlur={e  => e.target.style.borderColor = c.brd}>
                  {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select level...'}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Years of Experience *</label>
                <select value={form.experience} onChange={e => set('experience', e.target.value)} style={selectStyle}
                  onFocus={e => e.target.style.borderColor = '#00D4C8'}
                  onBlur={e  => e.target.style.borderColor = c.brd}>
                  {EXPERIENCE_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select experience...'}</option>)}
                </select>
              </div>
            </div>

            {/* Location */}
            <Field label="Location (City, Country)" placeholder="e.g. Lagos, Nigeria"
              value={form.location} onChange={v => set('location', v)}
              labelStyle={labelStyle} inputStyle={inputStyle} />

            {/* CV Upload */}
            <div>
              <label style={labelStyle}>Upload CV <span style={{ color: '#264040', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
              <input
                ref={fileRef} type="file" accept=".pdf,.doc,.docx"
                onChange={handleCVSelect} style={{ display: 'none' }}
              />
              {form.cvFileName ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} color="#34d399" />
                    <span style={{ fontSize: 12, color: '#34d399', fontWeight: 500 }}>{form.cvFileName}</span>
                  </div>
                  <button onClick={() => { set('cvFileName', ''); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.mut, display: 'flex', padding: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} style={{
                  width: '100%', background: c.bg, border: `2px dashed ${c.brd}`,
                  borderRadius: 8, padding: '16px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#264040'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = c.brd}
                >
                  <Upload size={18} color={c.mut} />
                  <span style={{ fontSize: 12, color: c.mut }}>Click to upload PDF or Word document</span>
                </button>
              )}
              {cvError && <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{cvError}</p>}
              {!form.cvFileName && !cvError && (
                <p style={{ fontSize: 11, color: '#264040', marginTop: 4 }}>You can add this later from CV Optimiser</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
            <button onClick={onComplete} style={{
              padding: '11px 20px', borderRadius: 10,
              background: 'transparent', color: c.mut,
              border: `1px solid ${c.brd}`, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Skip for now</button>
            <button onClick={handleSave} disabled={!isValid} style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: isValid ? 'linear-gradient(135deg, #00D4C8, #7c3aed)' : c.brd,
              color: isValid ? '#fff' : c.mut,
              border: 'none', fontSize: 14, fontWeight: 700,
              cursor: isValid ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              Complete Profile <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: c.brd, marginTop: 16 }}>
          Your data stays on this device until you choose to sync it.
        </p>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, required, labelStyle, inputStyle }) {
  const { colors: c } = useTheme();
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} style={inputStyle}
        onFocus={e => e.target.style.borderColor = '#00D4C8'}
        onBlur={e  => e.target.style.borderColor = c.brd} />
    </div>
  );
}
