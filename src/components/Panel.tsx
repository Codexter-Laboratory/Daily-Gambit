import { ReactNode } from 'react';

type PanelProps = {
  title?: ReactNode;
  /** Data is refreshing: keep the content visible but dimmed, with a progress bar. */
  busy?: boolean;
  children: ReactNode;
};

export function Panel({ title, busy = false, children }: PanelProps) {
  return (
    <div className={busy ? 'panel panelBusy' : 'panel'} aria-busy={busy}>
      {title ? <div className="panelTitle">{title}</div> : null}
      <div className="panelBody">{children}</div>
    </div>
  );
}
