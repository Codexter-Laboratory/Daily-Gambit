type LoadingStateProps = {
  title: string;
  message?: string;
};

export function LoadingState({ title, message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="panel" aria-busy="true">
      <div className="panelTitle">{title}</div>
      <span className="srOnly">{message}</span>
      <div style={{ display: 'grid', gap: 8 }}>
        <div className="skeleton" style={{ width: '70%' }} />
        <div className="skeleton" style={{ width: '45%' }} />
      </div>
    </div>
  );
}
