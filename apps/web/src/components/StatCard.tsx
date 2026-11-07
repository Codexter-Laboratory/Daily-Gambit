import { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
};

export function StatCard({ label, value, children }: StatCardProps) {
  return (
    <div className="statCard">
      <div className="statLabel">{label}</div>
      {value != null ? <div className="statValue">{value}</div> : null}
      {children ? (
        <div className="muted" style={{ fontSize: 12 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
