"use client";
// FR-012, FR-037; COMPONENT_SPECIFICATIONS.md §Button. `<button>` nativo con área táctil ≥ 44.
import { motion, useReducedMotion } from "motion/react";
import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";
import { snappy } from "@/lib/motion/tokens";
import { AppIcon, type AppIconName } from "./app-icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  // Bosque lleno, una sola por vista; el canto baja a 0 al presionar.
  primary:
    "bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-[var(--comp-button-primary-highlight),var(--comp-button-primary-edge)] hover:bg-primary-hover active:bg-primary-pressed active:shadow-[var(--comp-button-primary-highlight)]",
  secondary: "bg-raised text-ink shadow-raised",
  ghost: "bg-transparent text-ink border-[length:var(--border-strong)] border-border",
  danger: "bg-danger-subtle text-danger",
};

// sm 36 / radio 12 · md 44 / radio 14 · lg 52 / radio 18. En sm, el área táctil se extiende a 44 con un pseudoelemento.
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-[12px] px-3 text-[length:var(--label-m-size)] after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  md: "h-11 rounded-[var(--radius-md)] px-[14px] text-[length:var(--label-m-size)]",
  lg: "h-[52px] rounded-[var(--radius-lg)] px-5 text-base",
};

const disabledLook = "bg-sunken text-ink-secondary shadow-none border-transparent cursor-not-allowed";

type ButtonProps = Omit<ComponentPropsWithRef<"button">, "disabled" | "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: AppIconName;
  disabled?: boolean;
  loading?: boolean;
  /** Etiqueta en gerundio del catálogo mientras carga («Guardando…»). */
  loadingLabel?: string;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", icon, disabled = false, loading = false, loadingLabel, children, className = "", onClick, type = "button", ...rest }: ButtonProps) {
  const reduced = useReducedMotion();
  const inert = disabled || loading;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (inert) { event.preventDefault(); return; }
    onClick?.(event);
  };
  return (
    <motion.button
      {...rest}
      type={type}
      data-variant={variant}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      onClick={handleClick}
      // Pulsación con spring snappy; con movimiento reducido no hay desplazamiento, solo cambia el color.
      whileTap={inert || reduced ? undefined : { y: 2 }}
      transition={snappy}
      className={`relative inline-flex shrink-0 items-center justify-center font-semibold leading-none whitespace-nowrap select-none motion-safe:transition-[background-color,box-shadow,color] motion-safe:duration-[var(--duration-instant)] ${sizes[size]} ${disabled ? disabledLook : variants[variant]} ${loading ? "cursor-progress" : ""} ${className}`}
    >
      {/* Las dos caras ocupan la misma celda: el ancho es el mismo en reposo y en carga, sin salto de layout. */}
      <span className="grid">
        <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${loading ? "invisible" : ""}`}>
          {icon ? <AppIcon name={icon} weight="bold" size={17} /> : null}
          {children}
        </span>
        <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${loading ? "" : "invisible"}`}>
          <AppIcon name="circle-notch" weight="bold" size={17} className="motion-safe:animate-[button-spin_0.8s_linear_infinite]" />
          {loadingLabel ?? children}
        </span>
      </span>
    </motion.button>
  );
}
