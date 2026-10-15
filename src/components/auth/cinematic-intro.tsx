"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// Vinheta MAE APS com 5s: flash, pausa, desenho do símbolo,
// aparição independente do subtítulo, wipe circular a partir da direita,
// logo branco no roxo e entrada na tela de login.
// Sem vídeo ou GIF, com Pular/Escape e respeito a movimento reduzido.
const INTRO_KEY = "mae-aps-animacao-referencia-oficial-v7-5s";
const INTRO_DURATION_MS = 5000;
const FALLBACK_MS = 5600;

function BrandTagline({ className = "" }: { className?: string }) {
  return (
    <span className={`mae-gsap-logo-description ${className}`}>
      Monitoramento, atenção e estratégia<br />na Atenção Primária à Saúde
    </span>
  );
}

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
      // A página continua acessível quando o storage está bloqueado.
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
      // Sem bloqueios de navegação em navegadores com storage restrito.
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
        clipPath: "circle(0% at 84% 48%)",
      });
      gsap.set(".mae-gsap-flash", { autoAlpha: 0 });
      gsap.set(".mae-gsap-reveal", {
        autoAlpha: 1,
        clipPath: "inset(0 100% 0 0)",
      });
      // O texto NÃO está dentro do elemento recortado pelo desenho do símbolo.
      // Isso elimina a faixa que escondia "Monitoramento".
      gsap.set(".mae-gsap-tagline-light", { autoAlpha: 0, y: 6 });
      gsap.set(".mae-gsap-white-logo", { autoAlpha: 1 });

      gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: complete,
      })
        // 0.12–1.03: breve flash da assinatura inteira e pequena pausa.
        .to(".mae-gsap-flash", { autoAlpha: 1, duration: 0.27, ease: "power1.out" }, 0.12)
        .to(".mae-gsap-flash", { autoAlpha: 0, duration: 0.36 }, 0.67)
        // 1.12–2.38: desenho progressivo da marca.
        .to(".mae-gsap-reveal", {
          clipPath: "inset(0 0% 0 0)", duration: 1.26, ease: "power2.inOut",
        }, 1.12)
        // 2.08–2.53: subtítulo nasce inteiro, sem sofrer recorte.
        .to(".mae-gsap-tagline-light", {
          autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out",
        }, 2.08)
        // 2.66–3.86: círculo roxo se expande a partir da direita.
        // A marca branca está DENTRO do mesmo recorte e nunca fica roxa no roxo.
        .to(".mae-gsap-stage-dark", {
          clipPath: "circle(170% at 84% 48%)",
          duration: 1.20,
          ease: "power2.inOut",
        }, 2.66)
        // 3.86–4.50: sustentação do logo em branco e fundo roxo.
        .to({}, { duration: 0.64 }, 3.86)
        // 4.50–5.00: revelação da tela de login.
        .to(root, { autoAlpha: 0, duration: 0.50 }, 4.50);
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
      className="mae-gsap-intro mae-gsap-intro-v6 mae-gsap-intro-v7"
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
          <div className="mae-gsap-flash">
            <span className="mae-gsap-official-logo" />
            <BrandTagline />
          </div>
          <div className="mae-gsap-reveal">
            <span className="mae-gsap-official-logo" />
          </div>
          <BrandTagline className="mae-gsap-tagline-light" />
        </div>
      </div>
      <div className="mae-gsap-stage-dark" aria-hidden="true">
        <div className="mae-gsap-white-logo">
          <span className="mae-gsap-official-logo" />
          <BrandTagline />
        </div>
      </div>
      <button className="mae-gsap-skip" type="button" onClick={complete}>
        Pular <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
