import { useState, useCallback } from 'react';
import { FileText, Wand2, Download, Copy, Loader, CheckCircle, Plus, Trash2, AlertCircle, Zap } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { analyseCV, improveSummary, improveBullet, suggestSkills, matchJD } from '../../services/jsApi';

const JS_PROFILE_KEY = 'kestrel_jobseeker_profile';
const CV_BUILDER_KEY = 'kestrel_cv_builder';

const DEFAULT_BUILDER = {
  summary: '',
  skills: '',
  experience: [{ id: 1, role: '', company: '', period: '', bullets: '' }],
  education:  [{ id: 1, degree: '', school: '', year: '' }],
  projects: '',
  certifications: '',
};

function readProfile() {
  try { const v = localStorage.getItem(JS_PROFILE_KEY); return v ? JSON.parse(v) : {}; } catch { return {}; }
}
function readBuilder() {
  try { const v = localStorage.getItem(CV_BUILDER_KEY); return v ? { ...DEFAULT_BUILDER, ...JSON.parse(v) } : DEFAULT_BUILDER; } catch { return DEFAULT_BUILDER; }
}
function saveBuilder(b) {
  try { localStorage.setItem(CV_BUILDER_KEY, JSON.stringify(b)); } catch { /* private mode */ }
}

const TABS = ['CV Builder', 'Upload & Analyse', 'JD Matcher'];

