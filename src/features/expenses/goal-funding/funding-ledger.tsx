"use client";
// 004 PR D (T061) / FR-051, FR-058; FR-113; US-7.2; 04·11 B2; COMPONENT_SPECIFICATIONS.md §FundingLedger (aprobado en su
// forma, decisión 22.3). Dos bloques con borde 1.5 `border.subtle`, radio 18 y título overline, porque reparto ≠ fondos
// (DEC-G04): «Reparto del gasto · quién lo asume» (lo que ya eligió Anotar; define el balance y no cambia con la meta) y
// «Fondos de la meta · de quién son» (un campo por aportante, con su tope en lo disponible). Encima, cuánto del gasto se paga
// con la meta (≤ gasto). Al pie, «Suman $X de $Y», cuánto falta o sobra, o qué tope se pasó: Guardar se bloquea hasta que
// cuadre. La fila del otro integrante lleva «Pide aprobación»: los fondos propios se aplican al registrar; los ajenos, solo
// al aprobar (§15.5).
import { AmountInput } from "@/components/ui/amount-input";
import { copy } from "@/lib/copy/es";
import { cop } from "@/features/goals/format";
import { formatMoney, moneyFromPesos } from "@/domain/money";
import { AppIcon } from "@/components/ui/app-icon";
import type { FundingStatus, Funds } from "./funding-state";
import type { Contributor } from "./types";

type Props = {
  contributors: readonly Contributor[];
  usagePesos: number | null;
  onUsage: (value: number | null) => void;
  funds: Funds;
  onFund: (userId: string, value: number | null) => void;
  status: FundingStatus;
  /** Nosotros: las dos líneas del resumen del reparto (Pagó · Reparto · Participan). En Yo no hay reparto. */
  split: { first: string; second: string } | null;
  statusId: string;
  disabled: boolean;
};

const block = "flex flex-col gap-3 rounded-[18px] border-[1.5px] border-border p-3.5";
const overline = "text-[0.6875rem] font-semibold tracking-[var(--overline-tracking)] uppercase text-ink-secondary";
const pesos = (value: number) => formatMoney(moneyFromPesos(BigInt(value)));

export function statusLine(status: FundingStatus, usagePesos: number | null, contributors: readonly Contributor[]) {
  switch (status.kind) {
    case "ok": return copy.goalExpense.ledger.sum(pesos(usagePesos ?? 0), pesos(usagePesos ?? 0));
    case "noUsage": return copy.goalExpense.ledger.usageHelp;
    case "exceedsExpense": return copy.goalExpense.ledger.exceedsExpense;
    case "missing": return copy.goalExpense.ledger.missing(pesos(status.pesos));
    case "over": return copy.goalExpense.ledger.over(pesos(status.pesos));
    case "exceedsAvailable": {
      const who = contributors.find(({ userId }) => userId === status.userId);
      return who?.isMe ? copy.goalExpense.ledger.exceedsAvailableMine(cop(status.availableMinor)) : copy.goalExpense.ledger.exceedsAvailable(who?.name ?? "", cop(status.availableMinor));
    }
  }
}

export function FundingLedger({ contributors, usagePesos, onUsage, funds, onFund, status, split, statusId, disabled }: Props) {
  const partner = contributors.find(({ isMe }) => !isMe);
  const invalid = status.kind !== "ok";
  return (
    <div className="flex flex-col gap-3">
      <AmountInput
        label={copy.goalExpense.ledger.usage}
        help={copy.goalExpense.ledger.usageHelp}
        value={usagePesos}
        onValueChange={onUsage}
        disabled={disabled}
        className="w-full"
        fieldClassName="w-full"
      />
      {split ? (
        <section aria-label={copy.goalExpense.ledger.splitTitle} className={block}>
          <h3 aria-hidden="true" className={overline}>{copy.goalExpense.ledger.splitTitle}</h3>
          <p className="text-[0.875rem] font-semibold text-ink">{split.first}</p>
          <p className="text-[0.8125rem] text-ink-secondary">{split.second}</p>
          <p className="text-[0.75rem] leading-[1.45] text-[var(--comp-field-muted-fg)]">{copy.goalExpense.ledger.splitNote}</p>
        </section>
      ) : null}
      <section aria-label={copy.goalExpense.ledger.fundsTitle} className={block}>
        <h3 aria-hidden="true" className={overline}>{copy.goalExpense.ledger.fundsTitle}</h3>
        {contributors.map((contributor) => {
          const name = contributor.isMe ? copy.goalExpense.ledger.mine : copy.goalExpense.ledger.theirs(contributor.name);
          const over = status.kind === "exceedsAvailable" && status.userId === contributor.userId;
          return (
            <div key={contributor.userId} className="flex flex-col gap-1.5">
              {/* Badge «Pide aprobación» en la fila del otro integrante (FundingLedger): neutro, borde punteado, como PENDIENTE. */}
              {contributor.isMe ? null : (
                <span className="inline-flex h-6 items-center gap-[5px] self-start rounded-[8px] border-[length:var(--border-strong)] border-dashed border-border-emphasis bg-[var(--comp-badge-pending-bg)] px-[9px] text-[0.6875rem] leading-none font-semibold tracking-[.06em] text-pending">
                  <AppIcon name="hourglass-medium" weight="bold" size={12} />
                  {copy.goalExpense.ledger.needsApproval}
                </span>
              )}
              <AmountInput
                label={name}
                help={copy.goalExpense.ledger.available(cop(contributor.availableMinor))}
                value={funds[contributor.userId] ?? null}
                onValueChange={(value) => onFund(contributor.userId, value)}
                disabled={disabled}
                aria-invalid={over || undefined}
                className="w-full"
                fieldClassName="w-full"
              />
            </div>
          );
        })}
        <p className="text-[0.75rem] leading-[1.45] text-[var(--comp-field-muted-fg)]">
          {partner ? copy.goalExpense.ledger.when(partner.name) : copy.goalExpense.ledger.whenMine}
        </p>
      </section>
      <p id={statusId} role="status" aria-live="polite" className={`text-[0.8125rem] font-semibold ${invalid && status.kind !== "noUsage" ? "text-danger" : "text-ink"}`}>
        {statusLine(status, usagePesos, contributors)}
      </p>
    </div>
  );
}
