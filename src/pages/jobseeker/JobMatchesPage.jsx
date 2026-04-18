import { useState, useCallback } from 'react';
import { Briefcase, Building2, MapPin, Zap, Loader, AlertCircle, CheckCircle, Globe, ToggleLeft, ToggleRight, RefreshCw, Shield } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { fetchJobMatches } from '../../services/jsApi';

const JS_PROFILE_KEY = 'kestrel_jobseeker_profile';

function readProfile() {
  try { const v = localStorage.getItem(JS_PROFILE_KEY); return v ? JSON.parse(v) : {}; } catch { return {}; }
}

const SIZE_LABELS = { Startup: 'Startup', SME: 'SME', Enterprise: 'Enterprise', MNC: 'MNC' };
const ALL_SIZES   = ['All', 'Startup', 'SME', 'Enterprise', 'MNC'];

const Skeleton = ({ height = 16, width = '100%', style = {} }) => (
  <div style={{ height, width, background: 'linear-gradient(90deg,#1E3030 25%,#264040 50%,#1E3030 75%)', backgroundSize: '200% 100%', borderRadius: 4, animation: 'shimmer 1.4s infinite', ...style }} />
);

function ScoreRing({ score }) {
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#00D4C8' : '#f87171';
  const r = 16, c = 20, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={40} height={40} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#1E3030" strokeWidth={4} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c + 4} textAnchor="middle" fill={color} fontSize={10} fontWeight={700}>{score}</text>
    </svg>
  );
}

function CompanyCard({ company, onResearch }) {
  const sizeColors = { Startup: '#60a5fa', SME: '#34d399', Enterprise: '#00D4C8', MNC: '#00D4C8' };
  const color = sizeColors[company.size] || '#4A7A78';
  return (
    <div style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>{company.name}</p>
            {company.verified && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '2px 7px' }}>
                <CheckCircle size={9} /> Verified
              </span>
            )}
            {company.remote && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '2px 7px' }}>Remote</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#4A7A78', display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={11} /> {company.sector}</span>
            <span style={{ fontSize: 11, color: '#4A7A78', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {company.location}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 8, padding: '1px 6px' }}>{SIZE_LABELS[company.size] || company.size}</span>
          </div>
        </div>
        <ScoreRing score={company.roleFit} />
      </div>

      <p style={{ fontSize: 12, color: '#8ABAB8', margin: 0, lineHeight: 1.6 }}>{company.description}</p>

      {company.hiringSignal && (
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', background: 'rgba(0,212,200,0.05)', border: '1px solid rgba(0,212,200,0.15)', borderRadius: 7, padding: '8px 10px' }}>
          <Zap size={11} color="#00D4C8" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 11, color: '#00B8AD', lineHeight: 1.5 }}>{company.hiringSignal}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button onClick={() => onResearch(company.name)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(0,212,200,0.12)', border: '1px solid rgba(0,212,200,0.25)', borderRadius: 8, padding: '8px 14px', color: '#00D4C8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Briefcase size={12} /> Research Company
        </button>
        {company.website && (
          <button onClick={() => window.open(`https://${company.website}`, '_blank', 'noopener')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'rgba(161,161,170,0.08)', border: '1px solid #264040', borderRadius: 8, padding: '8px 12px', color: '#4A7A78', fontSize: 12, cursor: 'pointer' }}>
            <Globe size={12} /> Website
          </button>
        )}
      </div>
    </div>
  );
}

