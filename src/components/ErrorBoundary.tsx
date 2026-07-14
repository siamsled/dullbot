'use client';
import React from 'react';
export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Error caught by boundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-red-500 font-mono text-sm bg-red-50 border border-red-200">
        <h2 className="text-xl font-bold mb-4">React Error</h2>
        <pre>{this.state.error?.toString()}</pre>
        <pre className="mt-4">{this.state.error?.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}