const ScoreBar = ({ label, score, color }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: '#8ABAB8' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{score}</span>
    </div>
    <div style={{ height: 6, background: '#1E3030', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(score, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

const Skeleton = ({ height = 16, width = '100%', style = {} }) => (
  <div style={{ height, width, background: 'linear-gradient(90deg,#1E3030 25%,#264040 50%,#1E3030 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.4s infinite', ...style }} />
);

function scoreColor(s) { return s >= 70 ? '#34d399' : s >= 40 ? '#00D4C8' : '#f87171'; }

export default function CVOptimiserPage() {
  const isMobile  = useIsMobile();
  const profile   = readProfile();
  const targetRole = profile.targetRole || 'your target role';

  const [activeTab, setActiveTab] = useState(0);

  // ── Builder state ────────────────────────────────────────────────────────────
  const [builder,  setBuilderState] = useState(readBuilder);
  const [improving, setImproving]   = useState(null);
  const [copyDone,  setCopyDone]    = useState(false);

  const updateBuilder = useCallback((patch) => {
    setBuilderState(prev => {
      const next = { ...prev, ...patch };
      saveBuilder(next);
      return next;
    });
  }, []);

  const addExpEntry = () => {
    const id = Date.now();
    updateBuilder({ experience: [...builder.experience, { id, role: '', company: '', period: '', bullets: '' }] });
  };
  const removeExpEntry = (id) => updateBuilder({ experience: builder.experience.filter(e => e.id !== id) });
  const updateExp = (id, field, value) => updateBuilder({ experience: builder.experience.map(e => e.id === id ? { ...e, [field]: value } : e) });

  const addEduEntry = () => {
    const id = Date.now();
    updateBuilder({ education: [...builder.education, { id, degree: '', school: '', year: '' }] });
  };
  const removeEduEntry = (id) => updateBuilder({ education: builder.education.filter(e => e.id !== id) });
  const updateEdu = (id, field, value) => updateBuilder({ education: builder.education.map(e => e.id === id ? { ...e, [field]: value } : e) });

  const handleImproveSummary = async () => {
    if (!builder.summary.trim()) return;
    setImproving('summary');
    try {
      const result = await improveSummary(builder.summary, targetRole, {});
      if (result?.improved) updateBuilder({ summary: result.improved });
    } catch { /* silently fail */ }
    setImproving(null);
  };

  const handleSuggestSkills = async () => {
    setImproving('skills');
    try {
      const current = builder.skills.split(',').map(s => s.trim()).filter(Boolean);
      const result  = await suggestSkills(targetRole, current, {});
      if (result?.skills?.length) {
        const existing = new Set(current.map(s => s.toLowerCase()));
        const newSkills = result.skills.filter(s => !existing.has(s.toLowerCase()));
        const merged = [...current, ...newSkills].join(', ');
        updateBuilder({ skills: merged });
      }
    } catch { /* silently fail */ }
    setImproving(null);
  };

  const handleImproveBullet = async (expId) => {
    const exp = builder.experience.find(e => e.id === expId);
    if (!exp?.bullets.trim()) return;
    setImproving(`bullet-${expId}`);
    try {
      const result = await improveBullet(exp.bullets, exp.role || targetRole, {});
      if (result?.improved) updateExp(expId, 'bullets', result.improved);
    } catch { /* silently fail */ }
    setImproving(null);
  };

  const buildPreviewText = () => {
    const lines = [];
    const p = profile;
    if (p.fullName)  lines.push(p.fullName.toUpperCase(), p.location || '', '');
    if (builder.summary)        { lines.push('PROFESSIONAL SUMMARY', '─'.repeat(40), builder.summary, ''); }
    if (builder.skills.trim())  { lines.push('SKILLS', '─'.repeat(40), builder.skills, ''); }
    if (builder.experience.some(e => e.role || e.company)) {
      lines.push('EXPERIENCE', '─'.repeat(40));
      builder.experience.forEach(e => {
        if (e.role || e.company) {
          lines.push(`${e.role} | ${e.company} | ${e.period}`);
          if (e.bullets) e.bullets.split('\n').forEach(b => b.trim() && lines.push(`  • ${b.trim()}`));
          lines.push('');
        }
      });
    }
    if (builder.education.some(e => e.degree || e.school)) {
      lines.push('EDUCATION', '─'.repeat(40));
      builder.education.forEach(e => {
        if (e.degree || e.school) lines.push(`${e.degree} — ${e.school} (${e.year})`);
      });
      lines.push('');
    }
    if (builder.projects.trim())        { lines.push('PROJECTS', '─'.repeat(40), builder.projects, ''); }
    if (builder.certifications.trim())  { lines.push('CERTIFICATIONS', '─'.repeat(40), builder.certifications, ''); }
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPreviewText()).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleDownload = () => {
    const text = buildPreviewText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${profile.fullName || 'cv'}_kestrel.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Analysis state ───────────────────────────────────────────────────────────
  const [cvText,          setCvText]          = useState('');
  const [analysing,       setAnalysing]       = useState(false);
  const [analysisResult,  setAnalysisResult]  = useState(null);
  const [analysisError,   setAnalysisError]   = useState('');
  const [fixingIdx,       setFixingIdx]       = useState(null);

  const handleAnalyse = async () => {
    if (!cvText.trim() || cvText.trim().length < 50) {
      setAnalysisError('Please paste at least 50 characters of your CV.');
      return;
    }
    setAnalysisError('');
    setAnalysing(true);
    setAnalysisResult(null);
    try {
      const result = await analyseCV(cvText, {});
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed. Try again.');
    }
    setAnalysing(false);
  };

  const handleFixThis = async (idx) => {
    const item = analysisResult?.improvements?.[idx];
    if (!item || fixingIdx !== null) return;
    setFixingIdx(idx);
    try {
      const result = await improveSummary(item.rewrite || item.issue, targetRole, {});
      if (result?.improved) {
        const updated = { ...analysisResult };
        updated.improvements = [...updated.improvements];
        updated.improvements[idx] = { ...item, rewrite: result.improved };
        setAnalysisResult(updated);
      }
    } catch { /* silently fail */ }
    setFixingIdx(null);
  };

  // ── JD Matcher state ─────────────────────────────────────────────────────────
  const [jdCvText,    setJdCvText]    = useState('');
  const [jdText,      setJdText]      = useState('');
  const [matching,    setMatching]    = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError,  setMatchError]  = useState('');

  const handleMatch = async () => {
    if (!jdCvText.trim() || !jdText.trim()) {
      setMatchError('Please paste both your CV and the job description.');
      return;
    }
    setMatchError('');
    setMatching(true);
    setMatchResult(null);
    try {
      const result = await matchJD(jdCvText, jdText, {});
      setMatchResult(result);
    } catch (err) {
      setMatchError(err.message || 'Match failed. Try again.');
    }
    setMatching(false);
  };

  const applyMatchSuggestion = (suggestion) => {
    if (suggestion.section === 'Summary' && suggestion.rewrite) {
      updateBuilder({ summary: suggestion.rewrite });
      setActiveTab(0);
    }
  };

  // ── Section input style ───────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: '#0A0F0F', border: '1px solid #1E3030',
    borderRadius: 8, padding: '9px 12px', color: '#E8F5F4', fontSize: 13,
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };
  const textareaStyle = { ...inputStyle, resize: 'vertical', lineHeight: 1.6 };

  const onFocus = e => (e.target.style.borderColor = '#00D4C8');
  const onBlur  = e => (e.target.style.borderColor = '#1E3030');

  // ── AI button ─────────────────────────────────────────────────────────────────
  const AIBtn = ({ onClick, loading, label = 'AI Improve', disabled }) => (
    <button onClick={onClick} disabled={loading || disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 5, background: loading ? 'rgba(0,212,200,0.08)' : 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 6, padding: '5px 10px', color: '#00D4C8', fontSize: 12, fontWeight: 600, cursor: loading || disabled ? 'not-allowed' : 'pointer', opacity: disabled && !loading ? 0.5 : 1 }}>
      {loading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={12} />}
      {loading ? 'Working…' : label}
    </button>
  );

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>CV Optimiser</h1>
        <p style={{ fontSize: 13, color: '#4A7A78', marginTop: 4 }}>Build, analyse, and match your CV to job descriptions.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#111A1A', border: '1px solid #1E3030', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)}
            style={{ fontSize: 13, fontWeight: activeTab === i ? 600 : 400, color: activeTab === i ? '#E8F5F4' : '#4A7A78', background: activeTab === i ? '#1E3030' : 'transparent', border: 'none', borderRadius: 7, padding: isMobile ? '6px 12px' : '6px 18px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab 0: CV Builder ───────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, maxWidth: 1100 }}>

          {/* Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Summary */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Professional Summary</p>
                <AIBtn onClick={handleImproveSummary} loading={improving === 'summary'} disabled={!builder.summary.trim()} />
              </div>
              <textarea value={builder.summary} onChange={e => updateBuilder({ summary: e.target.value })}
                onFocus={onFocus} onBlur={onBlur}
                placeholder={`2-3 sentences introducing your skills and value as a ${targetRole}…`}
                rows={4} style={textareaStyle} />
            </div>

            {/* Skills */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</p>
                <AIBtn onClick={handleSuggestSkills} loading={improving === 'skills'} label="Suggest Skills" />
              </div>
              <textarea value={builder.skills} onChange={e => updateBuilder({ skills: e.target.value })}
                onFocus={onFocus} onBlur={onBlur}
                placeholder="List skills separated by commas e.g. Python, SQL, Project Management…"
                rows={3} style={textareaStyle} />
            </div>

            {/* Experience */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience</p>
                <button onClick={addExpEntry} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 6, padding: '4px 9px', color: '#00D4C8', fontSize: 12, cursor: 'pointer' }}>
                  <Plus size={12} /> Add
                </button>
              </div>
              {builder.experience.map((exp, idx) => (
                <div key={exp.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: idx < builder.experience.length - 1 ? '1px solid #1E3030' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input value={exp.role} onChange={e => updateExp(exp.id, 'role', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Role / Title" style={inputStyle} />
                    <input value={exp.company} onChange={e => updateExp(exp.id, 'company', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Company" style={inputStyle} />
                  </div>
                  <input value={exp.period} onChange={e => updateExp(exp.id, 'period', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Period e.g. Jan 2023 – Present" style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <p style={{ fontSize: 11, color: '#4A7A78', margin: 0 }}>Bullet points (one per line)</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <AIBtn onClick={() => handleImproveBullet(exp.id)} loading={improving === `bullet-${exp.id}`} disabled={!exp.bullets.trim()} />
                      {builder.experience.length > 1 && (
                        <button onClick={() => removeExpEntry(exp.id)} style={{ background: 'none', border: 'none', color: '#4A7A78', cursor: 'pointer', display: 'flex', padding: 2 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea value={exp.bullets} onChange={e => updateExp(exp.id, 'bullets', e.target.value)} onFocus={onFocus} onBlur={onBlur}
                    placeholder="Led a team of 5…&#10;Increased revenue by 30%…" rows={3} style={textareaStyle} />
                </div>
              ))}
            </div>

            {/* Education */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Education</p>
                <button onClick={addEduEntry} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 6, padding: '4px 9px', color: '#00D4C8', fontSize: 12, cursor: 'pointer' }}>
                  <Plus size={12} /> Add
                </button>
              </div>
              {builder.education.map((edu, idx) => (
                <div key={edu.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input value={edu.degree} onChange={e => updateEdu(edu.id, 'degree', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Degree / Qualification" style={inputStyle} />
                  <input value={edu.school} onChange={e => updateEdu(edu.id, 'school', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="School / University" style={inputStyle} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={edu.year} onChange={e => updateEdu(edu.id, 'year', e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Year" style={{ ...inputStyle, width: 70 }} />
                    {builder.education.length > 1 && (
                      <button onClick={() => removeEduEntry(edu.id)} style={{ background: 'none', border: 'none', color: '#4A7A78', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Projects */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects (optional)</p>
              <textarea value={builder.projects} onChange={e => updateBuilder({ projects: e.target.value })}
                onFocus={onFocus} onBlur={onBlur}
                placeholder="Name | Description | Technologies used…" rows={3} style={textareaStyle} />
            </div>

            {/* Certifications */}
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#8ABAB8', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certifications (optional)</p>
              <textarea value={builder.certifications} onChange={e => updateBuilder({ certifications: e.target.value })}
                onFocus={onFocus} onBlur={onBlur}
                placeholder="e.g. Google Data Analytics Certificate (2024)…" rows={2} style={textareaStyle} />
            </div>
          </div>

          {/* Preview */}
          <div style={{ position: isMobile ? 'static' : 'sticky', top: 20, alignSelf: 'start' }}>
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>Live Preview</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(161,161,170,0.1)', border: '1px solid #264040', borderRadius: 6, padding: '5px 10px', color: copyDone ? '#34d399' : '#8ABAB8', fontSize: 12, cursor: 'pointer' }}>
                    {copyDone ? <CheckCircle size={12} /> : <Copy size={12} />} {copyDone ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 6, padding: '5px 10px', color: '#00D4C8', fontSize: 12, cursor: 'pointer' }}>
                    <Download size={12} /> Export
                  </button>
                </div>
              </div>
              <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#C5E8E6', background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 8, padding: '14px 16px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 520, overflowY: 'auto', lineHeight: 1.7, margin: 0 }}>
                {buildPreviewText() || 'Start filling in sections on the left to see your CV preview here…'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 1: Upload & Analyse ─────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 12px' }}>Paste your CV text</p>
            <textarea value={cvText} onChange={e => setCvText(e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              placeholder="Copy and paste the full text of your CV here. The AI will score it across Content, Format, Keywords, and Length — and give you specific rewrite suggestions."
              rows={10} style={{ ...textareaStyle, width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 11, color: '#264040' }}>{cvText.length} chars</span>
              <button onClick={handleAnalyse} disabled={analysing}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: analysing ? 'rgba(0,212,200,0.08)' : 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 8, padding: '9px 18px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: analysing ? 'not-allowed' : 'pointer' }}>
                {analysing ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                {analysing ? 'Analysing…' : 'Analyse CV'}
              </button>
            </div>
          </div>

          {analysisError && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: '#fca5a5' }}>{analysisError}</span>
            </div>
          )}

          {analysing && (
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
              <Skeleton height={24} width="60%" style={{ marginBottom: 20 }} />
              {[100, 80, 65, 85].map((w, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <Skeleton height={12} width={`${w}%`} style={{ marginBottom: 6 }} />
                  <Skeleton height={6} />
                </div>
              ))}
            </div>
          )}

          {analysisResult && !analysing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Score card */}
              <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                  <div style={{ width: 76, height: 76, borderRadius: '50%', border: `4px solid ${scoreColor(analysisResult.total_score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(analysisResult.total_score) }}>{analysisResult.total_score}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#E8F5F4', margin: '0 0 4px' }}>CV Score</p>
                    <p style={{ fontSize: 12, color: '#4A7A78', margin: 0 }}>
                      {analysisResult.total_score >= 70 ? 'Strong CV — a few tweaks and you\'re ready to send.' : analysisResult.total_score >= 40 ? 'Good foundation. Apply the suggestions below to boost your score.' : 'Needs work. Use the fixes below to significantly improve your CV.'}
                    </p>
                  </div>
                </div>
                <ScoreBar label="Content"  score={analysisResult.content_score}  color={scoreColor(analysisResult.content_score)} />
                <ScoreBar label="Format"   score={analysisResult.format_score}   color={scoreColor(analysisResult.format_score)} />
                <ScoreBar label="Keywords" score={analysisResult.keyword_score}  color={scoreColor(analysisResult.keyword_score)} />
                <ScoreBar label="Length"   score={analysisResult.length_score}   color={scoreColor(analysisResult.length_score)} />
              </div>

              {/* Improvements */}
              {analysisResult.improvements?.length > 0 && (
                <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 14px' }}>Suggested Fixes ({analysisResult.improvements.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {analysisResult.improvements.map((item, idx) => (
                      <div key={idx} style={{ background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#00D4C8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.section}</span>
                            <p style={{ fontSize: 12, color: '#8ABAB8', margin: '4px 0 6px', lineHeight: 1.5 }}>{item.issue}</p>
                            {item.rewrite && (
                              <p style={{ fontSize: 12, color: '#C5E8E6', margin: 0, lineHeight: 1.6, background: 'rgba(0,212,200,0.05)', border: '1px solid rgba(0,212,200,0.15)', borderRadius: 6, padding: '8px 10px' }}>
                                <span style={{ fontWeight: 600, color: '#00D4C8' }}>Suggested: </span>{item.rewrite}
                              </p>
                            )}
                          </div>
                          {item.section === 'Summary' && (
                            <button onClick={() => handleFixThis(idx)} disabled={fixingIdx !== null}
                              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 6, padding: '5px 10px', color: '#00D4C8', fontSize: 11, fontWeight: 600, cursor: fixingIdx !== null ? 'not-allowed' : 'pointer' }}>
                              {fixingIdx === idx ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={11} />}
                              Fix
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!analysisResult && !analysing && !analysisError && (
            <div style={{ background: '#111A1A', border: '1px dashed #264040', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
              <FileText size={28} color="#264040" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#4A7A78', margin: 0 }}>Paste your CV above and click <strong style={{ color: '#00D4C8' }}>Analyse CV</strong> to get a score and personalised fixes.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: JD Matcher ───────────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 12px' }}>Your CV</p>
            <textarea value={jdCvText} onChange={e => setJdCvText(e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              placeholder="Paste your full CV text here…"
              rows={6} style={{ ...textareaStyle, width: '100%', boxSizing: 'border-box', marginBottom: 16 }} />

            <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 12px' }}>Job Description</p>
            <textarea value={jdText} onChange={e => setJdText(e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              placeholder="Paste the full job description here…"
              rows={6} style={{ ...textareaStyle, width: '100%', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={handleMatch} disabled={matching}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: matching ? 'rgba(0,212,200,0.08)' : 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 8, padding: '9px 18px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: matching ? 'not-allowed' : 'pointer' }}>
                {matching ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                {matching ? 'Matching…' : 'Match CV to JD'}
              </button>
            </div>
          </div>

          {matchError && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: '#fca5a5' }}>{matchError}</span>
            </div>
          )}

          {matching && (
            <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
              <Skeleton height={80} width={80} style={{ borderRadius: '50%', margin: '0 auto 20px' }} />
              <Skeleton height={14} width="50%" style={{ margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[80, 60, 90, 70, 55, 85, 65].map((w, i) => <Skeleton key={i} height={26} width={w} style={{ borderRadius: 20 }} />)}
              </div>
            </div>
          )}

          {matchResult && !matching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Match score */}
              <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${scoreColor(matchResult.match_score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(matchResult.match_score) }}>{matchResult.match_score}%</span>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#E8F5F4', margin: '0 0 4px' }}>Match Score</p>
                  <p style={{ fontSize: 12, color: '#4A7A78', margin: 0 }}>{matchResult.match_score >= 70 ? 'Strong match — your CV aligns well with this role.' : matchResult.match_score >= 40 ? 'Moderate match — add the missing keywords to improve your chances.' : 'Low match — significant gaps. Tailor your CV specifically for this role.'}</p>
                </div>
              </div>

              {/* Keywords */}
              <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 14px' }}>Keywords</p>
                {matchResult.present_keywords?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#34d399', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present ({matchResult.present_keywords.length})</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {matchResult.present_keywords.map((kw, i) => (
                        <span key={i} style={{ fontSize: 12, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '3px 10px' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {matchResult.missing_keywords?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#f87171', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Missing ({matchResult.missing_keywords.length})</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {matchResult.missing_keywords.map((kw, i) => (
                        <span key={i} style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 20, padding: '3px 10px' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions */}
              {matchResult.suggestions?.length > 0 && (
                <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 14px' }}>How to improve your match</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {matchResult.suggestions.map((s, i) => (
                      <div key={i} style={{ background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#00D4C8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.section}</span>
                            <p style={{ fontSize: 12, color: '#C5E8E6', margin: '6px 0 0', lineHeight: 1.6 }}>{s.rewrite}</p>
                          </div>
                          {s.section === 'Summary' && (
                            <button onClick={() => applyMatchSuggestion(s)}
                              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 6, padding: '5px 10px', color: '#00D4C8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                              <CheckCircle size={11} /> Apply
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!matchResult && !matching && !matchError && (
            <div style={{ background: '#111A1A', border: '1px dashed #264040', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
              <FileText size={28} color="#264040" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: '#4A7A78', margin: 0 }}>Paste your CV and the job description, then click <strong style={{ color: '#00D4C8' }}>Match CV to JD</strong> to see how well you fit the role.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
