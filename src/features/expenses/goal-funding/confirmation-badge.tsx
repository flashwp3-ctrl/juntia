// 004 PR D (T062, T064) / FR-056, FR-071; COMPONENT_SPECIFICATIONS.md §ConfirmationBadge (aprobado en su forma, decisión
// 22.3). Siempre ícono + texto, 11/600, tracking .06em, como el Badge de estado:
// - PENDIENTE DE {nombre}: neutro, borde punteado, reloj de arena; nunca se pinta como error.
// - APROBADO: savingSubtle con check-circle.  - {nombre} NO APROBÓ: sunken con minus-circle, sin rojo.
// - NO SE REGISTRÓ: danger, solo con un rechazo confirmado del servidor (lección F47-4), nunca con un resultado desconocido.
// - CON META: savingSubtle con piggy-bank.
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";

export type ConfirmationState = "pending" | "approved" | "rejected" | "failed" | "funded";

const looks: Record<ConfirmationState, { icon: AppIconName; tone: string; iconTone?: string }> = {
  pending: { icon: "hourglass-medium", tone: "bg-[var(--comp-badge-pending-bg)] text-pending border-[length:var(--border-strong)] border-dashed border-border-emphasis" },
  approved: { icon: "check-circle", tone: "bg-saving-subtle text-ink", iconTone: "text-saving" },
  rejected: { icon: "minus-circle", tone: "bg-sunken text-ink" },
  failed: { icon: "warning-circle", tone: "bg-danger-subtle text-[var(--comp-danger-text-fg)]", iconTone: "text-danger" },
  funded: { icon: "piggy-bank", tone: "bg-saving-subtle text-ink", iconTone: "text-saving" },
};

export function confirmationText(state: ConfirmationState, name = "") {
  switch (state) {
    case "pending": return copy.goalExpense.badge.pending(name);
    case "approved": return copy.goalExpense.badge.approved;
    case "rejected": return copy.goalExpense.badge.rejected(name);
    case "failed": return copy.goalExpense.badge.failed;
    case "funded": return copy.goalExpense.badge.funded;
  }
}

export function ConfirmationBadge({ state, name }: { state: ConfirmationState; name?: string }) {
  const { icon, tone, iconTone = "" } = looks[state];
  return (
    <span data-confirmation={state} className={`${tone} inline-flex h-6 shrink-0 items-center gap-[5px] self-start rounded-[8px] px-[9px] text-[11px] leading-none font-semibold tracking-[.06em] whitespace-nowrap`}>
      <AppIcon name={icon} weight="bold" size={12} className={iconTone} />
      {confirmationText(state, name)}
    </span>
  );
}
