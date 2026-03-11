import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-basalt-elevated border border-basalt-border-default text-basalt-text-primary shadow-lg",
          description: "text-basalt-text-secondary",
          actionButton: "bg-basalt-accent-violet text-white",
          cancelButton: "bg-basalt-overlay text-basalt-text-secondary",
          closeButton:
            "!bg-basalt-overlay !border-basalt-border-default !text-basalt-text-muted hover:!text-basalt-text-primary hover:!border-basalt-border-strong transition-colors",
          error: "!bg-basalt-accent-red/10 !border-basalt-accent-red/30 !text-basalt-accent-red",
          success: "!bg-basalt-accent-green/10 !border-basalt-accent-green/30",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
