"use client";

import { useEffect, useState } from "react";

export function SystemStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSystem = async () => {
      if (!window.navigator.onLine) {
        if (active) setOnline(false);
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);

      try {
        const response = await fetch("/api/status", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (active) setOnline(response.ok);
      } catch {
        if (active) setOnline(false);
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const handleOnline = () => void checkSystem();
    const handleOffline = () => {
      if (active) setOnline(false);
    };

    void checkSystem();
    const interval = window.setInterval(checkSystem, 30_000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <span
      className={online ? "auth-system-status is-online" : "auth-system-status is-offline"}
      aria-live="polite"
      aria-atomic="true"
      title="Disponibilidade do MAE APS"
    >
      <i aria-hidden="true" />
      Sistema {online ? "online" : "offline"}
    </span>
  );
}
