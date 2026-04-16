import { useState } from 'react';
import { Loader, Calendar } from 'lucide-react';
import { SkeletonText } from '../UI/Skeleton';

export default function FollowUpSequence({ sequence, isLoading, statusText, onGenerate }) {
  const [activeStep, setActiveStep] = useState(0);

  if (!sequence && !isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onGenerate} style={{
          width: '100%', background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.3)',
          borderRadius: 10, padding: '20px', cursor: 'pointer', color: '#f59e0b',
          fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Calendar size={15} />
          Generate 3-Touch Follow-up Sequence
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Loader size={13} color="#60a5fa" className="animate-spin-icon" />
          <span style={{ fontSize: 12, color: '#60a5fa' }}>{statusText || 'Building sequence...'}</span>
        </div>
        <SkeletonText lines={5} />
      </div>
    );
  }

  const steps = sequence?.sequence || [];

  return (
    <div style={{ padding: 20, animation: 'fadeInUp 0.35s ease' }}>
      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {steps.map((step, i) => (
          <button key={i} onClick={() => setActiveStep(i)} style={{
            flex: 1, background: activeStep === i ? '#27272a' : 'transparent',
            border: `1px solid ${activeStep === i ? '#3f3f46' : '#27272a'}`,
            borderRadius: 8, padding: '7px 4px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: activeStep === i ? '#f59e0b' : '#52525b' }}>
              Day {step.day}
            </span>
            <span style={{ fontSize: 9, color: '#3f3f46' }}>
              {i === 0 ? 'Initial' : i === 1 ? 'Follow-up' : 'Breakup'}
            </span>
          </button>
        ))}
      </div>

      {steps[activeStep] && (
        <div style={{ animation: 'fadeInUp 0.2s ease' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '8px 10px', background: '#18181b',
            borderRadius: 6, border: '1px solid #27272a',
          }}>
            <span style={{ fontSize: 11, color: '#52525b' }}>Strategy</span>
            <span style={{ fontSize: 11, color: '#a1a1aa' }}>{steps[activeStep].note}</span>
          </div>

          <div style={{ background: '#18181b', borderRadius: 8, border: '1px solid #27272a', padding: '12px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5', margin: '0 0 10px', borderBottom: '1px solid #27272a', paddingBottom: 8 }}>
              {steps[activeStep].subject}
            </p>
            <pre style={{ fontSize: 12, color: '#d4d4d8', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
              {steps[activeStep].body}
            </pre>
          </div>

          <span style={{
            display: 'inline-block', marginTop: 8, fontSize: 10, color: '#a78bfa',
            background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: 5, padding: '2px 8px',
          }}>
            Tone: {steps[activeStep].tone}
          </span>
        </div>
      )}
    </div>
  );
}
