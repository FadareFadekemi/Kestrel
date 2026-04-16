import { Search, User, Mail, Database, CheckCircle, Circle, Loader } from 'lucide-react';

const AGENTS = [
  { key: 'research', label: 'Research Agent', sub: 'Company intelligence', icon: Search },
  { key: 'profiling', label: 'Profiling Agent', sub: 'Lead scoring', icon: User },
  { key: 'email', label: 'Email Writer', sub: 'Personalized draft', icon: Mail },
  { key: 'tracker', label: 'Tracker Agent', sub: 'Score & log lead', icon: Database },
];

export default function AgentSidebar({ agentStates }) {
  return (
    <div style={{
      width: 220, flexShrink: 0, padding: '24px 16px',
      borderRight: '1px solid #27272a', minHeight: '100%',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#52525b', letterSpacing: '0.8px', marginBottom: 16, paddingLeft: 4 }}>
        PIPELINE
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {AGENTS.map((agent, i) => {
          const state = agentStates[agent.key] || 'idle';
          const isRunning = state === 'running';
          const isDone = state === 'done';
          const isIdle = state === 'idle';

          const iconColor = isDone ? '#f59e0b' : isRunning ? '#60a5fa' : '#3f3f46';
          const labelColor = isDone ? '#f4f4f5' : isRunning ? '#f4f4f5' : '#71717a';

          return (
            <div key={agent.key} style={{ position: 'relative' }}>
              {/* Connector line */}
              {i < AGENTS.length - 1 && (
                <div style={{
                  position: 'absolute', left: 22, top: 44, width: 1, height: 12,
                  background: isDone ? '#f59e0b' : '#27272a',
                  transition: 'background 0.3s',
                  zIndex: 0,
                }} />
              )}

              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: isRunning ? 'rgba(96,165,250,0.06)' : isDone ? 'rgba(245,158,11,0.06)' : 'transparent',
                border: `1px solid ${isRunning ? 'rgba(96,165,250,0.15)' : isDone ? 'rgba(245,158,11,0.15)' : 'transparent'}`,
                transition: 'all 0.25s ease',
                position: 'relative', zIndex: 1,
              }}>
                {/* Status icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isDone ? 'rgba(245,158,11,0.12)' : isRunning ? 'rgba(96,165,250,0.1)' : '#1c1c1e',
                  border: `1px solid ${isDone ? 'rgba(245,158,11,0.25)' : isRunning ? 'rgba(96,165,250,0.2)' : '#27272a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s ease',
                }}>
                  {isRunning ? (
                    <Loader size={14} color="#60a5fa" className="animate-spin-icon" />
                  ) : isDone ? (
                    <CheckCircle size={14} color="#f59e0b" />
                  ) : (
                    <agent.icon size={14} color={iconColor} />
                  )}
                </div>

                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: labelColor, margin: 0, transition: 'color 0.2s' }}>
                    {agent.label}
                  </p>
                  <p style={{ fontSize: 10, color: '#52525b', margin: 0 }}>{agent.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <div style={{ marginTop: 24, padding: '12px', background: '#18181b', borderRadius: 8, border: '1px solid #27272a' }}>
        <p style={{ fontSize: 10, color: '#52525b', margin: 0 }}>
          {Object.values(agentStates).every(s => s === 'idle')
            ? 'Enter a company to begin'
            : Object.values(agentStates).some(s => s === 'running')
            ? 'Pipeline running...'
            : Object.values(agentStates).every(s => s === 'done')
            ? 'All agents complete'
            : 'Processing...'}
        </p>
      </div>
    </div>
  );
}
