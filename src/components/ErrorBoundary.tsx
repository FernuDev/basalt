import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional label shown in the error card (e.g. "Table viewer") */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
        </div>

        <div className="text-center max-w-md">
          <p className="text-sm font-semibold font-sans mb-1" style={{ color: "#E8EAFF" }}>
            {this.props.label ?? "Something went wrong"}
          </p>
          <p className="text-xs font-sans mb-4" style={{ color: "#484A6E" }}>
            A rendering error occurred. The error has been logged to the console.
          </p>
          <pre
            className="text-left text-[11px] font-mono p-3 rounded-lg mb-4 overflow-auto max-h-32"
            style={{ background: "#0A0B13", border: "1px solid #282940", color: "#EF4444" }}
          >
            {error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 mx-auto px-4 py-2 text-xs font-sans rounded-lg cursor-pointer transition-colors"
            style={{ background: "#13141F", border: "1px solid #282940", color: "#8890BB" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
