"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Abertura MAE APS · SVG unificado · 6 segundos de duração.
 // O símbolo e a assinatura são uma única arte e nunca sobrepõem-se.
 // Somente um opt-out explícito suprime a animação; visitas anteriores não.
const INTRO_SKIP_KEY = "mae-aps-intro-skip";
 const INTRO_DURATION_MS = 6000;
 const FALLBACK_MS = 6600;

export function CinematicIntro({ initialPlayback = true }: { initialPlayback?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const replayRequestedRef = useRef(false);
  const [visible, setVisible] = useState(initialPlayback);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setVisible(false);
  }, []);

  const replay = () => {
    completedRef.current = false;
    replayRequestedRef.current = true;
    setVisible(true);
  };

  useEffect(() => {
    if (!visible) return;
    const root = rootRef.current;
    if (!root) return;

    let skipRequested = false;
    try {
      skipRequested = window.sessionStorage.getItem(INTRO_SKIP_KEY) === "true";
    } catch {
      // Sem bloqueios de navegação em navegadores com storage restrito.
    }
    const replayNow = replayRequestedRef.current;
    replayRequestedRef.current = false;
    if ((!replayNow && skipRequested) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      complete();
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(root, { autoAlpha: 1 });
      gsap.set(".mae-gsap-stage-dark", {
        autoAlpha: 1,
        clipPath: "circle(0% at 84% 48%)",
      });
      gsap.set(".mae-gsap-flash", { autoAlpha: 0 });
      gsap.set(".mae-gsap-reveal", {
        autoAlpha: 1,
        clipPath: "inset(0 100% 0 0)",
      });
      gsap.set(".mae-gsap-white-logo", { autoAlpha: 1 });

      gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: complete,
      })
        // Pequeno flash → revelação do SVG inteiro → expansão roxa
        // da direita → marca branca legível → saída suave. Total: 6s.
        .to(".mae-gsap-flash", { autoAlpha: 1, duration: 0.32, ease: "power1.out" }, 0.15)
        .to(".mae-gsap-flash", { autoAlpha: 0, duration: 0.35 }, 0.65)
        .to(".mae-gsap-reveal", {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.85,
          ease: "power2.inOut",
        }, 1.15)
        .to(".mae-gsap-stage-dark", {
          clipPath: "circle(170% at 84% 48%)",
          duration: 1.3,
          ease: "power2.inOut",
        }, 3.25)
        .to({}, { duration: 0.95 }, 4.55)
        .to(root, { autoAlpha: 0, duration: 0.50 }, 5.50);
    }, root);

    const fallback = window.setTimeout(complete, FALLBACK_MS);
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

  if (!visible) {
    return <button type="button" className="mae-gsap-replay" onClick={replay}>↻ Rever abertura</button>;
  }

  return (
    <div
      className="mae-gsap-intro mae-gsap-intro-v6 mae-gsap-intro-v7 mae-gsap-intro-v8"
      ref={rootRef}
      data-intro-duration-ms={INTRO_DURATION_MS}
      role="region"
      aria-label="Abertura visual do MAE APS; pressione Escape para pular"
    >
      <div className="mae-gsap-stage-light" aria-hidden="true">
        <span className="mae-gsap-orb mae-gsap-orb-a" />
        <span className="mae-gsap-orb mae-gsap-orb-b" />
        <span className="mae-gsap-orb mae-gsap-orb-c" />
        <div className="mae-gsap-reveal-wrap">
          <div className="mae-gsap-flash"><span className="mae-gsap-official-logo" /></div>
          <div className="mae-gsap-reveal">
            <span className="mae-gsap-official-logo" />
          </div>
        </div>
      </div>
      <div className="mae-gsap-stage-dark" aria-hidden="true">
        <div className="mae-gsap-white-logo">
          <span className="mae-gsap-official-logo" />
        </div>
      </div>
      <button className="mae-gsap-skip" type="button" onClick={complete}>
        Pular <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
