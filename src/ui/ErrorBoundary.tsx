import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Class-based error boundary — React 19 still has no hook equivalent.
 * Wraps the 3D Canvas so a GLB 404, shader compile failure, or geometry
 * exception downgrades to a static fallback (the rest of the app — chat
 * dock, header, etc. — keeps working).
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
