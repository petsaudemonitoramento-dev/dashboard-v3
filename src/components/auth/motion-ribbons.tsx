/**
 * Curvas decorativas originais para a cena de acesso MAE APS.
 * SVG vetorial inline: nenhum vídeo, GIF, imagem rasterizada ou canvas.
 * A marca em si continua sendo carregada dos SVGs oficiais do projeto.
 */
export function MotionRibbons({ intro = false }: { intro?: boolean }) {
  return (
    <div className={`mae-motion-ribbons${intro ? " mae-motion-ribbons-intro" : ""}`} aria-hidden="true">
      <svg className="mae-ribbon mae-ribbon-orange" viewBox="0 0 320 205" fill="none" focusable="false">
        <path d="M-27 78C45-4 119-5 184 52c52 46 102 49 166-24" stroke="currentColor" strokeWidth="30" strokeLinecap="round"/>
        <path d="M19 140c63-36 103-31 151-1" stroke="currentColor" strokeWidth="10" strokeLinecap="round" opacity=".43"/>
      </svg>
      <svg className="mae-ribbon mae-ribbon-purple-top" viewBox="0 0 200 320" fill="none" focusable="false">
        <path d="M107-37C220 47 177 136 73 178-18 215 12 296 154 350" stroke="currentColor" strokeWidth="34" strokeLinecap="round"/>
      </svg>
      <svg className="mae-ribbon mae-ribbon-purple-bottom" viewBox="0 0 380 250" fill="none" focusable="false">
        <path d="M-63 185C3 108 91 108 151 161c52 46 118 47 186-6 51-41 67-90 20-154" stroke="currentColor" strokeWidth="38" strokeLinecap="round"/>
        <path d="M-40 238c65-47 143-40 194 4" stroke="currentColor" strokeWidth="11" strokeLinecap="round" opacity=".38"/>
      </svg>
      <svg className="mae-ribbon mae-ribbon-cream" viewBox="0 0 380 155" fill="none" focusable="false">
        <path d="M-45 151C70 4 127 5 198 67c52 48 122 44 216-48" stroke="currentColor" strokeWidth="24" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
