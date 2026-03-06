import * as React from "react";

import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "placeholder:text-basalt-text-muted border-basalt-border-default h-9 w-full min-w-0 rounded-md border bg-basalt-elevated px-3 py-1 text-sm text-basalt-text-primary shadow-xs transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus:border-basalt-accent-violet focus:ring-1 focus:ring-basalt-accent-violet/30",
        className
      )}
      {...props}
    />
  );
}

export { Input };
