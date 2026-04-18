import { useState } from 'react';
import { Plus, Calendar, Copy, Trash2, ChevronDown, ChevronRight, Users } from 'lucide-react';
import EmptyState from '../components/UI/EmptyState';

const DEFAULT_SEQUENCE = {
  name: 'New Sequence',
  steps: [
    { day: 0,  tone: 'Consultative', subject: '',  body: '',  note: 'Initial outreach' },
    { day: 3,  tone: 'Consultative', subject: '',  body: '',  note: 'Follow-up with new angle' },
    { day: 7,  tone: 'Casual',       subject: '',  body: '',  note: 'Breakup email' },
  ],
};

const TONES = ['Consultative', 'Formal', 'Casual', 'Aggressive'];

export default function SequencesPage({ leads }) {
  const [sequences, setSequences] = useState(() => {
    // Build sequences from leads that have follow-up sequences
    const built = [];
    leads.forEach(lead => {
      if (lead.sequences?.length > 0) {
        lead.sequences.forEach(seq => built.push({ ...seq, leadName: lead.company }));
      }
    });
    return built;
  });
  const [selected,    setSelected]    = useState(null);
  const [activeStep,  setActiveStep]  = useState(0);
  const [expanded,    setExpanded]    = useState({});

  const createSequence = () => {
    const seq = { ...DEFAULT_SEQUENCE, id: Date.now(), name: 'Untitled Sequence', steps: DEFAULT_SEQUENCE.steps.map(s => ({ ...s })) };
    setSequences(prev => [...prev, seq]);
    setSelected(seq);
    setActiveStep(0);
  };

  const updateStep = (stepIdx, field, value) => {
    setSelected(prev => {
      const steps = prev.steps.map((s, i) => i === stepIdx ? { ...s, [field]: value } : s);
      const updated = { ...prev, steps };
      setSequences(seqs => seqs.map(s => s.id === updated.id ? updated : s));
      return updated;
    });
  };

  const deleteSequence = (id) => {
    setSequences(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const duplicateSequence = (seq) => {
    const copy = { ...seq, id: Date.now(), name: `${seq.name} (copy)`, steps: seq.steps.map(s => ({ ...s })) };
    setSequences(prev => [...prev, copy]);
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* List */}
      <div style={{ width: 300, borderRight: '1px solid #1E3030', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1E3030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E8F5F4', margin: 0 }}>Sequences</h2>
          <button onClick={createSequence} style={{ background: '#00D4C8', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#0A0F0F' }}>
            <Plus size={13} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sequences.length === 0 ? (
            <EmptyState icon={Calendar} title="No sequences yet" description="Create a sequence to manage multi-touch outreach." action={{ label: 'Create Sequence', onClick: createSequence }} />
          ) : (
            sequences.map(seq => (
              <div
                key={seq.id}
                onClick={() => { setSelected(seq); setActiveStep(0); }}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #1c1c1e', cursor: 'pointer',
                  background: selected?.id === seq.id ? 'rgba(0,212,200,0.05)' : 'transparent',
                  borderLeft: selected?.id === seq.id ? '2px solid #00D4C8' : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#E8F5F4', margin: '0 0 3px' }}>{seq.name}</p>
                    <p style={{ fontSize: 11, color: '#4A7A78', margin: 0 }}>{seq.steps?.length || 3} steps · {seq.leadName || 'Template'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <IconBtn icon={<Copy size={11} />} onClick={() => duplicateSequence(seq)} />
                    <IconBtn icon={<Trash2 size={11} />} onClick={() => deleteSequence(seq.id)} danger />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Name */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #1E3030', flexShrink: 0 }}>
            <input
              value={selected.name}
              onChange={e => {
                const updated = { ...selected, name: e.target.value };
                setSelected(updated);
                setSequences(prev => prev.map(s => s.id === updated.id ? updated : s));
              }}
              style={{ fontSize: 18, fontWeight: 700, color: '#E8F5F4', background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
            />
            {selected.leadName && <p style={{ fontSize: 12, color: '#4A7A78', margin: '2px 0 0' }}>Assigned to: {selected.leadName}</p>}
          </div>

          {/* Steps */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {selected.steps.map((step, i) => (
                <button key={i} onClick={() => setActiveStep(i)} style={{
                  flex: 1, background: activeStep === i ? '#1E3030' : 'transparent',
                  border: `1px solid ${activeStep === i ? '#264040' : '#1E3030'}`,
                  borderRadius: 8, padding: '10px 6px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: activeStep === i ? '#00D4C8' : '#4A7A78' }}>Day {step.day}</span>
                  <span style={{ fontSize: 10, color: '#264040' }}>{step.note}</span>
                </button>
              ))}
            </div>

            {selected.steps[activeStep] && (
              <div style={{ animation: 'fadeInUp 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: '#4A7A78', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Day</label>
                  <input type="number" value={selected.steps[activeStep].day}
                    onChange={e => updateStep(activeStep, 'day', parseInt(e.target.value))}
                    style={{ width: 60, background: '#1E3030', border: '1px solid #264040', borderRadius: 6, padding: '5px 8px', color: '#E8F5F4', fontSize: 12, outline: 'none' }} />
                  <label style={{ fontSize: 11, color: '#4A7A78', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tone</label>
                  <select value={selected.steps[activeStep].tone}
                    onChange={e => updateStep(activeStep, 'tone', e.target.value)}
                    style={{ background: '#1E3030', border: '1px solid #264040', borderRadius: 6, padding: '5px 10px', color: '#C5E8E6', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject</label>
                  <input value={selected.steps[activeStep].subject}
                    onChange={e => updateStep(activeStep, 'subject', e.target.value)}
                    placeholder="Email subject line..."
                    style={{ width: '100%', background: '#111A1A', border: '1px solid #1E3030', borderRadius: 8, padding: '8px 12px', color: '#E8F5F4', fontSize: 13, outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#4A7A78', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Body</label>
                  <textarea value={selected.steps[activeStep].body}
                    onChange={e => updateStep(activeStep, 'body', e.target.value)}
                    placeholder="Email body... Use {{firstName}} and {{senderName}} as placeholders."
                    rows={14}
                    style={{ width: '100%', background: '#111A1A', border: '1px solid #1E3030', borderRadius: 8, padding: '12px', color: '#C5E8E6', fontSize: 13, lineHeight: 1.7, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState icon={Calendar} title="Select a sequence" description="Choose a sequence from the list or create a new one." action={{ label: 'Create Sequence', onClick: createSequence }} />
        </div>
      )}
    </div>
  );
}

function IconBtn({ icon, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#ef4444' : '#4A7A78', padding: 4, display: 'flex', borderRadius: 4 }}>
      {icon}
    </button>
  );
}
