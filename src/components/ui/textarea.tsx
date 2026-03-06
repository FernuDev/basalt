import * as React from "react";

import { cn } from "../../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-basalt-border-default placeholder:text-basalt-text-muted flex min-h-16 w-full rounded-md border bg-basalt-elevated px-3 py-2 text-sm text-basalt-text-primary shadow-xs transition-colors outline-none focus:border-basalt-accent-violet focus:ring-1 focus:ring-basalt-accent-violet/30 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
