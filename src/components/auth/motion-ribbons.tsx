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
      <svg className="mae-ribbon mae-ribbon-purple-top" viewBox="0 0 250 290"
        preserveAspectRatio="xMaxYMin meet" focusable="false"
        aria-hidden="true" data-reference-geometry="top-right-original-trace">
        <path d="M 181.5 193 Q 162 181 162 212 Q 162 243 172 248.5 Q 182 254 191.5 257.5 Q 201 261 213 264 Q 225 267 237 268.5 Q 249 270 249 243.5 Q 249 217 240.5 216 Q 232 215 216.5 210 Q 201 205 181.5 193 Z M 86 0 Q 59 0 55.5 18 Q 52 36 51.5 52.5 Q 51 69 53.5 86.5 Q 56 104 63 123.5 Q 70 143 99 143 Q 128 143 119.5 125 Q 111 107 107.5 90.5 Q 104 74 104 57 Q 104 40 108.5 20 Q 113 0 86 0 Z" fill="currentColor" />
      </svg>
      <svg className="mae-ribbon mae-ribbon-purple-bottom" viewBox="0 0 570 295"
       preserveAspectRatio="xMinYMax meet" focusable="false"
       aria-hidden="true" data-reference-geometry="bottom-left-original-trace">
       <path d="M 16.5 39 Q 0 48 0 83 Q 0 118 12 107 Q 24 96 32.5 90.5 Q 41 85 53.5 79.5 Q 66 74 80 70 Q 94 66 104.5 64.5 Q 115 63 134 63.5 Q 153 64 167.5 67 Q 182 70 190.5 73.5 Q 199 77 199 78.5 Q 199 80 190 87.5 Q 181 95 167.5 110 Q 154 125 145 139.5 Q 136 154 131.5 169.5 Q 127 185 126.5 192 Q 126 199 127 206.5 Q 128 214 131.5 223 Q 135 232 141.5 240.5 Q 148 249 158.5 256 Q 169 263 182 266.5 Q 195 270 202 270.5 Q 209 271 217 270 Q 225 269 234.5 266 Q 244 263 251.5 259 Q 259 255 268.5 247 Q 278 239 288 224.5 Q 298 210 302 199.5 Q 306 189 308 178.5 Q 310 168 310 157 Q 310 146 308.5 136.5 Q 307 127 300 109.5 Q 293 92 303.5 89.5 Q 314 87 329.5 86.5 Q 345 86 362.5 89 Q 380 92 399 100 Q 418 108 436.5 123 Q 455 138 465.5 152 Q 476 166 481 176 Q 486 186 489 195 Q 492 204 495 222.5 Q 498 241 497.5 259 Q 497 277 495.5 285.5 Q 494 294 521 294 Q 548 294 549.5 277 Q 551 260 550 240.5 Q 549 221 545.5 204.5 Q 542 188 535 169.5 Q 528 151 518 135 Q 508 119 496.5 106 Q 485 93 468 80 Q 451 67 436 59 Q 421 51 403.5 45 Q 386 39 366 36 Q 346 33 325.5 34 Q 305 35 279 41.5 Q 253 48 243.5 41.5 Q 234 35 223.5 30 Q 213 25 196.5 20 Q 180 15 162.5 12.5 Q 145 10 125 10.5 Q 105 11 88.5 14 Q 72 17 52.5 23.5 Q 33 30 16.5 39 Z M 241.5 115.5 Q 244 115 247.5 121 Q 251 127 254 137 Q 257 147 256.5 159 Q 256 171 252.5 180 Q 249 189 243 197 Q 237 205 229.5 210 Q 222 215 214 216.5 Q 206 218 197 215.5 Q 188 213 185 210.5 Q 182 208 180.5 204 Q 179 200 180 192 Q 181 184 184.5 176.5 Q 188 169 195.5 158.5 Q 203 148 212.5 138.5 Q 222 129 230.5 122.5 Q 239 116 241.5 115.5 Z" fill="currentColor" fillRule="evenodd" />
     </svg>
      <svg className="mae-ribbon mae-ribbon-cream" viewBox="0 0 420 400" fill="none" focusable="false">
        <path d="M405-24C343 43 318 82 327 134C339 221 242 295 155 270C79 249 57 178-11 118"
          stroke="currentColor" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
