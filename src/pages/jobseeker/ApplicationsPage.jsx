import { useState, useCallback, useRef } from 'react';
import { Plus, X, BarChart2, TrendingUp, Clock, Zap, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { jsFollowup } from '../../services/jsApi';

const APPS_KEY = 'kestrel_js_applications';

const COLUMNS = [
  { id: 'Draft',       label: 'Draft',       color: '#4A7A78', bg: 'rgba(113,113,122,0.08)' },
  { id: 'Applied',     label: 'Applied',     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)'  },
  { id: 'Followed Up', label: 'Followed Up', color: '#00D4C8', bg: 'rgba(0,212,200,0.08)'  },
  { id: 'Interview',   label: 'Interview',   color: '#00D4C8', bg: 'rgba(0,212,200,0.08)' },
  { id: 'Offer',       label: 'Offer',       color: '#34d399', bg: 'rgba(52,211,153,0.08)'  },
  { id: 'Rejected',    label: 'Rejected',    color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
];
const COL_MAP = Object.fromEntries(COLUMNS.map(c => [c.id, c]));

function readApps() {
  try { const v = localStorage.getItem(APPS_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
}
function saveApps(apps) {
  try { localStorage.setItem(APPS_KEY, JSON.stringify(apps)); } catch { /* private mode */ }
}
function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}
function analytics(apps) {
  const sent    = apps.filter(a => ['Applied','Followed Up','Interview','Offer','Rejected'].includes(a.status));
  const replied = apps.filter(a => ['Interview','Offer'].includes(a.status));
  const rate    = sent.length ? Math.round((replied.length / sent.length) * 100) : 0;
  const sectorMap = {};
  sent.forEach(a => {
    if (!a.sector) return;
    if (!sectorMap[a.sector]) sectorMap[a.sector] = { sent: 0, replied: 0 };
    sectorMap[a.sector].sent++;
    if (['Interview','Offer'].includes(a.status)) sectorMap[a.sector].replied++;
  });
  const topSectors = Object.entries(sectorMap)
    .map(([s, d]) => ({ sector: s, rate: d.sent ? Math.round((d.replied / d.sent) * 100) : 0, sent: d.sent }))
    .sort((a, b) => b.rate - a.rate).slice(0, 4);
  return { sent: sent.length, replied: replied.length, rate, topSectors };
}

function AddCardModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ company: '', role: '', sector: '', status: 'Draft', appliedDate: new Date().toISOString().slice(0, 10), emailSubject: '' });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const inputStyle = { width: '100%', background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 8, padding: '8px 12px', color: '#E8F5F4', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' };
  const onF = e => (e.target.style.borderColor = '#00D4C8');
  const onB = e => (e.target.style.borderColor = '#1E3030');
  const handleSubmit = () => {
    if (!form.company.trim() || !form.role.trim()) return;
    onAdd({ ...form, id: Date.now(), createdAt: new Date().toISOString() });
    onClose();
  };
  const valid = form.company.trim() && form.role.trim();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Add Application</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A7A78', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={form.company} onChange={e => set('company', e.target.value)} onFocus={onF} onBlur={onB} placeholder="Company name *" style={inputStyle} />
          <input value={form.role}    onChange={e => set('role', e.target.value)}    onFocus={onF} onBlur={onB} placeholder="Role / Position *" style={inputStyle} />
          <input value={form.sector}  onChange={e => set('sector', e.target.value)}  onFocus={onF} onBlur={onB} placeholder="Sector (e.g. Fintech, FMCG)" style={inputStyle} />
          <input value={form.emailSubject} onChange={e => set('emailSubject', e.target.value)} onFocus={onF} onBlur={onB} placeholder="Email subject line (if sent)" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input type="date" value={form.appliedDate} onChange={e => set('appliedDate', e.target.value)} onFocus={onF} onBlur={onB} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid #1E3030', borderRadius: 8, padding: '9px', color: '#4A7A78', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!valid}
            style={{ flex: 1, background: 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 8, padding: '9px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.5 }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function FollowupModal({ app, onClose }) {
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');
  const [copyDone, setCopyDone] = useState(false);
  const generate = async () => {
    setLoading(true); setError('');
    try {
      const r = await jsFollowup(app.company, app.role, daysSince(app.appliedDate), app.emailSubject || `${app.role} opportunity`);
      setResult(r);
    } catch (err) { setError(err.message || 'Failed.'); }
    setLoading(false);
  };
  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`).then(() => {
      setCopyDone(true); setTimeout(() => setCopyDone(false), 2000);
    });
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 14, padding: 24, width: '100%', maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>AI Follow-up Email</p>
            <p style={{ fontSize: 11, color: '#4A7A78', margin: '3px 0 0' }}>{app.company} · {daysSince(app.appliedDate)}d since application</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4A7A78', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 13, color: '#4A7A78', margin: '0 0 16px', lineHeight: 1.6 }}>
              No reply from <strong style={{ color: '#C5E8E6' }}>{app.company}</strong> after {daysSince(app.appliedDate)} days. techcori will write a brief follow-up that adds a new angle — not just "following up".
            </p>
            <button onClick={generate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 9, padding: '10px 20px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Zap size={14} /> Generate Follow-up
            </button>
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '30px 0', color: '#4A7A78', fontSize: 13 }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Writing…
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px' }}>
            <AlertCircle size={13} color="#ef4444" /><span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
          </div>
        )}
        {result && (
          <div>
            <div style={{ background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 14px' }}>{result.subject}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Body</p>
              <p style={{ fontSize: 13, color: '#C5E8E6', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.body}</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generate} style={{ flex: 1, background: 'none', border: '1px solid #264040', borderRadius: 8, padding: '9px', color: '#4A7A78', fontSize: 12, cursor: 'pointer' }}>Regenerate</button>
              <button onClick={handleCopy}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: copyDone ? 'rgba(52,211,153,0.12)' : 'rgba(0,212,200,0.12)', border: `1px solid ${copyDone ? 'rgba(52,211,153,0.3)' : 'rgba(0,212,200,0.3)'}`, borderRadius: 8, padding: '9px', color: copyDone ? '#34d399' : '#00D4C8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {copyDone ? <CheckCircle size={13} /> : null}{copyDone ? 'Copied!' : 'Copy Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ app, onDragStart, onStatusChange, onDelete, onFollowup }) {
  const col  = COL_MAP[app.status] || COL_MAP['Draft'];
  const days = daysSince(app.appliedDate);
  const needsFollowup = app.status === 'Applied' && days >= 7;
  return (
    <div draggable onDragStart={() => onDragStart(app.id)}
      style={{ background: '#0A0F0F', border: '1px solid #1E3030', borderRadius: 9, padding: '12px 14px', cursor: 'grab', marginBottom: 8 }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#264040')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E3030')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.company}</p>
          <p style={{ fontSize: 11, color: '#4A7A78', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.role}</p>
        </div>
        <button onClick={() => onDelete(app.id)} style={{ background: 'none', border: 'none', color: '#264040', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: 2 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#264040')}>
          <X size={12} />
        </button>
      </div>
      {app.sector && <span style={{ fontSize: 10, color: '#4A7A78', background: '#111A1A', border: '1px solid #1E3030', borderRadius: 4, padding: '1px 6px' }}>{app.sector}</span>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: '#4A7A78' }}>{app.appliedDate ? `${days}d ago` : '—'}</span>
        <select value={app.status} onChange={e => onStatusChange(app.id, e.target.value)} onClick={e => e.stopPropagation()}
          style={{ fontSize: 10, fontWeight: 600, color: col.color, background: col.bg, border: `1px solid ${col.color}30`, borderRadius: 6, padding: '2px 5px', cursor: 'pointer', outline: 'none' }}>
          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {needsFollowup && (
        <button onClick={() => onFollowup(app)}
          style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(0,212,200,0.1)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 6, padding: '5px', color: '#00D4C8', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          <Zap size={11} /> Follow Up ({days}d)
        </button>
      )}
    </div>
  );
}

export default function ApplicationsPage({ setActivePage }) {
  const isMobile = useIsMobile();
  const [apps, setAppsState]   = useState(readApps);
  const [showAdd, setShowAdd]  = useState(false);
  const [followupApp, setFollowupApp] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const dragId = useRef(null);

  const setApps = updater => {
    setAppsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveApps(next);
      return next;
    });
  };

  const handleAdd           = useCallback(app  => setApps(prev => [app, ...prev]), []);
  const handleDelete        = useCallback(id   => setApps(prev => prev.filter(a => a.id !== id)), []);
  const handleStatusChange  = useCallback((id, status) => setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a)), []);
  const onDragStart         = id => { dragId.current = id; };
  const onDragOver          = e  => { e.preventDefault(); };
  const onDrop              = colId => { if (dragId.current != null) { handleStatusChange(dragId.current, colId); dragId.current = null; } };

  const stats     = analytics(apps);
  const followups = apps.filter(a => a.status === 'Applied' && daysSince(a.appliedDate) >= 7);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ padding: isMobile ? '16px 16px 0' : '24px 28px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Applications</h1>
            <p style={{ fontSize: 13, color: '#4A7A78', marginTop: 4 }}>{apps.length} total · {stats.sent} sent · {stats.rate}% response rate</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAnalytics(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: showAnalytics ? 'rgba(96,165,250,0.1)' : '#111A1A', border: `1px solid ${showAnalytics ? 'rgba(96,165,250,0.25)' : '#1E3030'}`, borderRadius: 8, padding: '8px 12px', color: showAnalytics ? '#60a5fa' : '#4A7A78', fontSize: 12, cursor: 'pointer' }}>
              <BarChart2 size={13} /> Analytics
            </button>
            <button onClick={() => setShowAdd(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 8, padding: '8px 14px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {followups.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(0,212,200,0.06)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 9, padding: '12px 14px', marginBottom: 16 }}>
            <Zap size={14} color="#00D4C8" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: '#00B8AD', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#00D4C8' }}>{followups.length} application{followups.length > 1 ? 's' : ''} ready for follow-up</strong> — {followups.map(a => a.company).join(', ')}. Click the <strong>Follow Up</strong> button on the card.
            </p>
          </div>
        )}

        {showAnalytics && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
              {[
                { icon: <TrendingUp size={13} color="#00D4C8" />, label: 'Response Rate', value: `${stats.rate}%`,  color: '#00D4C8' },
                { icon: <Zap size={13} color="#00D4C8" />,        label: 'Sent',          value: stats.sent,         color: '#00D4C8' },
                { icon: <CheckCircle size={13} color="#34d399" />, label: 'Interviews',   value: stats.replied,      color: '#34d399' },
                { icon: <Clock size={13} color="#60a5fa" />,       label: 'In Progress',  value: apps.filter(a => ['Applied','Followed Up','Interview'].includes(a.status)).length, color: '#60a5fa' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 9, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>{icon}<span style={{ fontSize: 11, color: '#4A7A78' }}>{label}</span></div>
                  <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
            {stats.topSectors.length > 0 && (
              <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 9, padding: '12px 16px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Response by sector</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {stats.topSectors.map(({ sector, rate, sent }) => (
                    <span key={sector} style={{ fontSize: 12, color: '#8ABAB8' }}>
                      {sector} <strong style={{ color: rate >= 50 ? '#34d399' : rate >= 25 ? '#00D4C8' : '#f87171' }}>{rate}%</strong> <span style={{ color: '#264040' }}>({sent})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: isMobile ? '0 16px 20px' : '4px 28px 24px' }}>
        <div style={{ display: 'flex', gap: 12, height: '100%', minWidth: COLUMNS.length * 220, paddingBottom: 4 }}>
          {COLUMNS.map(col => {
            const colApps = apps.filter(a => a.status === col.id);
            return (
              <div key={col.id} onDragOver={onDragOver} onDrop={() => onDrop(col.id)}
                style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', background: '#111113', border: '1px solid #1E3030', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #1E3030', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: col.bg }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col.color, background: `${col.color}20`, borderRadius: 20, padding: '1px 7px' }}>{colApps.length}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 4px' }}>
                  {colApps.map(app => (
                    <KanbanCard key={app.id} app={app}
                      onDragStart={onDragStart}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onFollowup={setFollowupApp} />
                  ))}
                  {colApps.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 8px', color: '#264040', fontSize: 12 }}>Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd     && <AddCardModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
      {followupApp && <FollowupModal app={followupApp} onClose={() => setFollowupApp(null)} />}
    </div>
  );
}
