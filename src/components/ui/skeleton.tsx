"use client";
// FR-016, FR-040; COMPONENT_SPECIFICATIONS.md §Skeleton; MOTION_SYSTEM.md §6 (Loading Delight).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

const APPEAR_AFTER_MS = 300; // MOTION_SYSTEM.md §6: solo aparece si la carga pasa de 300 ms.

type SkeletonGroupProps = {
  /** Texto oculto de carga, del catálogo («Cargando movimientos»). */
  label: string;
  children: ReactNode;
  className?: string;
};

// Contenedor `aria-busy`: reserva la geometría desde el primer cuadro (sin CLS) y muestra los bloques pasados 300 ms.
export function SkeletonGroup({ label, children, className = "" }: SkeletonGroupProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div aria-busy="true" data-skeleton-visible={visible || undefined}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className={`${visible ? "" : "invisible"} ${className}`}>{children}</div>
    </div>
  );
}

type SkeletonProps = {
  /** Geometría exacta del contenido final que reemplaza. */
  width?: CSSProperties["width"];
  height: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  className?: string;
};

// Pulso de opacidad 1 → .55 en 1,6 s, sin shimmer; estático con movimiento reducido.
export function Skeleton({ width = "100%", height, radius = "var(--radius-xs)", className = "" }: SkeletonProps) {
  return (
    <span
      data-skeleton=""
      className={`block shrink-0 bg-skeleton motion-safe:animate-[skeleton-pulse_1.6s_ease-in-out_infinite] ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
