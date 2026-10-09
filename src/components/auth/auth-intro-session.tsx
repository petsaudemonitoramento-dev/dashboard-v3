"use client";

import { useEffect } from "react";

// Apenas um controlador opcional da introdução visual; o login não depende dele.
const INTRO_SESSION_KEY = "mae-aps-auth-intro-v1";

export function AuthIntroSession() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      if (window.sessionStorage.getItem(INTRO_SESSION_KEY)) return;
      window.sessionStorage.setItem(INTRO_SESSION_KEY, "played");
    } catch {
      // Armazenamento indisponível: a página continua funcional.
    }

    document.documentElement.classList.add("mae-auth-intro-playing");
    const timeout = window.setTimeout(() => {
      document.documentElement.classList.remove("mae-auth-intro-playing");
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
      document.documentElement.classList.remove("mae-auth-intro-playing");
    };
  }, []);

  return null;
}
