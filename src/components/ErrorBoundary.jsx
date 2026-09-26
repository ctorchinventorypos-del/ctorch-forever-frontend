// ============================================================
//  ErrorBoundary: catches any render error in a page so the whole
//  app never goes blank white. Shows a friendly card with a reload.
// ============================================================
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { try { console.error('Page error:', error, info); } catch (_) {} }
  reset = () => { this.setState({ error: null }); };

  render() {
    if (this.state.error) {
      return (
        <div className="card card-pad" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>😕</div>
          <h2 style={{ marginBottom: 6 }}>Something went wrong on this screen</h2>
          <p className="subtle" style={{ marginBottom: 16 }}>
            The rest of the app is fine. Try again, or reload the page.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
            <button className="btn btn-ghost" onClick={this.reset}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
