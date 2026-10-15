/**
 * Ornamentos vetoriais do login MAE APS.
 *
 * Curva laranja: silhueta traçada diretamente da referência desktop
 * de 1440 × 1024, preservando a interseção superior e a volta arredondada.
 * A proporção acompanha a área do login, sem aplicar rotações ou
 * translações arbitrárias que fragmentem a curva.
 * As curvas roxas continuam vindas da marca original do projeto.
 */
export function MotionRibbons() {
  return (
    <div className="mae-motion-ribbons" aria-hidden="true">
      <svg
        className="mae-ribbon mae-ribbon-orange"
        viewBox="0 0 1440 970"
        preserveAspectRatio="none"
        fill="none"
        focusable="false"
        data-reference-geometry="1440x1024"
      >
        <path
          d="M244 57 L263 95 L294 141 L325 175 L342 189 L360 201 L398 219 L431 227 L463 228 L492 223 L522 211 L548 194 L569 174 L585 152 L597 127 L605 98 L607 74 L624 63 L641 46 L657 24 L669 0 L626 0 L617 14 L603 29 L601 28 L599 18 L592 0 L548 0 L556 14 L562 29 L566 43 L566 47 L564 49 L540 48 L523 39 L514 30 L509 22 L505 9 L506 0 L467 0 L467 15 L472 34 L482 52 L497 68 L510 77 L529 85 L545 88 L566 88 L567 91 L560 116 L553 130 L540 148 L527 161 L512 172 L495 181 L481 186 L465 189 L439 189 L415 184 L387 172 L368 160 L349 144 L330 124 L301 83 L281 45 L265 0 L225 0 Z"
          fill="currentColor"
        />
      </svg>
      <span className="mae-ribbon mae-ribbon-purple-top" />
      <span className="mae-ribbon mae-ribbon-purple-bottom" />
      <svg className="mae-ribbon mae-ribbon-cream" viewBox="0 0 420 400" fill="none" focusable="false">
        <path d="M405-24C343 43 318 82 327 134C339 221 242 295 155 270C79 249 57 178-11 118"
          stroke="currentColor" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
