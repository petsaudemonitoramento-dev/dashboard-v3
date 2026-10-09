"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Versão SVG + GSAP: 2,8 s, sem vídeo e sem dependência de assets rasterizados.
const INTRO_KEY = "mae-aps-svg-gsap-logo-completa-v2";
const MAX_INTRO_MS = 3600;

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
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      gsap.set(".mae-gsap-stage-dark", { autoAlpha: 0 });
      gsap.set(".mae-gsap-white-logo", { autoAlpha: 0, scale: 0.82 });
      gsap.set(".mae-gsap-reveal", { clipPath: "inset(0 100% 0 0)", opacity: 1 });
      gsap.set(".mae-gsap-sweep", { xPercent: -170, opacity: 0 });
      gsap.set(".mae-gsap-orb-a", { x: -38, y: -18, scale: 0.9 });
      gsap.set(".mae-gsap-orb-b", { x: 35, y: 20, scale: 0.86 });
      gsap.set(".mae-gsap-orb-c", { x: 25, y: -25 });

      intro
        .to(".mae-gsap-orb-a", { x: 26, y: 11, scale: 1.12, duration: 2.2 }, 0)
        .to(".mae-gsap-orb-b", { x: -24, y: -12, scale: 1.09, duration: 2.1 }, 0)
        .to(".mae-gsap-orb-c", { x: -17, y: 17, scale: 1.13, duration: 2.15 }, 0)
        .to(".mae-gsap-reveal", {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.15,
          ease: "power2.inOut",
        }, 0.15)
        .to(".mae-gsap-sweep", { xPercent: 510, opacity: 0.8, duration: 0.85, ease: "power2.inOut" }, 0.35)
        .to(".mae-gsap-sweep", { opacity: 0, duration: 0.18 }, 1.1)
        .fromTo(".mae-gsap-stage-dark",
          { autoAlpha: 0, scale: 1.06 },
          { autoAlpha: 1, scale: 1, duration: 0.56, ease: "power2.inOut" }, 1.25)
        .to(".mae-gsap-white-logo", { autoAlpha: 1, scale: 1, duration: 0.48, ease: "back.out(1.25)" }, 1.52)
        .to(".mae-gsap-white-logo", {
          y: () => -Math.min(110, window.innerHeight * 0.19),
          scale: 0.67,
          duration: 0.45,
          ease: "power3.inOut",
        }, 2.08)
        .to(root, { autoAlpha: 0, duration: 0.28, ease: "power2.inOut" }, 2.45)
        .call(complete, [], 2.77);
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
