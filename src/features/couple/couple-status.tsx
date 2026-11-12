// T032, T035 / FR-015, FR-017; COMPONENT_SPECIFICATIONS.md §CoupleStatus (anatomía aprobada, decisión 16.6): avatares
// superpuestos (el que falta, con contorno punteado), badge (ACTIVA, PENDIENTE, SOLO TÚ, NO VÁLIDA), título serif 32 y
// línea de contexto. Nunca muestra saldos ni el correo del otro. Badges del comp 04·15 (`badge` de flows.js): ACTIVA en
// saving.subtle con check-circle; PENDIENTE neutro, punteado, con hourglass-medium; SOLO TÚ en sunken con minus-circle;
// NO VÁLIDA en danger.subtle con warning-circle. Siempre ícono + texto (DESIGN_SYSTEM §2.1).
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { copy } from "@/lib/copy/es";

export type CoupleStatusState = "active" | "pending" | "solo" | "invalid";

const badges: Record<CoupleStatusState, { icon: AppIconName; text: string; tone: string; iconTone?: string }> = {
  active: { icon: "check-circle", text: copy.couple.status.active, tone: "bg-saving-subtle text-saving" },
  pending: { icon: "hourglass-medium", text: copy.couple.status.pending, tone: "bg-[var(--comp-badge-pending-bg)] text-pending border-[length:var(--border-strong)] border-dashed border-border-emphasis" },
  solo: { icon: "minus-circle", text: copy.couple.status.solo, tone: "bg-sunken text-ink" },
  invalid: { icon: "warning-circle", text: copy.couple.status.invalid, tone: "bg-danger-subtle text-[var(--comp-danger-text-fg)]", iconTone: "text-danger" },
};

type CoupleStatusProps = {
  state: CoupleStatusState;
  title: string;
  line: string;
  /** La persona que mira, con su color por orden de ingreso. */
  me: { initial: string; person?: 1 | 2 };
  /** La otra persona, solo con la pareja activa. */
  partner?: { initial: string; person?: 1 | 2 };
};

export function CoupleStatus({ state, title, line, me, partner }: CoupleStatusProps) {
  const badge = badges[state];
  const first = me.person ?? 1;
  return (
    <div role="group" aria-label={copy.couple.status.label(title)} className="flex flex-col gap-3 rounded-[24px] bg-raised p-[18px] shadow-raised">
      <div aria-hidden="true" className="flex">
        {partner && first === 2 ? <Avatar person={1} initial={partner.initial} size={52} /> : <Avatar person={first} initial={me.initial} size={52} />}
        <span className="-ml-3 flex rounded-[17px] shadow-[0_0_0_3px_var(--color-surface-raised)]">
          {partner ? (
            first === 2 ? <Avatar person={2} initial={me.initial} size={52} /> : <Avatar person={partner.person ?? 2} initial={partner.initial} size={52} />
          ) : (
            <span data-partner-slot="" className="grid size-[52px] place-items-center rounded-[17px] border-[length:var(--border-strong)] border-dashed border-border-emphasis bg-raised text-ink-secondary">
              <AppIcon name={state === "invalid" ? "link-break" : "user-plus"} size={22} />
            </span>
          )}
        </span>
      </div>
      <span className={`${badge.tone} inline-flex h-6 items-center gap-[5px] self-start rounded-[8px] px-[9px] text-[0.6875rem] leading-none font-semibold tracking-[.06em] whitespace-nowrap`}>
        <AppIcon name={badge.icon} weight="bold" size={12} className={badge.iconTone} />
        {badge.text}
      </span>
      <span className="font-serif text-[2rem] leading-[1.05] font-normal tracking-[-0.01em] break-words text-ink">{title}</span>
      <span className="text-[0.8125rem] leading-[1.4] [overflow-wrap:anywhere] text-ink-secondary">{line}</span>
    </div>
  );
}