export default function JobMatchesPage({ setActivePage }) {
  const isMobile = useIsMobile();
  const profile  = readProfile();

  const [loading,     setLoading]     = useState(false);
  const [companies,   setCompanies]   = useState([]);
  const [error,       setError]       = useState('');
  const [statusText,  setStatusText]  = useState('');

  // Filters
  const [filterSize,   setFilterSize]   = useState('All');
  const [filterSector, setFilterSector] = useState('All');
  const [remoteOnly,   setRemoteOnly]   = useState(false);

  const handleFetchMatches = useCallback(async () => {
    if (!profile.targetRole) return;
    setLoading(true);
    setError('');
    setCompanies([]);
    setStatusText('');
    try {
      const result = await fetchJobMatches(profile, {
        onStatus: (t) => setStatusText(t),
      });
      if (result?.companies) setCompanies(result.companies);
      else setError('No matches returned. Try again.');
    } catch (err) {
      setError(err.message || 'Failed to fetch matches. Try again.');
    }
    setLoading(false);
    setStatusText('');
  }, [profile]);

  const handleResearch = (companyName) => {
    setActivePage?.('Agent');
  };

  // Derived sector list
  const sectors = ['All', ...Array.from(new Set(companies.map(c => c.sector).filter(Boolean)))];

  const filtered = companies.filter(c => {
    if (filterSize !== 'All'   && c.size   !== filterSize)   return false;
    if (filterSector !== 'All' && c.sector !== filterSector) return false;
    if (remoteOnly && !c.remote)                              return false;
    return true;
  });

  const hasProfile = Boolean(profile.targetRole);

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Job Matches</h1>
          <p style={{ fontSize: 13, color: '#4A7A78', marginTop: 4 }}>
            {hasProfile ? `AI-curated companies hiring ${profile.targetRole} in ${profile.location || 'Nigeria'}` : 'Complete your profile to get AI-curated company matches'}
          </p>
        </div>
        {hasProfile && (
          <button onClick={handleFetchMatches} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: loading ? 'rgba(0,212,200,0.06)' : 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 9, padding: '10px 18px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            {loading ? (statusText || 'Searching…') : companies.length ? 'Refresh Matches' : 'Find Matches'}
          </button>
        )}
      </div>

      {/* No profile warning */}
      {!hasProfile && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(0,212,200,0.05)', border: '1px solid rgba(0,212,200,0.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <AlertCircle size={15} color="#00D4C8" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#00B8AD', margin: 0 }}>
            Set up your profile first so techcori knows which roles and sectors to search. Go to <strong>Settings</strong> or complete the onboarding.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16, maxWidth: 900, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
                  <Skeleton height={12} width="40%" />
                </div>
                <Skeleton height={40} width={40} style={{ borderRadius: '50%' }} />
              </div>
              <Skeleton height={12} style={{ marginBottom: 6 }} />
              <Skeleton height={12} width="80%" style={{ marginBottom: 14 }} />
              <Skeleton height={34} style={{ borderRadius: 8 }} />
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      {!loading && companies.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <select value={filterSize} onChange={e => setFilterSize(e.target.value)}
            style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 7, padding: '6px 10px', color: '#C5E8E6', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            {ALL_SIZES.map(s => <option key={s} value={s}>{s === 'All' ? 'All sizes' : s}</option>)}
          </select>

          {sectors.length > 1 && (
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
              style={{ background: '#111A1A', border: '1px solid #1E3030', borderRadius: 7, padding: '6px 10px', color: '#C5E8E6', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
              {sectors.map(s => <option key={s} value={s}>{s === 'All' ? 'All sectors' : s}</option>)}
            </select>
          )}

          <button onClick={() => setRemoteOnly(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: remoteOnly ? 'rgba(96,165,250,0.12)' : '#111A1A', border: `1px solid ${remoteOnly ? 'rgba(96,165,250,0.3)' : '#1E3030'}`, borderRadius: 7, padding: '6px 10px', color: remoteOnly ? '#60a5fa' : '#4A7A78', fontSize: 12, cursor: 'pointer' }}>
            {remoteOnly ? <ToggleRight size={14} /> : <ToggleLeft size={14} />} Remote only
          </button>

          <span style={{ fontSize: 12, color: '#4A7A78', marginLeft: 4 }}>
            {filtered.length} of {companies.length} companies
          </span>
        </div>
      )}

      {/* Company cards */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16, maxWidth: 900, marginBottom: 32 }}>
          {filtered.map((company, i) => (
            <CompanyCard key={i} company={company} onResearch={handleResearch} />
          ))}
        </div>
      )}

      {/* Empty state after fetch */}
      {!loading && companies.length > 0 && filtered.length === 0 && (
        <div style={{ background: '#111A1A', border: '1px dashed #264040', borderRadius: 12, padding: '40px 20px', textAlign: 'center', maxWidth: 480, marginBottom: 32 }}>
          <Building2 size={28} color="#264040" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: '#4A7A78', margin: 0 }}>No companies match the current filters. Try adjusting the size or sector.</p>
        </div>
      )}

      {/* Pre-search empty state */}
      {!loading && companies.length === 0 && !error && hasProfile && (
        <div style={{ background: '#111A1A', border: '1px dashed #264040', borderRadius: 12, padding: '48px 24px', textAlign: 'center', maxWidth: 480, marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,212,200,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Briefcase size={22} color="#00D4C8" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#E8F5F4', margin: '0 0 8px' }}>Ready to find your matches</p>
          <p style={{ fontSize: 13, color: '#4A7A78', margin: '0 0 20px', lineHeight: 1.6 }}>
            techcori will search for companies in Nigeria actively hiring <strong style={{ color: '#C5E8E6' }}>{profile.targetRole}</strong> and rank them by how well they fit your profile.
          </p>
          <button onClick={handleFetchMatches}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(0,212,200,0.15)', border: '1px solid rgba(0,212,200,0.3)', borderRadius: 9, padding: '10px 22px', color: '#00D4C8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Zap size={14} /> Find Matches
          </button>
        </div>
      )}

      {/* Scam protection notice */}
      {!loading && (
        <div style={{ maxWidth: 900, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Shield size={15} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#34d399', margin: '0 0 3px' }}>Scam protection active</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
              Companies shown are AI-researched. Always verify independently before sharing personal details. Never pay for a job application. Use the <strong style={{ color: '#8ABAB8' }}>Scam Detector</strong> if you receive an unsolicited offer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
