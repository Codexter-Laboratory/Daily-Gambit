type LoadingStateProps = {
  title: string;
  message?: string;
  rows?: number;
};

const ROW_WIDTHS = ['92%', '78%', '85%', '64%', '88%'];

/** Skeleton placeholder shown the first time a section loads. */
export function LoadingState({ title, message = 'Loading…', rows = 3 }: LoadingStateProps) {
  return (
    <div className="panel" aria-busy="true">
      <div className="panelTitle">{title}</div>
      <span className="srOnly" role="status">{message}</span>
      <div style={{ display: 'grid', gap: 12 }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton" style={{ width: ROW_WIDTHS[i % ROW_WIDTHS.length], height: 14 }} />
        ))}
      </div>
    </div>
  );
}
