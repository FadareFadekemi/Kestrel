import { useMemo } from 'react';
import { FileText, Send, TrendingUp, Briefcase, ArrowUpRight, CheckCircle, AlertCircle, Info, EyeOff, Star } from 'lucide-react';
import ScoreRing from '../../components/UI/ScoreRing';
import EmptyState from '../../components/UI/EmptyState';
import useIsMobile from '../../hooks/useIsMobile';
import { useTheme } from '../../context/ThemeContext';

const JS_PROFILE_KEY    = 'kestrel_jobseeker_profile';
const JS_APPS_KEY       = 'kestrel_js_applications';

const APP_STATUS_STYLES = {
  Sent:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',          dot: '#3b82f6' },
  Opened:     { color: '#00D4C8', bg: 'rgba(0,212,200,0.1)',          dot: '#00D4C8' },
  Replied:    { color: '#34d399', bg: 'rgba(52,211,153,0.1)',          dot: '#10b981' },
  Interview:  { color: '#00D4C8', bg: 'rgba(0,212,200,0.1)',         dot: '#00D4C8' },
  Rejected:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)',         dot: '#ef4444' },
};

function readJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function calcHealth(profile, apps) {
  const sent     = apps.filter(a => a.status !== 'Draft').length;
  const replied  = apps.filter(a => ['Replied', 'Interview'].includes(a.status)).length;
  const fields   = [profile.fullName, profile.targetRole, profile.education, profile.experience, profile.location];
  const profilePct  = (fields.filter(Boolean).length / 5) * 20;
  const cvPct       = profile.cvFileName ? 30 : 0;
  const appPct      = Math.min(30, sent * 6);
  const responsePct = sent > 0 ? Math.min(20, (replied / sent) * 20) : 0;
  return Math.round(profilePct + cvPct + appPct + responsePct);
}

function getActions(profile, apps) {
  const items = [];
  const sent = apps.filter(a => a.status !== 'Draft').length;
  const fields = [profile.fullName, profile.targetRole, profile.education, profile.experience, profile.location];
  const profileDone = fields.filter(Boolean).length === 5;
  if (!profile.cvFileName)  items.push({ icon: FileText, text: 'Upload your CV to get a personalised score', urgent: true });
  if (sent === 0)            items.push({ icon: Send,     text: 'Send your first application to a company',  urgent: true });
  if (!profileDone)          items.push({ icon: Info,     text: 'Complete your profile for better matches',  urgent: false });
  if (sent > 0 && sent < 5) items.push({ icon: TrendingUp,text:'Apply to more companies to improve your odds',urgent: false });
  items.push(                            { icon: Briefcase,text: 'Check Job Matches for new opportunities',  urgent: false });
  return items.slice(0, 3);
}

function healthColor(score) {
  if (score >= 70) return '#34d399';
  if (score >= 40) return '#00D4C8';
  return '#ef4444';
}

