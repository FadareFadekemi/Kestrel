import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader, Zap } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { detectScam } from '../../services/jsApi';

const RED_FLAGS = [
  { flag: 'Upfront payment required', detail: 'Any job that asks you to pay for training, equipment, or a "starter kit" is a scam.' },
  { flag: 'No company name or vague company details', detail: 'Legitimate jobs always identify the hiring company. "A reputable company" is a red flag.' },
  { flag: 'Salary far above market rate', detail: 'If it sounds too good to be true for the role, it likely is.' },
  { flag: 'Grammar mistakes and unprofessional communication', detail: 'Real recruiters use professional email addresses and write clearly.' },
  { flag: 'Asked for personal financial info early', detail: 'Bank details, BVN, or NIN should never be requested before a formal offer letter.' },
  { flag: 'WhatsApp-only recruitment process', detail: 'Legitimate companies use official email and have verifiable online presence.' },
  { flag: '"You are selected" without applying', detail: 'Unsolicited job offers are almost always scams.' },
  { flag: 'No formal interview process', detail: 'Real companies conduct structured interviews. Immediate offers after a WhatsApp chat are suspicious.' },
];

const GREEN_FLAGS = [
  'Official company email domain (not Gmail/Yahoo for HR)',
  'Company has a verified LinkedIn page and website',
  'Offer letter on company letterhead with a physical address',
  'You applied through a known job board or the company website',
  'Salary and benefits clearly stated in writing',
  'Background check requested (not upfront payment)',
];

const RISK_CONFIG = {
  Safe:           { color: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.2)',   label: 'Safe',          icon: (s) => <CheckCircle size={18} color={s} /> },
  Suspicious:     { color: '#00D4C8', bg: 'rgba(0,212,200,0.08)',   border: 'rgba(0,212,200,0.2)',   label: 'Suspicious',    icon: (s) => <AlertTriangle size={18} color={s} /> },
  'Likely Scam':  { color: '#f87171', bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.2)',  label: 'Likely Scam',   icon: (s) => <XCircle size={18} color={s} /> },
};

const STATIC_RISK = {
  low:    { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  label: 'Low Risk',    icon: <CheckCircle size={18} color="#34d399" />,   text: 'No obvious red flags detected. Still verify the company independently before sharing personal information.' },
  medium: { color: '#00D4C8', bg: 'rgba(0,212,200,0.08)', border: 'rgba(0,212,200,0.2)',  label: 'Medium Risk', icon: <AlertTriangle size={18} color="#00D4C8" />, text: 'Some warning signs detected. Proceed with caution and verify the employer before continuing.' },
  high:   { color: '#f87171', bg: 'rgba(248,113,113,0.08)',border: 'rgba(248,113,113,0.2)', label: 'High Risk',   icon: <XCircle size={18} color="#f87171" />,        text: 'Multiple red flags found. This listing has characteristics common to job scams. Do not pay any money or share financial details.' },
};

