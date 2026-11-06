"use client";
// T080 / US-2.4, US-2.7; COMPONENT_SPECIFICATIONS.md §Toast (02·1) y 02·5 E5: fondo inverse, radio 16, 14/500, ícono
// Fill y una acción opcional (Deshacer o Reintentar) que es un botón propio, nunca texto pegado al mensaje. Dura 6 s con
// acción y 4 s sin ella, y se pausa mientras tiene el puntero o el foco. Éxito: `role="status"`; error: dangerSubtle con
// el texto en tinta y `role="alert"`. Sube 16 px con el spring `gentle`; con movimiento reducido, solo opacidad.
// `inline`: el mismo aviso dentro de una hoja o un diálogo, sin temporizador (un diálogo modal deja inerte lo de fuera,
// así que el Reintentar de un guardado fallido vive dentro de la hoja).
import * as m from "motion/react-m";
import { useIsPresent, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { gentle } from "@/lib/motion/tokens";
import { AppIcon } from "./app-icon";

export type ToastTone = "success" | "error";
export type ToastAction = { label: string; onAction: () => void; busy?: boolean; busyLabel?: string };

type ToastProps = {
  tone?: ToastTone;
  message: ReactNode;
  action?: ToastAction;
  /** Aviso flotante: se cierra solo pasado su tiempo. Sin él, el aviso es `inline` y no caduca. */
  onTimeout?: () => void;
  /** Para pruebas y casos especiales; por defecto 6 s con acción y 4 s sin ella. */
  durationMs?: number;
  className?: string;
};

export const TOAST_WITH_ACTION_MS = 6000;
export const TOAST_PLAIN_MS = 4000;

const looks = {
  success: "bg-inverse text-[var(--color-surface-canvas)] shadow-[0_8px_24px_color-mix(in_srgb,var(--color-surface-inverse)_22%,transparent)]",
  error: "bg-danger-subtle text-ink",
} as const;
const actionLooks = {
  success: "bg-[color-mix(in_srgb,var(--color-surface-canvas)_12%,transparent)] text-[var(--color-surface-canvas)] hover:bg-[color-mix(in_srgb,var(--color-surface-canvas)_20%,transparent)]",
  error: "bg-[color-mix(in_srgb,var(--color-text-primary)_8%,transparent)] text-ink hover:bg-[color-mix(in_srgb,var(--color-text-primary)_14%,transparent)]",
} as const;

export function Toast({ tone = "success", message, action, onTimeout, durationMs, className = "" }: ToastProps) {
  const reduced = useReducedMotion();
  // Un aviso que sale (AnimatePresence) ya no se anuncia ni se puede usar: el que lo reemplaza es el único vivo.
  const present = useIsPresent();
  const floating = Boolean(onTimeout);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused || Boolean(action?.busy);
  // Tiempo que queda: la pausa lo congela y el contador sigue desde ahí, no desde cero.
  const remaining = useRef(durationMs ?? (action ? TOAST_WITH_ACTION_MS : TOAST_PLAIN_MS));
  const timeout = useRef(onTimeout);
  useEffect(() => { timeout.current = onTimeout; });

  useEffect(() => {
    if (!floating || paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => timeout.current?.(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [floating, paused]);

  const motionProps = !floating ? {} : reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 16 }, transition: gentle };

  return (
    <m.div
      {...motionProps}
      role={present ? (tone === "error" ? "alert" : "status") : undefined}
      aria-hidden={present ? undefined : true}
      inert={!present || undefined}
      data-toast={tone}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      className={`pointer-events-auto flex w-full min-w-0 items-center gap-3 rounded-[16px] py-2 pr-2 pl-4 ${action ? "" : "min-h-12 pr-4"} ${looks[tone]} ${className}`}
    >
      <AppIcon name={tone === "error" ? "warning-circle" : "check-circle"} weight="fill" size={20} className={`shrink-0 ${tone === "error" ? "text-danger" : ""}`} />
      <span className="min-w-0 flex-1 py-1.5 text-[14px] leading-[1.4] font-medium text-pretty">{message}</span>
      {action ? (
        // Botón propio de 44 de alto (área táctil); el canto visual es el de 02·5: 13/600, radio 10.
        <button
          type="button"
          onClick={() => { if (!action.busy) action.onAction(); }}
          aria-disabled={action.busy || undefined}
          aria-busy={action.busy || undefined}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold whitespace-nowrap motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] ${actionLooks[tone]} ${action.busy ? "cursor-progress" : ""}`}
        >
          {action.busy ? <AppIcon name="circle-notch" weight="bold" size={15} className="motion-safe:animate-[button-spin_0.8s_linear_infinite]" /> : null}
          {action.busy ? (action.busyLabel ?? action.label) : action.label}
        </button>
      ) : null}
    </m.div>
  );
}
