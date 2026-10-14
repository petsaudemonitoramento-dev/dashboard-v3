"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MotionRibbons } from "@/components/auth/motion-ribbons";

// Abertura original em SVG + GSAP, sem vídeo/GIF. Não impede acessar o login.
const INTRO_KEY = "mae-aps-animacao-organica-oficial-v3";
const MAX_INTRO_MS = 3900;

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
      gsap.set(".mae-gsap-white-logo", { autoAlpha: 0, scale: 0.88 });
      gsap.set(".mae-gsap-reveal", { clipPath: "inset(0 100% 0 0)", opacity: 1 });
      gsap.set(".mae-gsap-sweep", { xPercent: -170, opacity: 0 });
      gsap.set(".mae-gsap-orb-a", { x: -38, y: -18, scale: 0.9 });
      gsap.set(".mae-gsap-orb-b", { x: 35, y: 20, scale: 0.86 });
      gsap.set(".mae-gsap-orb-c", { x: 25, y: -25 });

      intro
        .fromTo(".mae-motion-ribbons-intro .mae-ribbon",
          { opacity: 0, scale: 0.93 },
          { opacity: 0.83, scale: 1, stagger: 0.12, duration: 0.62, ease: "power2.out" }, 0)
        .to(".mae-gsap-orb-a", { x: 26, y: 11, scale: 1.12, duration: 2.25 }, 0)
        .to(".mae-gsap-orb-b", { x: -24, y: -12, scale: 1.09, duration: 2.15 }, 0)
        .to(".mae-gsap-orb-c", { x: -17, y: 17, scale: 1.13, duration: 2.2 }, 0)
        .to(".mae-gsap-reveal", {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.14,
          ease: "power2.inOut",
        }, 0.2)
        .to(".mae-gsap-sweep", { xPercent: 500, opacity: 0.55, duration: 0.85, ease: "power2.inOut" }, 0.39)
        .to(".mae-gsap-sweep", { opacity: 0, duration: 0.14 }, 1.18)
        .fromTo(".mae-gsap-stage-dark",
          { autoAlpha: 0, scale: 1.03 },
          { autoAlpha: 1, scale: 1, duration: 0.55, ease: "power2.inOut" }, 1.32)
        .to(".mae-gsap-white-logo", { autoAlpha: 1, scale: 1, duration: 0.53, ease: "power2.out" }, 1.56)
        .to(".mae-gsap-white-logo", {
          y: () => -Math.min(85, window.innerHeight * 0.14),
          scale: 0.83,
          duration: 0.42,
          ease: "power2.inOut",
        }, 2.22)
        .to(root, { autoAlpha: 0, duration: 0.37, ease: "power2.inOut" }, 2.50)
        .call(complete, [], 2.89);
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
        <MotionRibbons intro />
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
