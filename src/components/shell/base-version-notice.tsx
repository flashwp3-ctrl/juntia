// T051 / FR-028, FR-034; maestro §15.10, «Aviso de versión base». Visible en todas las rutas del shell y sin control de
// cierre: desaparece cuando el servidor esté conectado. Compuesto con AppIcon y tokens; no es LimitNote (propuesta §15.9).
import { AppIcon } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";

export function BaseVersionNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      data-base-version-notice=""
      aria-label={copy.shell.noticeLabel}
      className={`flex items-center gap-3 rounded-[var(--radius-lg)] border-[length:var(--border-hairline)] border-border bg-raised px-3 py-2.5 xl:flex-col xl:items-start xl:gap-4 xl:rounded-[var(--radius-xl)] xl:p-5 ${className}`}
    >
      {/* Ficha de atención: ícono y texto, nunca solo color (handoff §Accesibilidad, «Más que color»). */}
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-warning-subtle text-warning xl:size-10 xl:rounded-[13px]">
        <AppIcon name="warning" weight="duotone" size={18} />
      </span>
      <p className="flex min-w-0 flex-col gap-0.5 xl:gap-1.5">
        <span className="text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] text-[var(--comp-shell-muted-fg)] uppercase">
          {copy.shell.noticeLabel}
        </span>
        <span className="text-[length:var(--body-s-size)] leading-[var(--body-s-line)] text-ink xl:text-[length:var(--body-m-size)] xl:leading-[var(--body-m-line)]">
          {copy.shell.notice}
        </span>
      </p>
    </aside>
  );
}
