import { useEffect, useRef, useState } from 'react';
import { Check, Zap, Briefcase, Building2, Star, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { createSubscription } from '../services/usageApi';

const JS_FREE_FEATURES = [
  'CV upload and AI score out of 100',
  'CV vs job description matcher',
  'Browse job listings from 3 APIs',
  'Application tracker (up to 10 applications)',
  'Company research (up to 5 per month)',
  'Outreach email writer (up to 5 per month)',
];

const JS_PRO_FEATURES = [
  'Everything in Free',
  'Profile visible to hiring companies via AI matching',
  'Unlimited application tracking',
  'Unlimited company research',
  'Unlimited outreach emails',
  'AI rewrites CV bullet points line by line',
  'Priority job alerts when listings match your profile',
  'Interview prep coach',
  'Downloadable CV as PDF',
  'Pro badge on your profile',
];

const COMPANY_FEATURES = [
  'Verified, AI-searchable job listing',
  'Matched with Pro job seekers automatically',
  'Candidate management dashboard',
  'Listing active for 30 days',
  'Receipt emailed after payment',
  'Renew for ₦2,000 at any time',
];

export default function PricingPage({ onBack, onGetStarted, user, userPlan }) {
  const { isDark, colors: c } = useTheme();
  const pageRef   = useRef(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError,   setSubError]   = useState('');

  async function handleProUpgrade() {
    if (!user) { onGetStarted?.(); return; }
    if (userPlan === 'pro') return;
    setSubLoading(true);
    setSubError('');
    try {
      const data = await createSubscription();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setSubError(err.message || 'Could not start subscription. Please try again.');
    } finally {
      setSubLoading(false);
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    pageRef.current?.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const navBg = isDark ? 'rgba(10,15,15,0.97)' : 'rgba(244,249,247,0.97)';

  return (
    <div ref={pageRef} style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: navBg, backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 56,
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 14, fontWeight: 500,
        }}>
          <ArrowLeft size={16} />
          Back
        </button>
        <span style={{
          fontSize: 17, fontWeight: 700, color: 'var(--accent)',
          fontFamily: "'Clash Display', sans-serif", letterSpacing: '-0.3px',
        }}>
          techcori
        </span>
        {user ? (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {userPlan === 'pro' ? '✦ Pro' : 'Free plan'}
          </span>
        ) : (
          <button onClick={onGetStarted} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Get started
          </button>
        )}
      </nav>

      {/* Hero */}
      <section style={{ padding: '72px 24px 48px', textAlign: 'center' }}>
        <div className="reveal">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-dim)', border: '1px solid var(--accent)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 20,
          }}>
            <Zap size={13} color="var(--accent)" fill="var(--accent)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.04em' }}>
              SIMPLE, HONEST PRICING
            </span>
          </div>
          <h1 style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800,
            letterSpacing: '-1.5px', color: 'var(--text)',
            margin: '0 0 14px', lineHeight: 1.1,
          }}>
            Start free.<br />
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-mid))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Upgrade when you're ready.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', margin: 0, maxWidth: 500, marginInline: 'auto', lineHeight: 1.6 }}>
            No hidden fees. Cancel anytime. Built for Nigeria.
          </p>
        </div>
      </section>

      {/* Pricing columns */}
      <section style={{ padding: '0 24px 96px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24, alignItems: 'start',
        }}>

          {/* Job Seeker Free */}
          <PricingCard
            className="reveal reveal-delay-1"
            icon={<Briefcase size={18} color="var(--accent)" />}
            label="For Job Seekers"
            name="Free"
            price="₦0"
            period="forever"
            features={JS_FREE_FEATURES}
            cta={user ? (userPlan === 'pro' ? 'Current plan' : 'Your current plan') : 'Get Started Free'}
            ctaStyle="secondary"
            onCta={user ? null : onGetStarted}
            isDark={isDark}
          />

          {/* Job Seeker Pro — highlighted */}
          <PricingCard
            className="reveal reveal-delay-2"
            icon={<Star size={18} color="var(--accent)" fill="var(--accent)" />}
            label="For Job Seekers"
            name="Pro"
            price="₦2,000"
            period="/month"
            badge="Most Popular"
            features={JS_PRO_FEATURES}
            cta={
              subLoading ? 'Redirecting…'
              : !user ? 'Get Started'
              : userPlan === 'pro' ? '✦ Your plan'
              : 'Upgrade to Pro'
            }
            ctaStyle="primary"
            onCta={userPlan === 'pro' ? null : handleProUpgrade}
            ctaDisabled={subLoading || userPlan === 'pro'}
            highlight
            isDark={isDark}
            error={subError}
          />

          {/* Company */}
          <PricingCard
            className="reveal reveal-delay-3"
            icon={<Building2 size={18} color="var(--accent)" />}
            label="For Companies"
            name="Company"
            price="₦2,000"
            period="/listing"
            features={COMPANY_FEATURES}
            cta="Post a Job"
            ctaStyle="secondary"
            onCta={onGetStarted}
            isDark={isDark}
          />
        </div>

        {/* FAQ line */}
        <p style={{ textAlign: 'center', marginTop: 48, color: 'var(--muted)', fontSize: 14 }}>
          Questions?{' '}
          <a href="mailto:support@techcori.com" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            support@techcori.com
          </a>
          {' '}· Paystack-secured payments · Cancel anytime
        </p>
      </section>
    </div>
  );
}

