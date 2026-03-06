"use client";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/mock-data";

interface StatusDotProps {
  status: ConnectionStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        status === "connected"  && "bg-[var(--accent-green)] dot-connected",
        status === "connecting" && "bg-[var(--accent-amber)] dot-connecting",
        status === "idle"       && "bg-[var(--text-muted)]",
        status === "error"      && "bg-[var(--accent-red)]",
        className
      )}
    />
  );
}