export default function JobSeekerDashboard({ user, setActivePage, userPlan, onOpenPaywall }) {
  const isMobile = useIsMobile();
  const { colors: c } = useTheme();
  const isPro = userPlan === 'pro';

  const profile = useMemo(() => readJSON(JS_PROFILE_KEY, {}), []);
  const apps    = useMemo(() => readJSON(JS_APPS_KEY, []), []);

  const sent        = apps.filter(a => a.status !== 'Draft').length;
  const replied     = apps.filter(a => ['Replied', 'Interview'].includes(a.status)).length;
  const responseRate = sent > 0 ? ((replied / sent) * 100).toFixed(0) : '0';
  const health      = calcHealth(profile, apps);
  const actions     = getActions(profile, apps);
  const recent      = [...apps].sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied)).slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const name = profile.fullName || user?.name || 'there';

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%' }}>

      {/* Profile visibility banner — free users only */}
      {!isPro && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'rgba(0,184,173,0.06)', border: '1px solid rgba(0,184,173,0.2)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 20,
        }}>
          <EyeOff size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 3px' }}>
              Your profile is hidden from companies
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Upgrade to Pro to appear in company talent pool searches and get matched with hiring managers directly.
            </p>
          </div>
          <button
            onClick={() => onOpenPaywall?.('company-visibility')}
            style={{ flexShrink: 0, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
          >
            <Star size={12} fill="currentColor" /> Go Pro
          </button>
        </div>
      )}

      {/* Page title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: c.txt, margin: 0 }}>
          {greeting()}, {name.split(' ')[0]}
        </h1>
        <p style={{ fontSize: 13, color: c.mut, marginTop: 4 }}>
          {profile.targetRole ? `Targeting: ${profile.targetRole}` : 'Your career overview'}
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 28 }}>
        <MetricCard icon={<FileText size={16} color="#00D4C8" />} label="CV Score"          value={profile.cvScore || 0}     suffix="" unit="/100" />
        <MetricCard icon={<Send     size={16} color="#60a5fa" />} label="Applications Sent" value={sent}                       />
        <MetricCard icon={<TrendingUp size={16} color="#34d399" />} label="Response Rate"   value={responseRate}               suffix="%" />
        <MetricCard icon={<Briefcase size={16} color="#00D4C8" />} label="Matches Found"    value={profile.matchesFound || 0} />
      </div>

      {/* Bottom row: health score + applications */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: 16 }}>

        {/* Career Health Score */}
        <div style={{ background: c.card, border: `1px solid ${c.brd}`, borderRadius: 12, padding: '20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: c.txt, margin: '0 0 20px' }}>Career Health Score</p>

          {/* Ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <HealthRing score={health} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map(({ icon: Icon, text, urgent }, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: urgent ? c.ad : c.brd,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={13} color={urgent ? '#00D4C8' : c.mut} />
                </div>
                <p style={{ fontSize: 12, color: c.mut2, margin: 0, lineHeight: 1.5, paddingTop: 4 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Applications */}
        <div style={{ background: c.card, border: `1px solid ${c.brd}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${c.brd}` }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: c.txt, margin: 0 }}>Recent Applications</p>
            <button onClick={() => setActivePage('Applications')} style={{ fontSize: 12, color: '#00D4C8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              View all <ArrowUpRight size={12} />
            </button>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No applications yet"
              description="Research your first company to get started."
              action={{ label: 'Research a Company', onClick: () => setActivePage('Agent') }}
            />
          ) : isMobile ? (
            /* Mobile: card list */
            <div>
              {recent.map((app, i) => {
                const s = APP_STATUS_STYLES[app.status] || APP_STATUS_STYLES.Draft;
                return (
                  <div key={app.id} style={{ padding: '12px 16px', borderBottom: i < recent.length - 1 ? '1px solid #1c1c1e' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: c.txt, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.company}</p>
                      <p style={{ fontSize: 11, color: c.mut, margin: '2px 0 0' }}>{app.role}</p>
                    </div>
                    <AppStatusBadge status={app.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop: table */
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.brd}` }}>
                  {['Company', 'Role', 'Date Applied', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: c.mut, letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((app, i) => (
                  <tr key={app.id} style={{ borderBottom: i < recent.length - 1 ? `1px solid ${c.brd}` : 'none' }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500, color: c.txt }}>{app.company}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: c.mut2 }}>{app.role}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: c.mut }}>{app.dateApplied}</td>
                    <td style={{ padding: '12px 20px' }}><AppStatusBadge status={app.status} /></td>
                    <td style={{ padding: '12px 20px' }}>
                      <button onClick={() => setActivePage('Applications')} style={{ fontSize: 11, color: '#00D4C8', background: 'none', border: 'none', cursor: 'pointer' }}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function MetricCard({ icon, label, value, suffix = '', unit = '' }) {
  const { colors: c } = useTheme();
  return (
    <div style={{ background: c.card, border: `1px solid ${c.brd}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, background: c.brd, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: c.txt, margin: '0 0 2px' }}>
        {value}{suffix}<span style={{ fontSize: 14, color: c.mut, fontWeight: 400 }}>{unit}</span>
      </p>
      <p style={{ fontSize: 12, color: c.mut, margin: 0 }}>{label}</p>
    </div>
  );
}

function HealthRing({ score }) {
  const { colors: c } = useTheme();
  const size = 120;
  const strokeW = 8;
  const r = (size / 2) - strokeW;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = healthColor(score);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.brd} strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.7s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: c.mut, marginTop: 2 }}>/100</span>
      </div>
    </div>
  );
}

function AppStatusBadge({ status }) {
  const { colors: c } = useTheme();
  const draftStyle = { color: c.mut, bg: c.brd, dot: c.mut };
  const s = status === 'Draft' ? draftStyle : (APP_STATUS_STYLES[status] || draftStyle);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}
