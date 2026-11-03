// FR-011; COMPONENT_SPECIFICATIONS.md §Badge de estado: siempre ícono + texto, 11/600, tracking .06em.
import { copy } from "@/lib/copy/es";
import { AppIcon, type AppIconName } from "./app-icon";

const statuses = {
  // Neutro con borde punteado y reloj: nunca se pinta como error (DESIGN_SYSTEM.md §2.1, regla 5).
  pending: { icon: "clock", text: copy.primitives.pending, tone: "bg-[var(--comp-badge-pending-bg)] text-pending border-[length:var(--border-strong)] border-dashed border-border-emphasis" },
  // Liquidado: check + texto en tinta (DESIGN_SYSTEM.md §2.1, regla 5); el verde de texto es solo ahorro (regla 2).
  settled: { icon: "check-circle", text: copy.primitives.settled, tone: "bg-saving-subtle text-ink" },
  exceeded: { icon: "warning-circle", text: copy.primitives.exceeded, tone: "bg-danger-subtle text-[var(--comp-danger-text-fg)]" },
  nearLimit: { icon: "warning", text: copy.primitives.nearLimit, tone: "bg-warning-subtle text-warning" },
  // Errata de contraste (fundadores, 3 nov 2026): tinta sobre sunken, 12,95:1; text.secondary daba 4,30.
  private: { icon: "lock-simple", text: copy.primitives.private, tone: "bg-sunken text-ink" },
} as const satisfies Record<string, { icon: AppIconName; text: string; tone: string }>;

// F17-R1: el texto de EXCEDIDO va en --comp-danger-text-fg; su ícono, como bordes e íconos de peligro, en
// status.danger (4,28:1 sobre dangerSubtle, ≥ 3:1).
const iconTones: Partial<Record<keyof typeof statuses, string>> = { exceeded: "text-danger" };

export type BadgeStatus = keyof typeof statuses;

export function Badge({ status }: { status: BadgeStatus }) {
  const { icon, text, tone } = statuses[status];
  const iconTone = iconTones[status] ?? "";
  return (
    <span className={`${tone} inline-flex h-6 items-center gap-[5px] self-start rounded-[8px] px-[9px] text-[11px] font-semibold leading-none tracking-[.06em] whitespace-nowrap`}>
      <AppIcon name={icon} weight="bold" size={12} className={iconTone} />
      {text}
    </span>
  );
}
