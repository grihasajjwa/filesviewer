import { Component, ReactNode, ErrorInfo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: unknown;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6 bg-card border-border shadow-sm">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertTriangle className="w-12 h-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Preview failed to load</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Something went wrong while loading the file viewer. You can retry or select another file.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <Button onClick={this.handleReset} className="w-full sm:w-auto">
                  Retry preview
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
