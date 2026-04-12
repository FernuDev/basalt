import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export function useAutoUpdater() {
  useEffect(() => {
    // Delay past the 2500ms splash screen so the toast doesn't appear during fade-out
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (!update?.available) return;

        toast.message(`Update available — v${update.version}`, {
          description: "A new version of Basalt is ready to install.",
          duration: Infinity,
          action: {
            label: "Install & Restart",
            onClick: async () => {
              try {
                await update.downloadAndInstall();
                await relaunch();
              } catch {
                toast.error("Update failed. Please restart and try again.");
              }
            },
          },
        });
      } catch {
        // Silently swallow: offline, endpoint unreachable, no update available
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
}
