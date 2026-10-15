"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// PR #19 · Vinheta nativa de cinco segundos.
// A marca oficial é um único SVG: inclusive o subtítulo, sem sobreposição
// de texto, quebra de linha artificial ou recortes na troca de contraste.
const INTRO_KEY = "mae-aps-animacao-referencia-oficial-v6-5s";
const INTRO_DURATION_MS = 5000;
const FALLBACK_MS = 5500;

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
      // Falha de storage não bloqueia o formulário.
    }
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

    let played = false;
    try {
      played = window.sessionStorage.getItem(INTRO_KEY) === "played";
    } catch {
      // Navegação sem armazenamento continua possível.
    }
    const replayNow = replayRequestedRef.current;
    replayRequestedRef.current = false;
    if ((!replayNow && played) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      complete();
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(root, { autoAlpha: 1 });
      gsap.set(".mae-gsap-stage-dark", {
        autoAlpha: 1,
        clipPath: "circle(0% at 50% 50%)",
      });
      gsap.set(".mae-gsap-flash", { autoAlpha: 0 });
      gsap.set(".mae-gsap-reveal", {
        autoAlpha: 1,
        clipPath: "inset(0 100% 0 0)",
      });
      gsap.set(".mae-gsap-white-logo", { autoAlpha: 1 });

      // Tempos absolutos (s): flash 0,20–0,83; traçado 1,0–2,65;
      // expansão roxa 2,65–3,73; sustentação 3,73–4,55;
      // saída para o formulário 4,55–5,0.
      gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: complete,
      })
        .to(".mae-gsap-flash", { autoAlpha: 1, duration: 0.23, ease: "power1.out" }, 0.20)
        .to(".mae-gsap-flash", { autoAlpha: 0, duration: 0.32 }, 0.51)
        .to(".mae-gsap-reveal", { clipPath: "inset(0 0% 0 0)", duration: 1.65, ease: "power2.inOut" }, 1.0)
        .to(".mae-gsap-stage-dark", {
          clipPath: "circle(145% at 50% 50%)",
          duration: 1.08,
          ease: "power2.inOut",
        }, 2.65)
        .to({}, { duration: 0.82 }, 3.73)
        .to(root, { autoAlpha: 0, duration: 0.45, ease: "power2.inOut" }, 4.55);
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
    <div className="mae-gsap-intro mae-gsap-intro-v6" ref={rootRef}
      data-intro-duration-ms={INTRO_DURATION_MS}
      role="region" aria-label="Abertura visual do MAE APS; pressione Escape para pular">
      <div className="mae-gsap-stage-light" aria-hidden="true">
        <span className="mae-gsap-orb mae-gsap-orb-a" />
        <span className="mae-gsap-orb mae-gsap-orb-b" />
        <span className="mae-gsap-orb mae-gsap-orb-c" />
        <div className="mae-gsap-reveal-wrap">
          <div className="mae-gsap-flash"><span className="mae-gsap-official-logo" /><span className="mae-gsap-logo-description">Monitoramento, atenção e estratégia<br />na Atenção Primária à Saúde</span></div>
          <div className="mae-gsap-reveal"><span className="mae-gsap-official-logo" /><span className="mae-gsap-logo-description">Monitoramento, atenção e estratégia<br />na Atenção Primária à Saúde</span></div>
        </div>
      </div>
      <div className="mae-gsap-stage-dark" aria-hidden="true">
        <div className="mae-gsap-white-logo">
          <span className="mae-gsap-official-logo" />
          <span className="mae-gsap-logo-description">Monitoramento, atenção e estratégia<br />na Atenção Primária à Saúde</span>
        </div>
      </div>
      <button className="mae-gsap-skip" type="button" onClick={complete}>
        Pular <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
