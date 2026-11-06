"use client";
// T066 / FR-040; 04·1 INICIO · YO: el bloque «Anotar gasto · Monto y categoría» de Inicio en móvil y tablet (en ≥ 1024
// Anotar vive en el rail y el sidebar). Abre lo mismo que el + de la barra: hasta el PR D, el aviso de la 001; con el
// PR D, la hoja real. «Anotar el primero» del estado vacío usa el mismo disparador.
import type { MouseEvent } from "react";
import { useAnnotate } from "@/components/shell/annotate-notice";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/es";

export function AnnotateCta() {
  const { openFrom } = useAnnotate();
  return (
    <button
      type="button"
      aria-keyshortcuts={copy.nav.shortcut}
      onClick={(event: MouseEvent<HTMLButtonElement>) => openFrom(event.currentTarget)}
      className="flex min-h-[76px] w-full flex-wrap items-center gap-x-3.5 gap-y-1 rounded-[var(--radius-xl)] bg-[var(--comp-button-primary-bg)] px-4 py-3 text-left text-[var(--comp-button-primary-fg)] shadow-[var(--comp-button-primary-highlight),var(--comp-button-primary-edge)] hover:bg-primary-hover active:bg-primary-pressed motion-safe:transition-colors motion-safe:duration-[var(--duration-instant)] lg:hidden"
    >
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-text-onAction)_14%,transparent)]">
        <AppIcon name="plus" weight="bold" size={22} />
      </span>
      <span className="font-serif text-[length:var(--title-l-size)] leading-none font-medium tracking-[var(--title-l-tracking)] min-w-0">{copy.nav.annotateBlock}</span>
      <span className="ml-auto max-w-[6.5rem] text-right text-[length:var(--label-s-size)] leading-tight font-medium text-pretty">{copy.home.annotateHint}</span>
    </button>
  );
}

export function AnnotateFirst({ label }: { label: string }) {
  const { openFrom } = useAnnotate();
  return <Button icon="plus" onClick={(event) => openFrom(event.currentTarget)}>{label}</Button>;
}
