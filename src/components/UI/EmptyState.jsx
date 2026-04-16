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
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={24} color="#f59e0b" strokeWidth={1.5} />
        </div>
      )}
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#f4f4f5', margin: 0 }}>{title}</p>
        {description && (
          <p style={{ fontSize: 13, color: '#52525b', marginTop: 6, maxWidth: 300, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} style={{
          background: '#f59e0b', color: '#09090b', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer',
        }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
