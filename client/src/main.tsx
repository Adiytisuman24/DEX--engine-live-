import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
       return (
         <div style={{padding: '2rem', color: '#ef4444', fontFamily: 'monospace'}}>
           <h1>Application Error</h1>
           <pre style={{whiteSpace: 'pre-wrap'}}>{this.state.error?.toString()}</pre>
           <p>Check console for more details.</p>
         </div>
       );
    }
    return this.props.children;
  }
}

console.log('Main.tsx executing - With ErrorBoundary');
const root = document.getElementById('root');

if (!root) {
  console.error("Root element not found!");
} else {
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
      </StrictMode>,
    );
}
