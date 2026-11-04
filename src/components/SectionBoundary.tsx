'use client';

import { Component, type ReactNode } from 'react';
import { Panel } from './Panel';

type Props = { title: string; children: ReactNode };
type State = { failed: boolean };

/**
 * Keeps one broken section from taking the whole page down (the route's error page would
 * otherwise replace everything). The rest of the page keeps working.
 */
export class SectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Section "${this.props.title}" failed to render`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Panel title={this.props.title}>
        <div className="muted insightEmpty">
          This section hit a problem.{' '}
          <button type="button" className="btn btnGhost" onClick={() => this.setState({ failed: false })}>
            Try again
          </button>
        </div>
      </Panel>
    );
  }
}
