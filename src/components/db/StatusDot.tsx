import { cn } from "../../lib/utils";
import type { ConnectionStatus } from "../../lib/types";

interface StatusDotProps {
  status: ConnectionStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        status === "connected" && "bg-basalt-accent-green",
        status === "connecting" && "bg-basalt-accent-amber animate-pulse",
        status === "idle" && "bg-basalt-text-muted",
        status === "error" && "bg-basalt-accent-red",
        className
      )}
    />
  );
}