function PricingCard({ icon, label, name, price, period, badge, features, cta, ctaStyle, onCta, ctaDisabled, highlight, isDark, className, error }) {
  const cardBg = highlight
    ? (isDark ? '#0D2020' : '#F0FAF8')
    : 'var(--card)';

  const cardBorder = highlight
    ? '2px solid var(--accent)'
    : '1px solid var(--border)';

  return (
    <div className={className} style={{
      background: cardBg,
      border: cardBorder,
      borderRadius: 20,
      padding: 28,
      position: 'relative',
      boxShadow: highlight
        ? (isDark ? '0 0 40px rgba(0,212,200,0.08)' : '0 0 40px rgba(0,184,173,0.1)')
        : 'none',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff',
          borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', letterSpacing: '0.04em',
        }}>
          {badge}
        </div>
      )}

      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>

      {/* Tier name + price */}
      <h2 style={{
        fontFamily: "'Clash Display', sans-serif",
        fontSize: 28, fontWeight: 800, color: 'var(--text)',
        margin: '0 0 4px', letterSpacing: '-0.5px',
      }}>
        {name}
      </h2>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
        <span style={{
          fontFamily: "'Clash Display', sans-serif",
          fontSize: 36, fontWeight: 800,
          color: highlight ? 'var(--accent)' : 'var(--text)',
          letterSpacing: '-1px',
        }}>
          {price}
        </span>
        <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 400 }}>{period}</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: highlight ? 'var(--accent)' : 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={11} color={highlight ? '#fff' : 'var(--accent)'} strokeWidth={3} />
            </div>
            <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onCta}
        disabled={!onCta || ctaDisabled}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12,
          fontSize: 15, fontWeight: 700, cursor: (onCta && !ctaDisabled) ? 'pointer' : 'default',
          border: ctaStyle === 'primary' ? 'none' : '1.5px solid var(--border)',
          background: ctaStyle === 'primary' ? 'var(--accent)' : 'transparent',
          color: ctaStyle === 'primary' ? '#fff' : 'var(--text)',
          transition: 'all 0.15s',
          opacity: (!onCta || ctaDisabled) ? 0.7 : 1,
          letterSpacing: '-0.2px',
        }}
        onMouseEnter={e => {
          if (!onCta || ctaDisabled) return;
          if (ctaStyle === 'secondary') {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }
        }}
        onMouseLeave={e => {
          if (!onCta || ctaDisabled) return;
          if (ctaStyle === 'secondary') {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text)';
          }
        }}
      >
        {cta}
      </button>

      {error && (
        <p style={{ color: 'var(--error)', fontSize: 12, textAlign: 'center', marginTop: 10, marginBottom: 0 }}>{error}</p>
      )}
    </div>
  );
}
