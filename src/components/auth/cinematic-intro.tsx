"use client";

import { useCallback, useEffect, useState } from "react";

const VISITED_KEY = "mae-aps-cinematic-intro-2026-10";
const INTRO_DURATION_MS = 7350;

// A identidade se forma em lilás e vira branca num palco violeta,
// seguindo as duas cenas e a ordem do vídeo de referência.
// O formulário real fica montado por trás: nenhum servidor, autenticação
// ou redirecionamento depende da animação.
export function CinematicIntro() {
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(VISITED_KEY, "1");
    } catch {
      // Navegação privada pode impedir a gravação.
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(VISITED_KEY) === "1";
    } catch {
      // A intro ainda poderá ser pulada.
    }

    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(finish, INTRO_DURATION_MS);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onEscape);
    };
  }, [finish]);

  if (!visible) return null;

  return (
    <div className="mae-cinematic-cover">
      <div className="mae-cinematic-light" aria-hidden="true">
        <div className="mae-cinematic-cloud mae-cinematic-cloud-a" />
        <div className="mae-cinematic-cloud mae-cinematic-cloud-b" />
        <div className="mae-cinematic-cloud mae-cinematic-cloud-c" />
        <div className="mae-cinematic-light-logo">
          <div className="mae-cinematic-drawn-logo" />
        </div>
      </div>

      <div className="mae-cinematic-purple" aria-hidden="true">
        <div className="mae-cinematic-purple-logo" />
      </div>

      <button
        className="mae-cinematic-skip"
        type="button"
        onClick={finish}
        aria-label="Pular animação e acessar o formulário"
      >
        Pular animação <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
