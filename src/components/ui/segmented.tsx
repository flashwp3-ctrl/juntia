"use client";
// FR-015, FR-040; COMPONENT_SPECIFICATIONS.md §Tabs / Segmented; MOTION_SYSTEM.md §1 (perilla, spring snappy).
// Foco itinerante y flechas ←/→ a mano (research R1.4: sin librerías de radio ni de tabs).
import * as m from "motion/react-m";
import { useReducedMotion } from "motion/react";
import { useId, useRef, type KeyboardEvent } from "react";
import { snappy } from "@/lib/motion/tokens";

export type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  /** `radiogroup` para elegir un valor (Yo/Nosotros, reparto); `tablist` cuando cambia un panel. */
  role: "radiogroup" | "tablist";
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Ocupa todo el ancho con segmentos iguales. */
  stretch?: boolean;
  /**
   * F79: con la letra ampliada, por debajo de sm, los segmentos pasan a otra fila cuando el grupo mide menos de 16rem. Solo para un
   * grupo que ocupa el ancho de su columna (en él va un contenedor de tamaño); por defecto, los de ancho completo.
   */
  wrap?: boolean;
  /** PR C de la 003: el reparto se deshabilita con un solo participante (FR-019a). */
  disabled?: boolean;
};

const knobClass = "absolute inset-0 -z-10 rounded-[11px] bg-[var(--comp-segmented-knob-bg)] shadow-raised";

export function Segmented<T extends string>({ role, label, options, value, onValueChange, stretch = false, wrap = stretch, disabled = false }: SegmentedProps<T>) {
  const reduced = useReducedMotion();
  const knobId = `${useId()}-knob`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const itemRole = role === "radiogroup" ? "radio" : "tab";

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onValueChange(options[next].value);
  };

  // F79 (revisión del PR #79): con la letra al 200 % los segmentos no cabían en una fila a 320 y se montaban. Con `wrap`, por debajo
  // de sm el grupo va en un contenedor «seg» (columna, para que siga estirándose igual) y, si mide menos de 16rem (nunca a 16 px: a 320
  // mide 17,5rem), los segmentos pasan a otra fila (RESPONSIVE: «los segmentados pasan a apilarse»). Los que se ajustan a su contenido
  // (el selector Yo/Nosotros) no lo llevan: una contención de tamaño los dejaría sin ancho.
  const group = (
    <div
      role={role}
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`${stretch ? "flex" : "inline-flex"} ${wrap ? "@max-[16rem]/seg:flex-wrap" : ""} rounded-[var(--radius-md)] bg-sunken p-[3px] shadow-[var(--comp-field-inset)] ${disabled ? "opacity-60" : ""}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          // Errata de contraste (fundadores, 3 nov 2026): etiqueta en tinta en todos los segmentos; la perilla marca la selección.
          // Área táctil (F17-2): 44 de ancho mínimo; el alto llega a 44 con el ::after sobre el padding del riel.
          <button
            key={option.value}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role={itemRole}
            data-value={option.value}
            aria-checked={role === "radiogroup" ? selected : undefined}
            aria-selected={role === "tablist" ? selected : undefined}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={`relative isolate inline-flex min-h-[38px] min-w-[44px] items-center justify-center rounded-[11px] px-3 text-[length:var(--label-m-size)] font-semibold whitespace-nowrap ${stretch ? "flex-1" : ""} text-ink after:absolute after:inset-x-0 after:-inset-y-[3px] after:content-['']`}
          >
            {selected ? (
              reduced ? (
                // Con movimiento reducido la perilla salta: sin animación de layout, que con duración 0 todavía pinta un
                // cuadro con la proyección de la posición anterior (T060, PR C).
                <span data-segmented-knob="" className={knobClass} />
              ) : (
                // Perilla compartida: se desliza entre segmentos con el spring snappy. No anima al montar.
                <m.span layoutId={knobId} initial={false} transition={snappy} data-segmented-knob="" className={knobClass} />
              )
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
  return wrap ? <div className="flex flex-col max-sm:@container/seg">{group}</div> : group;
}
