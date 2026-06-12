import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, MapPin, Filter, Bookmark, BookmarkCheck,
  ExternalLink, X, ChevronLeft, ChevronRight,
  AlertCircle, Briefcase, Loader, Wifi, WifiOff,
  CheckCircle, Zap, Flag,
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { useTheme } from '../../context/ThemeContext';
import {
  searchJobs, getSavedJobs, isJobSaved,
  saveJob, unsaveJob, logApplication, buildCVText,
} from '../../services/jobsApi';
import { matchJD } from '../../services/jsApi';
import { getPublicListings } from '../../services/paymentApi';
import { authFetch } from '../../services/authApi';

// Accent is always teal regardless of theme
const A    = '#00D4C8';
const AD   = 'rgba(0,212,200,0.08)';
const AB   = 'rgba(0,212,200,0.18)';

// ── Source badge config ───────────────────────────────────────────────────────
const SOURCE_STYLE = {
  Featured: { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  Global:   { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', border: 'rgba(251,146,60,0.25)' },
  Remote:   { bg: 'rgba(52,211,153,0.12)', color: '#34d399', border: 'rgba(52,211,153,0.25)' },
};

const DATE_FILTERS = [
  { value: 'any',   label: 'Any time' },
  { value: '24h',   label: 'Past 24 hours' },
  { value: 'week',  label: 'Past week' },
  { value: 'month', label: 'Past month' },
];
const SOURCE_FILTERS = ['All', 'Featured', 'Global', 'Remote'];
const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 60)      return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)      return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)      return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function passesDateFilter(iso, filter) {
  if (filter === 'any' || !iso) return true;
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return true;
  if (filter === '24h')   return diff < 864e5;
  if (filter === 'week')  return diff < 6048e5;
  if (filter === 'month') return diff < 2592e6;
  return true;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonCard() {
  const { colors: c } = useTheme();
  return (
    <div style={{ background: c.card, border: `1px solid ${c.brd}`, borderRadius: 14, padding: 20 }}>
      {[80, 60, 40, 100, 100, 60].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 18 : 13, width: `${w}%`, marginBottom: i < 5 ? 10 : 0 }} />
      ))}
    </div>
  );
}

function SourceBadge({ source }) {
  const { colors: c } = useTheme();
  const s = SOURCE_STYLE[source] || { bg: c.ad, color: c.mut2, border: c.brd };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '2px 7px',
    }}>
      {source}
    </span>
  );
}

function RemoteBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      background: AD, color: A, border: `1px solid ${AB}`,
      borderRadius: 6, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <Wifi size={9} /> Remote
    </span>
  );
}

