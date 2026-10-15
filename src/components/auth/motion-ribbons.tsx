/**
 * Composição vetorial da arte de login MAE APS.
 * As duas curvas índigo são máscaras do símbolo ORIGINAL do manual,
 * baixado diretamente do Google Drive; não usam imagens rasterizadas.
 * A curva vermelha descreve o movimento da composição do Figma.
 */
export function MotionRibbons() {
  return (
    <div className="mae-motion-ribbons" aria-hidden="true">
      <svg className="mae-ribbon mae-ribbon-orange" viewBox="0 0 420 480" fill="none" focusable="false">
        <path
          d="M-45 -34C-28 53-19 155 43 242C92 307 170 339 225 300C269 269 294 201 250 176C213 155 181 187 205 214C235 254 287 226 307 174C333 119 334 45 313-38"
          stroke="currentColor" strokeWidth="43" strokeLinecap="round" strokeLinejoin="round"
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
