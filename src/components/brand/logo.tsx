// Marca 1c «La J que se construye» (comp «Juntia DS v1 - 09b Marca 1c», aprobado por los fundadores el 23 nov 2026).
// Un solo SVG con role="img" y nombre accesible «Juntia». Ancho y alto fijos en el propio SVG: la caja no cambia cuando
// llega Brygada 1918 Itálica (preload: false), porque «Juntia» va con textLength y se estira o encoge al ancho medido de
// la fuente real (CLS). Los colores cambian con el tema por los tokens --comp-brand-*.
import { LOCKUP, MASTER } from "./logo-geometry";

/** Ancho de «Juntia» en Brygada 1918 Medium Itálica con −0,005 em, en em (scripts/brand/generate-assets.mjs lo mide). */
export const WORDMARK_EM = 2.8;

type LogoProps = {
  /** «lockup»: isotipo + «Juntia»; «isotype»: solo el isotipo. */
  variant?: "lockup" | "isotype";
  /** Lockup: cuerpo de «Juntia» en px. Isotipo: lado en px. El maestro se usa desde 24 px de isotipo. */
  size: number;
  className?: string;
};

const stem = { fill: "var(--comp-brand-stem)" };
const curve = { fill: "var(--comp-brand-curve)" };

export function lockupBox(size: number) {
  const isotype = Math.round(size * LOCKUP.isotype);
  const gap = Math.round(size * LOCKUP.gap);
  const word = Math.ceil(size * WORDMARK_EM);
  return { isotype, gap, word, width: isotype + gap + word, height: Math.max(isotype, size) };
}

export function Logo({ variant = "lockup", size, className = "" }: LogoProps) {
  // «block» salvo que quien llama oculte el logo por defecto ("hidden xl:block"): dos display en conflicto no se resuelven por orden.
  const classes = `${/(^|\s)hidden(\s|$)/.test(className) ? "" : "block "}shrink-0 ${className}`.trim();
  if (variant === "isotype") {
    return (
      <svg role="img" aria-label="Juntia" width={size} height={size} viewBox={`0 0 ${MASTER.viewBox} ${MASTER.viewBox}`} className={classes}>
        <path d={MASTER.stem} style={stem} />
        <path d={MASTER.curve} style={curve} />
      </svg>
    );
  }
  const box = lockupBox(size);
  const top = (box.height - box.isotype) / 2;
  return (
    <svg role="img" aria-label="Juntia" width={box.width} height={box.height} viewBox={`0 0 ${box.width} ${box.height}`} overflow="visible" className={classes}>
      <svg x={0} y={top} width={box.isotype} height={box.isotype} viewBox={`0 0 ${MASTER.viewBox} ${MASTER.viewBox}`}>
        <path d={MASTER.stem} style={stem} />
        <path d={MASTER.curve} style={curve} />
      </svg>
      <text
        x={box.isotype + box.gap}
        y={box.height / 2}
        dominantBaseline="central"
        fontSize={size}
        textLength={box.word}
        lengthAdjust="spacingAndGlyphs"
        className="font-serif-italic font-medium italic"
        style={{ fill: "var(--comp-brand-wordmark)", letterSpacing: "-0.005em" }}
      >
        Juntia
      </text>
    </svg>
  );
}
