"use client";
// T048 (spec 003, PR C) / FR-044, FR-052; interpretación I3; 04·1 «POR SALDAR» y E5 de 02·5. El saldo de la pareja en una
// línea: el badge «POR SALDAR», quién le debe a quién y cuánto (acumulado, Q9), con «Ver balance» (la pantalla llega con el
// PR D). «le debe», nunca «está en deuda» (glosario §9). Al día: «Al día», sin cifra. E5: cuando el saldo cambia (tras
// guardar un gasto compartido), el anterior se queda tachado junto al nuevo; no es movimiento, así que se ve igual con
// movimiento reducido. La sugerencia es `settlementSuggestion` del dominio sobre las filas de `couple_balance`.
import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { initialOf } from "@/domain/account";
import { settlementSuggestion, type MemberBalance } from "@/domain/balances";
import { formatMoney, type Money } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import type { CoupleMemberView } from "./couple-home-view";

function suggestion(balance: readonly MemberBalance[]) {
  try {
    return settlementSuggestion(balance);
  } catch {
    return null;
  }
}

type Shown = { key: string; direction: string | null; amount: Money | null };
/** El tachado y el saldo para el que vale: solo se pinta si `forKey` es el saldo que se está pintando. */
type Struck = { forKey: string; amount: Money };

/**
 * C-1 (decisión 30.3): qué se tacha al pasar de `previous` a `next`. El anterior solo se tacha bajo la misma dirección (quién le
 * debe a quién) o junto a «Al día». Si la deuda cambió de dirección, ese monto era de la otra persona: no se tacha.
 */
export function strikeFor(previous: Shown, next: Shown): Struck | null {
  if (previous.key === next.key || !previous.amount) return null;
  return next.direction === null || previous.direction === next.direction ? { forKey: next.key, amount: previous.amount } : null;
}

export function BalanceLine({ balance, members }: { balance: readonly MemberBalance[]; members: readonly CoupleMemberView[] }) {
  const current = suggestion(balance);
  const key = current ? `${current.fromUserId}>${current.toUserId}:${current.amount.amountMinor}` : "settled";
  const direction = current ? `${current.fromUserId}>${current.toUserId}` : null;
  // F111-3: el tachado se decide durante el render (estado derivado del saldo anterior, sin efecto), así que el primer render
  // con el saldo nuevo ya trae el tachado correcto o ninguno; y solo se pinta si es del saldo que se está pintando.
  const [shown, setShown] = useState<Shown>({ key, direction, amount: current?.amount ?? null });
  const [struck, setStruck] = useState<Struck | null>(null);
  if (shown.key !== key) {
    const next = { key, direction, amount: current?.amount ?? null };
    setStruck(strikeFor(shown, next));
    setShown(next);
  }
  const struckAmount = struck && struck.forKey === key ? struck.amount : null;
  const debtor = current ? members.find((member) => member.userId === current.fromUserId) : null;
  const creditor = current ? members.find((member) => member.userId === current.toUserId) : null;
  return (
    <section aria-labelledby="balance-line-title" data-balance-line="" className="flex flex-col gap-2.5 rounded-[var(--radius-xl)] p-4 shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h2 id="balance-line-title" className="inline-flex min-h-6 items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-border-emphasis px-2.5 text-[0.6875rem] font-semibold tracking-[var(--overline-tracking)] text-ink">
          {current ? copy.couple.home.pending : copy.couple.home.settledBadge}
        </h2>
        <Link href="/balance" className="inline-flex min-h-11 items-center gap-1 text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4">
          {copy.couple.home.seeBalance}
          <AppIcon name="caret-right" weight="bold" size={14} />
        </Link>
      </div>
      {current && debtor && creditor ? (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span aria-hidden="true" className="flex -space-x-1.5">
            <Avatar person={debtor.joinOrder} initial={initialOf(debtor.name)} size={24} />
            <Avatar person={creditor.joinOrder} initial={initialOf(creditor.name)} size={24} />
          </span>
          <span className="text-[length:var(--body-m-size)] font-medium text-ink">{copy.couple.home.owes(debtor.name, creditor.name)}</span>
          {struckAmount ? <s className="text-[length:var(--body-m-size)] text-ink-secondary tabular-nums">{formatMoney(struckAmount)}</s> : null}
          <span className="text-[length:var(--money-m-fit)] leading-[var(--money-m-line)] font-semibold tracking-[var(--money-m-tracking)] text-ink tabular-nums">{formatMoney(current.amount)}</span>
        </p>
      ) : (
        <p className="text-[length:var(--body-m-size)] font-medium text-ink">
          {struckAmount ? <s className="mr-2 text-ink-secondary tabular-nums">{formatMoney(struckAmount)}</s> : null}
          {copy.couple.home.settled}
        </p>
      )}
    </section>
  );
}
