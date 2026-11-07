import type { ReactNode } from 'react';

/**
 * A table that scrolls sideways on narrow screens. The wrapper is focusable and named, so
 * keyboard users can scroll it too.
 */
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="anTableWrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
