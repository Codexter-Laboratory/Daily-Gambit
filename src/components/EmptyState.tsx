import { ReactNode } from 'react';
import { Panel } from './Panel';

type EmptyStateProps = {
  title: string;
  message: ReactNode;
  busy?: boolean;
};

export function EmptyState({ title, message, busy }: EmptyStateProps) {
  return (
    <Panel title={title} busy={busy}>
      <div className="muted" style={{ fontSize: 13 }}>
        {message}
      </div>
    </Panel>
  );
}
