// src/components/ErrorBoundary.js
import React from "react";

/**
 * Simple ErrorBoundary that renders a friendly overlay with the error and stack.
 * This complements the window.onerror handler and will catch render-time errors.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, info: null };
  }

  componentDidCatch(error, info) {
    // store stack for display
    this.setState({ error, info: info && info.componentStack ? info.componentStack : null });
    // also log
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      const errText = String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error);
      const infoText = this.state.info ? `\nComponent stack:\n${this.state.info}` : "";
      return (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          background: "rgba(0,0,0,0.45)"
        }}>
          <div style={{
            width: "min(980px, 96%)",
            maxHeight: "90vh",
            overflow: "auto",
            background: "#fff4f4",
            color: "#7a0000",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            padding: 18,
            fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial"
          }}>
            <h2 style={{ marginTop: 0 }}>Application error</h2>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {errText}
              {infoText}
            </div>
            <div style={{ marginTop: 12 }}>
              Try reloading the page. If the problem persists, copy the error text and send it to support.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
