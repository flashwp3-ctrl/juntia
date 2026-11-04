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
};

const knobClass = "absolute inset-0 -z-10 rounded-[11px] bg-[var(--comp-segmented-knob-bg)] shadow-raised";

export function Segmented<T extends string>({ role, label, options, value, onValueChange, stretch = false }: SegmentedProps<T>) {
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

  return (
    <div
      role={role}
      aria-label={label}
      className={`${stretch ? "flex" : "inline-flex"} rounded-[var(--radius-md)] bg-sunken p-[3px] shadow-[var(--comp-field-inset)]`}
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
}
