"use client";
// Rendimiento (auditoría de Impeccable, 4 de noviembre de 2026): los componentes animan con `m` y las funciones
// de Motion llegan en un chunk aparte, después del primer pintado. `strict` impide volver a importar `motion`
// completo por error. `domMax` incluye las animaciones de layout que usa la perilla del Segmented.
import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./motion-features").then((module) => module.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
