'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@kitchenflow/ui';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-surface p-6 text-ink">
        <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6">
          <p className="text-sm font-bold uppercase tracking-wide text-royal">Something went wrong</p>
          <h1 className="mt-2 text-2xl font-black">The dashboard hit an unexpected state.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Reload the view and try the action again.</p>
          <Button className="mt-5" onClick={() => this.setState({ hasError: false })}>
            Retry
          </Button>
        </div>
      </main>
    );
  }
}
