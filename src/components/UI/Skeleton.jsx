export function SkeletonLine({ width = '100%', height = 14, style = {} }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />
  );
}

export function SkeletonBlock({ height = 80, style = {} }) {
  return (
    <div className="skeleton" style={{ width: '100%', height, borderRadius: 8, ...style }} />
  );
}

export function SkeletonText({ lines = 3, style = {} }) {
  const widths = ['100%', '85%', '70%', '90%', '60%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}
