import { useState } from 'react';
import { Lock, Star, Check, X, Zap, Eye, Mail, FileText, Sparkles, Bell, Mic } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { createSubscription } from '../../services/usageApi';

const PRO_HIGHLIGHTS = [
  { icon: Eye,      text: 'Profile visible to 500+ hiring companies via AI matching' },
  { icon: Sparkles, text: 'AI rewrites your CV bullet points line by line' },
  { icon: Mail,     text: 'Unlimited outreach emails and company research' },
];

const FEATURE_MAP = {
  'cv_optimiser':         { label: 'CV Optimiser',          icon: FileText },
  'company_research':     { label: 'Company Research',       icon: Zap },
  'outreach_assistant':   { label: 'Outreach Assistant',     icon: Mail },
  'company-visibility':   { label: 'Profile visible to companies', icon: Eye },
  'unlimited-outreach':   { label: 'Unlimited outreach emails',    icon: Mail },
  'unlimited-research':   { label: 'Unlimited company research',   icon: Zap },
  'cv-rewrite':           { label: 'AI CV rewrite suggestions',    icon: Sparkles },
  'interview-prep':       { label: 'Interview prep coach',         icon: Mic },
  'priority-alerts':      { label: 'Priority job alerts',          icon: Bell },
  'unlimited-apps':       { label: 'Unlimited application tracking', icon: FileText },
  'pdf-download':         { label: 'Downloadable CV as PDF',       icon: FileText },
};

const FEATURE_LABELS = {
  cv_optimiser:       'CV Optimiser',
  company_research:   'Company Research',
  outreach_assistant: 'Outreach Assistant',
};

export default function PaywallModal({ feature, usageInfo, user, onClose, onUpgradeSuccess }) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const featureInfo = FEATURE_MAP[feature] || { label: usageInfo?.feature_label || feature, icon: Lock };
  const FeatureIcon = featureInfo.icon;

  const featureLabel = usageInfo?.feature_label || FEATURE_LABELS[feature] || featureInfo.label;
  const usedCount    = usageInfo?.used   ?? null;
  const limitCount   = usageInfo?.limit  ?? 5;

  async function handleUpgrade() {
    setLoading(true);
    setError('');
    try {
      const data = await createSubscription();

      // Demo mode — backend grants Pro directly
      if (data.plan === 'pro') {
        setSuccess(true);
        onUpgradeSuccess?.();
        setLoading(false);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const modalBg   = isDark ? '#111A1A' : '#FFFFFF';
  const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: overlayBg, padding: 20 }}>
        <div style={{ background: modalBg, borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-dim)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={28} color="var(--success)" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px' }}>You're now Pro!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>Your account has been upgraded. All Pro features are now unlocked.</p>
          <button onClick={onClose} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Start exploring
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: overlayBg, padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: modalBg, borderRadius: 20, padding: '36px 32px', maxWidth: 440, width: '100%', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--card-2)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
          <X size={16} />
        </button>

        {/* Feature badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, padding: '6px 12px', marginBottom: 16 }}>
          <FeatureIcon size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{featureLabel}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 2 }}>— Pro only</span>
        </div>

        {/* Usage exhausted banner */}
        {usedCount !== null && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#f87171', fontWeight: 600 }}>
              You have used {usedCount} of {limitCount} {featureLabel} uses this month.
            </p>
          </div>
        )}

        <h2 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
          Unlock unlimited access
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
          Upgrade to techcori Pro and get the tools that actually move the needle on your career.
        </p>

        {/* Pro benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {PRO_HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Icon size={13} color="var(--accent)" />
              </div>
              <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: loading ? 'var(--muted)' : 'var(--accent)', color: loading ? 'var(--muted-2)' : '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Star size={16} fill={loading ? 'transparent' : 'currentColor'} />
          {loading ? 'Processing…' : 'Upgrade to Pro for ₦2,000/month'}
        </button>

        {error && <p style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center', margin: '12px 0 0' }}>{error}</p>}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
