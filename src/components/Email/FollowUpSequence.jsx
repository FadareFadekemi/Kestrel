import { useState } from 'react';
import { Loader, Calendar } from 'lucide-react';
import { SkeletonText } from '../UI/Skeleton';

export default function FollowUpSequence({ sequence, isLoading, statusText, onGenerate }) {
  const [activeStep, setActiveStep] = useState(0);

  if (!sequence && !isLoading) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onGenerate} style={{
          width: '100%', background: 'rgba(0,212,200,0.08)', border: '1px dashed rgba(0,212,200,0.3)',
          borderRadius: 10, padding: '20px', cursor: 'pointer', color: '#00D4C8',
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
            flex: 1, background: activeStep === i ? '#1E3030' : 'transparent',
            border: `1px solid ${activeStep === i ? '#264040' : '#1E3030'}`,
            borderRadius: 8, padding: '7px 4px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: activeStep === i ? '#00D4C8' : '#4A7A78' }}>
              Day {step.day}
            </span>
            <span style={{ fontSize: 9, color: '#264040' }}>
              {i === 0 ? 'Initial' : i === 1 ? 'Follow-up' : 'Breakup'}
            </span>
          </button>
        ))}
      </div>

      {steps[activeStep] && (
        <div style={{ animation: 'fadeInUp 0.2s ease' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '8px 10px', background: '#111A1A',
            borderRadius: 6, border: '1px solid #1E3030',
          }}>
            <span style={{ fontSize: 11, color: '#4A7A78' }}>Strategy</span>
            <span style={{ fontSize: 11, color: '#8ABAB8' }}>{steps[activeStep].note}</span>
          </div>

          <div style={{ background: '#111A1A', borderRadius: 8, border: '1px solid #1E3030', padding: '12px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#E8F5F4', margin: '0 0 10px', borderBottom: '1px solid #1E3030', paddingBottom: 8 }}>
              {steps[activeStep].subject}
            </p>
            <pre style={{ fontSize: 12, color: '#C5E8E6', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontFamily: 'inherit' }}>
              {steps[activeStep].body}
            </pre>
          </div>

          <span style={{
            display: 'inline-block', marginTop: 8, fontSize: 10, color: '#00D4C8',
            background: 'rgba(0,212,200,0.08)', border: '1px solid rgba(0,212,200,0.15)',
            borderRadius: 5, padding: '2px 8px',
          }}>
            Tone: {steps[activeStep].tone}
          </span>
        </div>
      )}
    </div>
  );
}
