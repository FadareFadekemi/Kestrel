export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 32px', textAlign: 'center',
      gap: 16,
    }}>
      {Icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(0,212,200,0.08)',
          border: '1px solid rgba(0,212,200,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={24} color="#00D4C8" strokeWidth={1.5} />
        </div>
      )}
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#E8F5F4', margin: 0 }}>{title}</p>
        {description && (
          <p style={{ fontSize: 13, color: '#4A7A78', marginTop: 6, maxWidth: 300, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} style={{
          background: '#00D4C8', color: '#0A0F0F', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