export default function ScamDetectorPage() {
  const isMobile = useIsMobile();
  const [jobText,   setJobText]   = useState('');
  const [expanded,  setExpanded]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [aiResult,  setAiResult]  = useState(null);
  const [aiError,   setAiError]   = useState('');

  const handleDetect = async () => {
    if (!jobText.trim() || jobText.trim().length < 20) return;
    setLoading(true); setAiError(''); setAiResult(null);
    try {
      const result = await detectScam(jobText.trim());
      setAiResult(result);
    } catch (err) {
      setAiError(err.message || 'AI detection failed. Check the flags below manually.');
    }
    setLoading(false);
  };

  // Keyword-based fallback risk for when AI hasn't run yet
  const flagCount = RED_FLAGS.filter(({ flag }) =>
    jobText.toLowerCase().includes(flag.toLowerCase().split(' ').slice(0, 3).join(' '))
  ).length;
  const staticRisk = jobText.trim().length < 20 ? null
    : flagCount === 0 ? 'low'
    : flagCount <= 2  ? 'medium'
    : 'high';

  const aiCfg = aiResult ? RISK_CONFIG[aiResult.risk_level] : null;

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Scam Detector</h1>
        <p style={{ fontSize: 13, color: '#4A7A78', marginTop: 4 }}>
          Paste a job listing or recruiter message — AI will analyse it for scam signals.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, maxWidth: 900 }}>

        {/* Checker */}
        <div>
          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Shield size={16} color="#00D4C8" />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>Paste job listing or message</p>
            </div>
            <textarea value={jobText} onChange={e => { setJobText(e.target.value); setAiResult(null); setAiError(''); }}
              placeholder="Paste the full job description, WhatsApp message, or recruiter email here..."
              rows={8}
              style={{ width: '100%', background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 8, padding: '10px 12px', color: '#E8F5F4', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.15s', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderColor = '#00D4C8')}
              onBlur={e  => (e.target.style.borderColor = '#1E3030')} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 11, color: '#264040' }}>{jobText.length} characters</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {jobText && <button onClick={() => { setJobText(''); setAiResult(null); setAiError(''); }} style={{ fontSize: 11, color: '#4A7A78', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>}
                <button onClick={handleDetect} disabled={loading || jobText.trim().length < 20}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,212,200,0.12)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 7, padding: '6px 12px', color: '#00D4C8', fontSize: 12, fontWeight: 600, cursor: (loading || jobText.trim().length < 20) ? 'not-allowed' : 'pointer', opacity: jobText.trim().length < 20 ? 0.5 : 1 }}>
                  {loading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
                  {loading ? 'Analysing…' : 'AI Analyse'}
                </button>
              </div>
            </div>
          </div>

          {/* AI error */}
          {aiError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#fca5a5' }}>
              {aiError} Showing keyword-based assessment below.
            </div>
          )}

          {/* AI result */}
          {aiResult && aiCfg && (
            <div style={{ background: aiCfg.bg, border: `1px solid ${aiCfg.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {aiCfg.icon(aiCfg.color)}
                <span style={{ fontSize: 14, fontWeight: 700, color: aiCfg.color }}>{aiCfg.label}</span>
                <span style={{ fontSize: 11, color: aiCfg.color, opacity: 0.6, marginLeft: 'auto' }}>AI analysis</span>
              </div>
              {aiResult.explanation && <p style={{ fontSize: 12, color: aiCfg.color, margin: '0 0 10px', opacity: 0.85, lineHeight: 1.6 }}>{aiResult.explanation}</p>}
              {aiResult.scam_signals?.length > 0 && (
                <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                  {aiResult.scam_signals.map((s, i) => <li key={i} style={{ fontSize: 12, color: aiCfg.color, opacity: 0.75, marginBottom: 4, lineHeight: 1.5 }}>{s}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Keyword-based fallback result */}
          {!aiResult && staticRisk && (() => {
            const cfg = STATIC_RISK[staticRisk];
            return (
              <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {cfg.icon}
                  <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: cfg.color, opacity: 0.6, marginLeft: 'auto' }}>keyword check</span>
                </div>
                <p style={{ fontSize: 12, color: cfg.color, margin: 0, lineHeight: 1.6, opacity: 0.85 }}>{cfg.text}</p>
                {!aiResult && <p style={{ fontSize: 11, color: '#4A7A78', margin: '8px 0 0' }}>Click <strong style={{ color: '#00D4C8' }}>AI Analyse</strong> for a deeper assessment.</p>}
              </div>
            );
          })()}
        </div>

        {/* Reference panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <XCircle size={15} color="#f87171" />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>Red flags to watch</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {RED_FLAGS.map(({ flag, detail }, i) => (
                <div key={i}>
                  <button onClick={() => setExpanded(expanded === i ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #1c1c1e' }}>
                    <span style={{ fontSize: 12, color: '#fca5a5', textAlign: 'left' }}>{flag}</span>
                    {expanded === i ? <ChevronUp size={13} color="#4A7A78" /> : <ChevronDown size={13} color="#4A7A78" />}
                  </button>
                  {expanded === i && <p style={{ fontSize: 12, color: '#4A7A78', margin: '6px 0 4px', lineHeight: 1.5 }}>{detail}</p>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckCircle size={15} color="#34d399" />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>Signs of a legitimate job</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {GREEN_FLAGS.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 12, color: '#8ABAB8', lineHeight: 1.5 }}>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
