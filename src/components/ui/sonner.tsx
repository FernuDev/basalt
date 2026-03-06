import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-basalt-elevated border border-basalt-border-default text-basalt-text-primary shadow-lg",
          description: "text-basalt-text-secondary",
          actionButton: "bg-basalt-accent-violet text-white",
          cancelButton: "bg-basalt-overlay text-basalt-text-secondary",
          error: "!bg-basalt-accent-red/10 !border-basalt-accent-red/30 !text-basalt-accent-red",
          success: "!bg-basalt-accent-green/10 !border-basalt-accent-green/30",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
