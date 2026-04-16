import { useState, useRef } from 'react';
import { Upload, Download, Loader, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { researchLead, profileLead, writeEmail } from '../services/api';
import { runTrackerAgent } from '../services/tracker';
import ScoreRing from '../components/UI/ScoreRing';
import StatusBadge from '../components/UI/StatusBadge';

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  const compIdx = headers.findIndex(h => h.includes('company') || h.includes('name'));
  const urlIdx  = headers.findIndex(h => h.includes('url') || h.includes('website') || h.includes('domain'));
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    return {
      company: cols[compIdx] || cols[0] || '',
      url:     cols[urlIdx]  || cols[1] || '',
    };
  }).filter(r => r.company || r.url);
}

function exportCSV(results) {
  const rows = [
    ['Company', 'Score', 'Industry', 'Size', 'Tech Stack', 'Status', 'Email Subject', 'Contact'],
    ...results.filter(r => r.lead).map(r => [
      r.lead.company, r.lead.score, r.lead.industry, r.lead.size,
      (r.lead.techStack || []).join('; '),
      r.lead.status,
      r.lead.emails?.[0]?.subject || '',
      `${r.lead.contactName} - ${r.lead.contactTitle}`,
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'kestrel-leads.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage({ onLeadSaved }) {
  const [rows,      setRows]      = useState([]);
  const [results,   setResults]   = useState([]);
  const [running,   setRunning]   = useState(false);
  const [progress,  setProgress]  = useState({});   // { rowIdx: { status, statusText } }
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
      setResults([]);
      setProgress({});
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
      setResults([]);
      setProgress({});
    };
    reader.readAsText(file);
  };

  const runBatch = async () => {
    if (!rows.length || running) return;
    setRunning(true);
    setResults([]);
    const newProgress = {};
    rows.forEach((_, i) => { newProgress[i] = { status: 'pending', statusText: 'Queued' }; });
    setProgress({ ...newProgress });

    // Process concurrently in chunks of 3
    const CHUNK = 3;
    const allResults = new Array(rows.length);

    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      await Promise.all(chunk.map(async (row, ci) => {
        const idx = start + ci;
        const input = row.url || row.company;

        const setP = (status, statusText) =>
          setProgress(prev => ({ ...prev, [idx]: { status, statusText } }));

        try {
          setP('running', 'Researching...');
          const research = await researchLead(input, (event, data) => {
            if (event === 'status') setP('running', data.text);
          });

          setP('running', 'Profiling...');
          const profile = await profileLead(research, (event, data) => {
            if (event === 'status') setP('running', data.text);
          });

          setP('running', 'Writing email...');
          const email = await writeEmail(profile, 'Consultative', 'A', () => {});

          const lead = runTrackerAgent(research, profile, email);
          onLeadSaved?.(lead);
          allResults[idx] = { lead, error: null };
          setP('done', 'Complete');
        } catch (err) {
          allResults[idx] = { lead: null, error: err.message };
          setP('error', err.message);
        }
      }));
    }

    setResults(allResults);
    setRunning(false);
  };

  const doneCount  = Object.values(progress).filter(p => p.status === 'done').length;
  const errorCount = Object.values(progress).filter(p => p.status === 'error').length;
  const totalDone  = doneCount + errorCount;

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fafafa', margin: 0 }}>Batch Mode</h1>
        <p style={{ fontSize: 13, color: '#52525b', marginTop: 4 }}>Process multiple leads simultaneously</p>
      </div>

      {/* Upload zone */}
      {rows.length === 0 ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed #3f3f46', borderRadius: 14, padding: '64px 32px',
            textAlign: 'center', cursor: 'pointer', marginBottom: 24,
            background: 'rgba(245,158,11,0.02)', transition: 'all 0.15s',
          }}
        >
          <div style={{ width: 52, height: 52, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={22} color="#f59e0b" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', margin: '0 0 6px' }}>Drop your CSV here</p>
          <p style={{ fontSize: 13, color: '#52525b', margin: 0 }}>or click to browse. Columns: <code style={{ background: '#27272a', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>company, url</code></p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      ) : (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '10px 14px', display: 'flex', align: 'center', gap: 10 }}>
              <FileText size={14} color="#f59e0b" />
              <span style={{ fontSize: 13, color: '#f4f4f5' }}>{rows.length} leads loaded</span>
            </div>
            {running && (
              <div style={{ display: 'flex', align: 'center', gap: 8, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ fontSize: 13, color: '#71717a' }}>{totalDone}/{rows.length} processed</span>
              </div>
            )}
            <button onClick={() => { setRows([]); setResults([]); setProgress({}); }} disabled={running}
              style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: '#71717a', cursor: running ? 'not-allowed' : 'pointer' }}>
              Clear
            </button>
            {results.filter(r => r?.lead).length > 0 && (
              <button onClick={() => exportCSV(results)} style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={13} /> Export CSV
              </button>
            )}
            <button onClick={runBatch} disabled={running}
              style={{ background: running ? '#27272a' : '#f59e0b', color: running ? '#52525b' : '#09090b', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {running ? <><Loader size={13} className="animate-spin-icon" /> Running...</> : 'Run Pipeline'}
            </button>
          </div>

          {/* Progress bars */}
          {running && (
            <div style={{ marginBottom: 20, background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#71717a' }}>Pipeline Progress</span>
                <span style={{ fontSize: 12, color: '#f59e0b' }}>{totalDone}/{rows.length}</span>
              </div>
              <div style={{ height: 4, background: '#27272a', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${(totalDone / rows.length) * 100}%`, background: '#f59e0b', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  {['#', 'Company', 'Score', 'Industry', 'Tech Stack', 'Email', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#52525b', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const p    = progress[i];
                  const res  = results[i];
                  const lead = res?.lead;
                  return (
                    <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid #1c1c1e' : 'none' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#52525b' }}>{i + 1}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#f4f4f5', margin: 0 }}>{lead?.company || row.company || row.url}</p>
                          {(row.url && !lead) && <p style={{ fontSize: 10, color: '#52525b', margin: 0 }}>{row.url}</p>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {lead ? <ScoreRing score={lead.score} size={36} /> : <span style={{ fontSize: 12, color: '#3f3f46' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#71717a' }}>{lead?.industry || '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {lead?.techStack?.slice(0, 3).map(t => (
                            <span key={t} style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 4, padding: '1px 5px' }}>{t}</span>
                          )) || <span style={{ fontSize: 12, color: '#3f3f46' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#71717a', maxWidth: 200 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {lead?.emails?.[0]?.subject || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {!p && <span style={{ fontSize: 11, color: '#3f3f46' }}>Pending</span>}
                        {p?.status === 'running' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Loader size={11} color="#60a5fa" className="animate-spin-icon" />
                            <span style={{ fontSize: 11, color: '#60a5fa' }}>{p.statusText}</span>
                          </div>
                        )}
                        {p?.status === 'done'  && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} color="#34d399" /><span style={{ fontSize: 11, color: '#34d399' }}>Done</span></div>}
                        {p?.status === 'error' && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><XCircle    size={13} color="#ef4444" /><span style={{ fontSize: 11, color: '#ef4444', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Error</span></div>}
                        {p?.status === 'pending' && <span style={{ fontSize: 11, color: '#52525b' }}>Queued</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
