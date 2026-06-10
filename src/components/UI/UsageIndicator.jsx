import { Zap } from 'lucide-react';
import { usePaywall } from '../../context/PaywallContext';

/**
 * Displays remaining free uses for a metered feature.
 * Shows nothing for Pro users.
 *
 * Props:
 *   feature  — "cv_optimiser" | "company_research" | "outreach_assistant"
 *   style    — optional extra styles on the wrapper
 */
export default function UsageIndicator({ feature, style = {} }) {
  const { isPro, getFeatureUsage } = usePaywall();

  if (isPro) return null;

  const info = getFeatureUsage(feature);
  if (!info) return null;

  const { used, limit, remaining } = info;
  if (limit === null) return null;

  const isLastOne = remaining === 1;
  const isExhausted = remaining === 0;

  const color = isExhausted
    ? '#f87171'
    : isLastOne
    ? '#f59e0b'
    : 'var(--accent)';

  const bg = isExhausted
    ? 'rgba(248,113,113,0.08)'
    : isLastOne
    ? 'rgba(245,158,11,0.08)'
    : 'var(--accent-dim)';

  const border = isExhausted
    ? 'rgba(248,113,113,0.25)'
    : isLastOne
    ? 'rgba(245,158,11,0.25)'
    : 'rgba(0,184,173,0.25)';

  const text = isExhausted
    ? `${limit} of ${limit} ${featureLabel(feature)} uses used this month`
    : `${remaining} of ${limit} ${featureLabel(feature)} uses remaining this month`;

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 8, padding: '5px 10px',
      ...style,
    }}>
      <Zap size={12} color={color} fill={color} />
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{text}</span>
    </div>
  );
}

function featureLabel(feature) {
  const map = {
    cv_optimiser:       'CV Optimiser',
    company_research:   'Company Research',
    outreach_assistant: 'Outreach Assistant',
  };
  return map[feature] || feature;
}