function JobCard({ job, onApply, onToggleSave, saved, matchScore, matchLoading, onCheckMatch }) {
  const { colors: c } = useTheme();
  const BG = c.bg; const CARD = c.card; const BRD = c.brd;
  const TXT = c.txt; const MUT = c.mut; const MUT2 = c.mut2;
  return (
    <div style={{
      background: CARD, border: `1px solid ${BRD}`, borderRadius: 14,
      padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = AB)}
    onMouseLeave={e => (e.currentTarget.style.borderColor = BRD)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: TXT, margin: '0 0 4px', lineHeight: 1.3 }}>
            {job.title}
          </p>
          <p style={{ fontSize: 13, color: MUT2, margin: 0 }}>{job.company}</p>
        </div>

        {/* CV match badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {matchScore != null ? (
            <div style={{
              fontSize: 11, fontWeight: 800, color: matchScore >= 70 ? '#34d399' : matchScore >= 40 ? A : '#f87171',
              background: matchScore >= 70 ? 'rgba(52,211,153,0.1)' : matchScore >= 40 ? AD : 'rgba(248,113,113,0.1)',
              border: `1px solid ${matchScore >= 70 ? 'rgba(52,211,153,0.3)' : matchScore >= 40 ? AB : 'rgba(248,113,113,0.3)'}`,
              borderRadius: 8, padding: '3px 8px',
            }}>
              {matchScore}% match
            </div>
          ) : (
            <button
              onClick={() => onCheckMatch(job)}
              disabled={matchLoading}
              style={{
                fontSize: 10, fontWeight: 600, color: matchLoading ? MUT : A,
                background: 'transparent', border: `1px solid ${matchLoading ? BRD : AB}`,
                borderRadius: 8, padding: '3px 8px', cursor: matchLoading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {matchLoading
                ? <><Loader size={9} className="animate-spin-icon" /> Checking...</>
                : <><Zap size={9} /> CV Match</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <SourceBadge source={job.source} />
        {job.is_remote && <RemoteBadge />}
        {!job.is_remote && job.location && (
          <span style={{ fontSize: 11, color: MUT, display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={10} /> {job.location}
          </span>
        )}
        {job.date_posted && (
          <span style={{ fontSize: 11, color: MUT, marginLeft: 'auto' }}>
            {relativeTime(job.date_posted)}
          </span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p style={{
          fontSize: 13, color: MUT2, margin: 0, lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {job.description}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onApply(job)}
          style={{
            flex: 1, background: `linear-gradient(135deg, ${A}, #00B8AD)`,
            color: BG, border: 'none', borderRadius: 9,
            padding: '9px 16px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
          }}
        >
          <ExternalLink size={13} /> Apply
        </button>
        <button
          onClick={() => onToggleSave(job)}
          title={saved ? 'Unsave job' : 'Save job'}
          style={{
            background: saved ? AD : 'transparent',
            border: `1px solid ${saved ? AB : BRD}`,
            borderRadius: 9, padding: '9px 14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', color: saved ? A : MUT,
            transition: 'all 0.15s',
          }}
        >
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  const { colors: c } = useTheme();
  return (
    <button onClick={onClick} style={{
      background: active ? AD : 'transparent',
      border: `1px solid ${active ? AB : c.brd}`,
      color: active ? A : c.mut2,
      borderRadius: 20, padding: '5px 14px',
      fontSize: 12, fontWeight: active ? 700 : 400,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );
}

// ── techcori listing card ─────────────────────────────────────────────────────

function TechcoriListingCard({ listing, flagged, flagLoading, onFlag }) {
  const { colors: c } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: c.card,
      border: `1.5px solid var(--accent)`,
      borderRadius: 14, padding: 20,
      boxShadow: '0 0 0 1px var(--accent-dim)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: c.txt, margin: 0 }}>{listing.title}</p>
            {/* Verified badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
              color: '#00875A', background: 'rgba(0,135,90,0.1)',
              border: '1px solid rgba(0,135,90,0.3)',
              borderRadius: 6, padding: '2px 7px',
            }}>
              <CheckCircle size={9} strokeWidth={3} /> VERIFIED LISTING
            </span>
          </div>
          <p style={{ fontSize: 13, color: c.mut2, margin: 0 }}>{listing.company}</p>
        </div>
        {/* Flag button */}
        <button
          onClick={onFlag}
          disabled={flagged || flagLoading}
          title={flagged ? 'Already reported' : 'Report this listing as suspicious'}
          style={{
            background: 'none', border: `1px solid ${flagged ? c.brd : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 8, padding: '5px 10px', cursor: flagged ? 'default' : 'pointer',
            fontSize: 11, fontWeight: 600,
            color: flagged ? c.mut : '#ef4444',
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            opacity: flagLoading ? 0.6 : 1,
          }}
        >
          <AlertCircle size={11} />
          {flagLoading ? 'Reporting…' : flagged ? 'Reported' : 'Report'}
        </button>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {listing.location && (
          <span style={{ fontSize: 12, color: c.mut, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> {listing.location}
          </span>
        )}
        {listing.jobType && (
          <span style={{ fontSize: 11, fontWeight: 600, color: A, background: AD, border: `1px solid ${AB}`, borderRadius: 6, padding: '2px 8px' }}>
            {listing.jobType}
          </span>
        )}
        {listing.salaryRange && (
          <span style={{ fontSize: 12, color: c.mut }}>{listing.salaryRange}</span>
        )}
      </div>

      {/* Description (collapsible) */}
      {listing.description && (
        <div>
          <p style={{ fontSize: 13, color: c.mut2, margin: '0 0 6px', lineHeight: 1.6,
            overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 3,
            WebkitBoxOrient: 'vertical',
          }}>
            {listing.description}
          </p>
          {listing.description.length > 180 && (
            <button onClick={() => setExpanded(e => !e)} style={{
              background: 'none', border: 'none', color: A, fontSize: 12,
              cursor: 'pointer', padding: 0, fontWeight: 600,
            }}>
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Expires */}
      {listing.expiresAt && (
        <p style={{ fontSize: 11, color: c.mut, margin: '10px 0 0' }}>
          Active until {new Date(listing.expiresAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
        </p>
      )}
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobListingsPage() {
  const isMobile = useIsMobile();
  const { colors: c } = useTheme();
  const BG = c.bg; const CARD = c.card; const BRD = c.brd;
  const TXT = c.txt; const MUT = c.mut; const MUT2 = c.mut2;

  const [query,    setQuery]    = useState('');
  const [location, setLocation] = useState('Nigeria');
  const [jobs,     setJobs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [apiErrors, setApiErrors] = useState([]);
  const [searched, setSearched] = useState(false);

  const [page,     setPage]     = useState(1);

  // Filters
  const [filterSource, setFilterSource] = useState('All');
  const [filterRemote, setFilterRemote] = useState(false);
  const [filterDate,   setFilterDate]   = useState('any');
  const [filterOpen,   setFilterOpen]   = useState(false);

  // Saved & CV match
  const [savedIds,      setSavedIds]      = useState(() => new Set(getSavedJobs().map(j => j.id)));
  const [matchScores,   setMatchScores]   = useState({});
  const [matchLoading,  setMatchLoading]  = useState(new Set());

  // techcori native listings
  const [tcListings,    setTcListings]    = useState([]);
  const [flaggedIds,    setFlaggedIds]    = useState(new Set());
  const [flagLoading,   setFlagLoading]   = useState(null);

  const debounceRef = useRef(null);

  // Fetch techcori listings on mount
  useEffect(() => {
    getPublicListings('', 'Nigeria', 1)
      .then(r => setTcListings(r.results || []))
      .catch(() => {});
  }, []);

  async function handleFlag(listingId) {
    if (flaggedIds.has(listingId)) return;
    setFlagLoading(listingId);
    try {
      const r = await authFetch(`/api/listings/${listingId}/flag`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Reported by job seeker' }),
      });
      const d = await r.json().catch(() => ({}));
      setFlaggedIds(prev => new Set([...prev, listingId]));
      if (d.suspended) {
        setTcListings(prev => prev.filter(l => l.id !== listingId));
      }
    } catch {}
    finally { setFlagLoading(null); }
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q, loc) => {
    if (!q.trim()) { setJobs([]); setSearched(false); return; }
    setLoading(true);
    setPage(1);
    try {
      const res = await searchJobs({ query: q, location: loc });
      setJobs(res.jobs || []);
      setApiErrors(res.errors || []);
      setSearched(true);
    } catch (e) {
      setApiErrors([e.message || 'Failed to load jobs']);
      setJobs([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced trigger
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, location), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query, location, doSearch]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredJobs = jobs.filter(j => {
    if (filterSource !== 'All' && j.source !== filterSource) return false;
    if (filterRemote && !j.is_remote) return false;
    if (!passesDateFilter(j.date_posted, filterDate)) return false;
    return true;
  });

  const totalPages   = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const visibleJobs  = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterSource, filterRemote, filterDate]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApply = (job) => {
    logApplication(job);
    if (job.url) window.open(job.url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleSave = (job) => {
    if (savedIds.has(job.id)) {
      unsaveJob(job.id);
      setSavedIds(prev => { const s = new Set(prev); s.delete(job.id); return s; });
    } else {
      saveJob(job);
      setSavedIds(prev => new Set([...prev, job.id]));
    }
  };

  const handleCheckMatch = async (job) => {
    const cvText = buildCVText();
    if (!cvText || !job.description) return;
    setMatchLoading(prev => new Set([...prev, job.id]));
    try {
      const result = await matchJD(cvText, job.description, {});
      if (result?.match_score != null) {
        setMatchScores(prev => ({ ...prev, [job.id]: result.match_score }));
      }
    } catch {}
    setMatchLoading(prev => { const s = new Set(prev); s.delete(job.id); return s; });
  };

  // ── Filter controls ────────────────────────────────────────────────────────
  const FilterControls = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {/* Remote toggle */}
      <button onClick={() => setFilterRemote(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: filterRemote ? AD : 'transparent',
        border: `1px solid ${filterRemote ? AB : BRD}`,
        color: filterRemote ? A : MUT2,
        borderRadius: 20, padding: '5px 14px',
        fontSize: 12, fontWeight: filterRemote ? 700 : 400,
        cursor: 'pointer', transition: 'all 0.15s',
      }}>
        <Wifi size={11} /> Remote only
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: BRD }} />

      {/* Source */}
      {SOURCE_FILTERS.map(s => (
        <FilterPill key={s} label={s} active={filterSource === s} onClick={() => setFilterSource(s)} />
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: BRD }} />

      {/* Date */}
      {DATE_FILTERS.map(d => (
        <FilterPill key={d.value} label={d.label} active={filterDate === d.value} onClick={() => setFilterDate(d.value)} />
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: TXT, margin: '0 0 4px', letterSpacing: '-0.5px', fontFamily: "'Clash Display', sans-serif" }}>
            Job Board
          </h1>
          <p style={{ fontSize: 14, color: MUT, margin: 0 }}>
            Live listings from multiple job platforms
          </p>
        </div>

        {/* Search bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
          gap: 10, marginBottom: 14,
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color={MUT} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Job title, keyword, or skill…"
              style={{
                width: '100%', background: CARD, border: `1px solid ${BRD}`, borderRadius: 10,
                padding: '11px 14px 11px 40px', color: TXT, fontSize: 14, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.15s', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = A)}
              onBlur={e  => (e.target.style.borderColor = BRD)}
            />
          </div>
          <div style={{ position: 'relative', minWidth: isMobile ? undefined : 220 }}>
            <MapPin size={15} color={MUT} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Location (e.g. Nigeria)"
              style={{
                width: '100%', background: CARD, border: `1px solid ${BRD}`, borderRadius: 10,
                padding: '11px 14px 11px 40px', color: TXT, fontSize: 14, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.15s', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = A)}
              onBlur={e  => (e.target.style.borderColor = BRD)}
            />
          </div>
        </div>

        {/* Filters — desktop inline / mobile bottom sheet trigger */}
        {isMobile ? (
          <button
            onClick={() => setFilterOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: CARD, border: `1px solid ${BRD}`, borderRadius: 10,
              padding: '10px 16px', color: MUT2, fontSize: 13, cursor: 'pointer',
              width: '100%', marginBottom: 16,
            }}
          >
            <Filter size={14} />
            Filters
            {(filterRemote || filterSource !== 'All' || filterDate !== 'any') && (
              <span style={{
                marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                background: AD, color: A, border: `1px solid ${AB}`,
                borderRadius: 10, padding: '2px 8px',
              }}>
                Active
              </span>
            )}
          </button>
        ) : (
          <div style={{
            background: CARD, border: `1px solid ${BRD}`, borderRadius: 12,
            padding: '12px 16px', marginBottom: 20, overflowX: 'auto',
          }}>
            <FilterControls />
          </div>
        )}

        {/* ── techcori listings ─────────────────────────────────────────── */}
        {tcListings.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{
                background: 'var(--accent)', color: '#fff',
                borderRadius: 6, padding: '3px 10px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              }}>
                ✦ ON TECHCORI
              </div>
              <span style={{ fontSize: 13, color: MUT }}>
                Verified listings posted directly by companies
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tcListings.map(listing => (
                <TechcoriListingCard
                  key={listing.id}
                  listing={listing}
                  flagged={flaggedIds.has(listing.id)}
                  flagLoading={flagLoading === listing.id}
                  onFlag={() => handleFlag(listing.id)}
                />
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />
          </div>
        )}

        {/* API error banners */}
        {apiErrors.map((err, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 10,
            fontSize: 12, color: '#fb923c',
          }}>
            <WifiOff size={13} /> {err}
          </div>
        ))}

        {/* Results summary */}
        {searched && !loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: MUT, margin: 0 }}>
              {filteredJobs.length === 0
                ? 'No jobs found'
                : `${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''} found`}
            </p>
            {filteredJobs.length > 0 && (
              <p style={{ fontSize: 12, color: MUT, margin: 0 }}>
                Page {page} of {totalPages}
              </p>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state — before any search */}
        {!loading && !searched && (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: CARD, border: `1px solid ${BRD}`, borderRadius: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: AD, border: `1px solid ${AB}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Briefcase size={28} color={A} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: TXT, margin: '0 0 8px' }}>Find your next role</p>
            <p style={{ fontSize: 14, color: MUT, margin: 0, lineHeight: 1.6 }}>
              Type a job title or keyword above to search live listings
              from multiple job platforms at once.
            </p>
          </div>
        )}

        {/* Empty state — after search with no results */}
        {!loading && searched && filteredJobs.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            background: CARD, border: `1px solid ${BRD}`, borderRadius: 16,
          }}>
            <AlertCircle size={32} color={MUT} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: '0 0 8px' }}>No jobs found</p>
            <p style={{ fontSize: 13, color: MUT, margin: '0 0 20px', lineHeight: 1.6 }}>
              Try broadening your search, removing filters, or searching for a related keyword.
            </p>
            <button
              onClick={() => { setFilterSource('All'); setFilterRemote(false); setFilterDate('any'); }}
              style={{
                background: AD, border: `1px solid ${AB}`, color: A,
                borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Job cards grid */}
        {!loading && visibleJobs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {visibleJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                saved={savedIds.has(job.id)}
                matchScore={matchScores[job.id] ?? null}
                matchLoading={matchLoading.has(job.id)}
                onApply={handleApply}
                onToggleSave={handleToggleSave}
                onCheckMatch={handleCheckMatch}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
              disabled={page === 1}
              style={{
                background: CARD, border: `1px solid ${BRD}`, color: page === 1 ? MUT : TXT,
                borderRadius: 9, padding: '8px 14px', cursor: page === 1 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => { setPage(n); window.scrollTo(0, 0); }} style={{
                background: n === page ? AD : CARD,
                border: `1px solid ${n === page ? AB : BRD}`,
                color: n === page ? A : MUT2,
                borderRadius: 9, padding: '8px 14px', cursor: 'pointer',
                fontSize: 13, fontWeight: n === page ? 700 : 400, minWidth: 40,
              }}>
                {n}
              </button>
            ))}

            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }}
              disabled={page === totalPages}
              style={{
                background: CARD, border: `1px solid ${BRD}`, color: page === totalPages ? MUT : TXT,
                borderRadius: 9, padding: '8px 14px', cursor: page === totalPages ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile filter bottom sheet ─────────────────────────────────────── */}
      {isMobile && filterOpen && (
        <>
          <div
            onClick={() => setFilterOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)' }}
          />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
            background: c.card, borderTop: `1px solid ${BRD}`,
            borderRadius: '20px 20px 0 0',
            padding: '0 20px max(24px, env(safe-area-inset-bottom, 24px))',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: BRD, borderRadius: 2, margin: '12px auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: 0 }}>Filters</p>
              <button
                onClick={() => setFilterOpen(false)}
                style={{ background: 'none', border: 'none', color: MUT, cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <Section label="Remote">
              <button onClick={() => setFilterRemote(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: filterRemote ? AD : 'transparent',
                border: `1px solid ${filterRemote ? AB : BRD}`,
                color: filterRemote ? A : MUT2,
                borderRadius: 10, padding: '10px 14px',
                fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <Wifi size={14} /> Remote only
                {filterRemote && <CheckCircle size={14} style={{ marginLeft: 'auto' }} />}
              </button>
            </Section>

            <Section label="Source">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SOURCE_FILTERS.map(s => (
                  <button key={s} onClick={() => setFilterSource(s)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: filterSource === s ? AD : 'transparent',
                    border: `1px solid ${filterSource === s ? AB : BRD}`,
                    color: filterSource === s ? A : MUT2,
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {s} {filterSource === s && <CheckCircle size={14} />}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Date Posted">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DATE_FILTERS.map(d => (
                  <button key={d.value} onClick={() => setFilterDate(d.value)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: filterDate === d.value ? AD : 'transparent',
                    border: `1px solid ${filterDate === d.value ? AB : BRD}`,
                    color: filterDate === d.value ? A : MUT2,
                    borderRadius: 10, padding: '10px 14px',
                    fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    {d.label} {filterDate === d.value && <CheckCircle size={14} />}
                  </button>
                ))}
              </div>
            </Section>

            <button
              onClick={() => setFilterOpen(false)}
              style={{
                width: '100%', background: `linear-gradient(135deg, ${A}, #00B8AD)`,
                color: BG, border: 'none', borderRadius: 10,
                padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8,
              }}
            >
              Show results
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ label, children }) {
  const { colors: c } = useTheme();
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: c.mut, textTransform: 'uppercase',
        letterSpacing: '0.06em', margin: '0 0 10px' }}>
        {label}
      </p>
      {children}
    </div>
  );
}
