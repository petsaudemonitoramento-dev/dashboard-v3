"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Vinheta fiel à demonstração: marca progressiva, círculo roxo, logo branco,
// entrada no login. Vetorial, sem vídeo/GIF; opção Pular e reduced-motion.
const INTRO_KEY = "mae-aps-animacao-referencia-oficial-v5";
const MAX_INTRO_MS = 12400;

export function CinematicIntro({ initialPlayback = true }: { initialPlayback?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const replayRequestedRef = useRef(false);
  const [visible, setVisible] = useState(initialPlayback);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      window.sessionStorage.setItem(INTRO_KEY, "played");
    } catch {
      // Acesso ao sistema independe de sessionStorage.
    }
    setVisible(false);
  }, []);

  const replay = () => { completedRef.current = false; replayRequestedRef.current = true; setVisible(true); };

  useEffect(() => {
    if (!visible) return;
    const root = rootRef.current;
    if (!root) return;

    let played = false;
    try {
      played = window.sessionStorage.getItem(INTRO_KEY) === "played";
    } catch {
      // Navegação restrita continua permitindo pular a abertura.
    }
    const replayNow = replayRequestedRef.current;
    replayRequestedRef.current = false;
    if ((!replayNow && played) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      complete();
      return;
    }

    const ctx = gsap.context(() => {
      // Na demonstração, a vinheta começa apenas com o gradiente difuso.
      // O símbolo surge primeiro; a palavra e o subtítulo vêm em seguida.
      gsap.set(".mae-gsap-stage-dark", {
        autoAlpha: 1,
        clipPath: "circle(0% at 84% 48%)",
      });
      gsap.set(".mae-gsap-white-logo", { autoAlpha: 1, scale: 1 });
      gsap.set(".mae-gsap-reveal", {
        autoAlpha: 1,
        clipPath: "inset(0 100% 0 0)",
      });
      gsap.set(".mae-gsap-sweep", { autoAlpha: 0 });
      gsap.set(".mae-gsap-orb-a", { x: -30, y: -18, scale: 0.96 });
      gsap.set(".mae-gsap-orb-b", { x: 28, y: 13, scale: 0.96 });
      gsap.set(".mae-gsap-orb-c", { x: 11, y: -11, scale: 0.98 });

      gsap.set(".mae-gsap-flash", { autoAlpha: 0 });
      const intro = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      intro
        // Nos frames iniciais do vídeo original a marca completa surge e desaparece.
        .to(".mae-gsap-flash", { autoAlpha: 1, duration: .34 }, .67)
        .to(".mae-gsap-flash", { autoAlpha: 0, duration: .38 }, 1.26)
        // A assinatura M/AE APS é desenhada antes do nome completo.
        .to(".mae-gsap-reveal", { clipPath: "inset(0 68% 0 0)", duration: 1.36 }, 2.30)
        .to(".mae-gsap-reveal", { clipPath: "inset(0 0% 0 0)", duration: 1.88 }, 3.62)
        .to(".mae-gsap-orb-a", { x: 11, y: 9, duration: 4.9 }, 0)
        .to(".mae-gsap-orb-b", { x: -9, y: -10, duration: 4.9 }, 0)
        .to(".mae-gsap-orb-c", { x: -13, y: 6, duration: 4.9 }, 0)
        // Círculo roxo ocupa o palco, mantendo o logotipo oficial em branco.
        .to(".mae-gsap-stage-dark", {
          clipPath: "circle(155% at 84% 48%)",
          duration: 1.10,
          ease: "power2.inOut",
        }, 6.58)
        .to({}, { duration: 2.65 }, 7.68)
        .to(root, { autoAlpha: 0, duration: .65, ease: "power2.inOut" }, 10.35)
        .call(complete, [], 11.05);
    }, root);

    const fallback = window.setTimeout(complete, MAX_INTRO_MS);
    const skipWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") complete();
    };
    window.addEventListener("keydown", skipWithKeyboard);

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("keydown", skipWithKeyboard);
      ctx.revert();
    };
  }, [complete, visible]);

  if (!visible) return <button type="button" className="mae-gsap-replay" onClick={replay}>↻ Rever abertura</button>;

  return (
    <div className="mae-gsap-intro" ref={rootRef}>
      <div className="mae-gsap-stage-light" aria-hidden="true">
        <span className="mae-gsap-orb mae-gsap-orb-a" />
        <span className="mae-gsap-orb mae-gsap-orb-b" />
        <span className="mae-gsap-orb mae-gsap-orb-c" />
        <div className="mae-gsap-reveal-wrap">
          <div className="mae-gsap-flash">
            <span className="mae-gsap-logo-horizontal" />
            <span className="mae-gsap-logo-description">Monitoramento, atenção e estratégia<br/>na Atenção Primária à Saúde</span>
          </div>
          <div className="mae-gsap-reveal">
            <span className="mae-gsap-logo-horizontal" />
            <span className="mae-gsap-logo-description">Monitoramento, atenção e estratégia<br/>na Atenção Primária à Saúde</span>
          </div>
        </div>
      </div>
      <div className="mae-gsap-stage-dark" aria-hidden="true">
        <div className="mae-gsap-white-logo">
          <span className="mae-gsap-logo-horizontal" />
          <span className="mae-gsap-logo-description">Monitoramento, atenção e estratégia<br/>na Atenção Primária à Saúde</span>
        </div>
      </div>
      <button className="mae-gsap-skip" type="button" onClick={complete}>
        Pular <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
