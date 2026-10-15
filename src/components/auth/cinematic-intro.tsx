"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Vinheta fiel à demonstração: marca progressiva, círculo roxo, logo branco,
// entrada no login. Vetorial, sem vídeo/GIF; opção Pular e reduced-motion.
const INTRO_KEY = "mae-aps-animacao-referencia-oficial-v4";
const MAX_INTRO_MS = 9300;

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

      const intro = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      intro
        // M inicial: revelação pausada, como a escrita da marca no vídeo.
        .to(".mae-gsap-reveal", { clipPath: "inset(0 67% 0 0)", duration: 1.75 }, 0.55)
        // AE APS e linhas do nome oficial são descobertos em sequência.
        .to(".mae-gsap-reveal", { clipPath: "inset(0 0% 0 0)", duration: 1.82 }, 2.25)
        .to(".mae-gsap-orb-a", { x: 11, y: 9, duration: 4.0 }, 0)
        .to(".mae-gsap-orb-b", { x: -9, y: -10, duration: 4.0 }, 0)
        .to(".mae-gsap-orb-c", { x: -13, y: 6, duration: 4.0 }, 0)
        // Wipe circular roxo, preservando a marca branca em destaque.
        .to(".mae-gsap-stage-dark", {
          clipPath: "circle(155% at 84% 48%)",
          duration: 1.08,
          ease: "power2.inOut",
        }, 4.65)
        // Hold do símbolo branco (sem câmera girando ou zoom artificial).
        .to({}, { duration: 1.35 }, 5.73)
        // A vinheta desaparece e revela o login fiel à composição.
        .to(root, { autoAlpha: 0, duration: 0.68, ease: "power2.inOut" }, 7.08)
        .call(complete, [], 7.79);
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
          <span className="mae-gsap-reveal" />
          <span className="mae-gsap-sweep" />
        </div>
      </div>
      <div className="mae-gsap-stage-dark" aria-hidden="true">
        <span className="mae-gsap-white-logo" />
      </div>
      <button className="mae-gsap-skip" type="button" onClick={complete}>
        Pular <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
