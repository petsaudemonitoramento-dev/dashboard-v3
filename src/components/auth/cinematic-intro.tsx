"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VISITED_KEY = "mae-aps-cinematic-video-v1";
const FALLBACK_TIMEOUT_MS = 11100;

// Reprodução do próprio vídeo enviado (WebM + MP4) com fallback vetorial.
// Sem bibliotecas de animação e sem interferir nas rotinas de autenticação.
export function CinematicIntro() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const finishing = useRef(false);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;

    try {
      window.sessionStorage.setItem(VISITED_KEY, "1");
    } catch {
      // O site continua funcional com armazenamento bloqueado.
    }

    setClosing(true);
    window.setTimeout(() => setVisible(false), 420);
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(VISITED_KEY) === "1";
    } catch {
      // Sem acesso ao storage, o vídeo continua podendo ser pulado.
    }

    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }

    const fallback = window.setTimeout(finish, FALLBACK_TIMEOUT_MS);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("keydown", onEscape);
    };
  }, [finish]);

  if (!visible) return null;

  return (
    <div className={`mae-cinematic-cover mae-cinematic-video-cover${closing ? " is-ending" : ""}`}>
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

      <video
        className="mae-cinematic-video"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={finish}
        onError={finish}
      >
        <source src="/media/mae-aps-abertura.webm" type="video/webm" />
        <source src="/media/mae-aps-abertura.mp4" type="video/mp4" />
      </video>

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
