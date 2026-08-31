import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean };

/** QA-only diagnostic boundary for admin lesson edit — logs safe error metadata. */
export class AdminLessonEditErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("[admin-lesson-edit]", error?.name, error?.message, error?.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          This lesson editor failed to render. Check the browser console for [admin-lesson-edit] details.
        </div>
      );
    }
    return this.props.children;
  }
}
