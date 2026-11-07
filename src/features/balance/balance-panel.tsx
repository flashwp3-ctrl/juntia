"use client";
// T061–T063 (spec 003, PR D) / FR-027, FR-028, FR-047, FR-051, FR-054, FR-060; US-6; MOTION_SYSTEM.md §3. SharedBalance con
// su acción: «Registrar liquidación» abre la hoja (una clave por apertura) y, con la confirmación del servidor, S4.
// - Mientras el servidor responde, el saldo que se ve queda quieto (la respuesta de la Server Action puede traer la página
//   nueva antes o después de su resultado); con `ok`, se aplica la liquidación confirmada a ese saldo y S4 anima de uno al
//   otro; cuando llega la página nueva (las mismas cifras), manda el servidor. Con `rejected` o `unknown`, nada se mueve.
// - El aviso «Liquidación registrada» con «Deshacer» de 6 s vive en el proveedor de Anotar (sobrevive a la navegación).
// - aria-live anuncia el resultado («Liquidación registrada. Tomás y Sara quedan al día»), también con movimiento reducido.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { settlementSuggestion, type MemberBalance } from "@/domain/balances";
import { formatMoney, type Money } from "@/domain/money";
import { useOptionalAnnotate } from "@/features/expenses/annotate-provider";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import { copy } from "@/lib/copy/es";
import { SettleSheet } from "./settle-sheet";
import { SharedBalance } from "./shared-balance";
import type { BalanceMember, SavedSettlement } from "./types";

const money = (amountMinor: bigint): Money => ({ amountMinor, currency: "COP" });
function suggestion(balance: readonly MemberBalance[]) {
  try {
    return settlementSuggestion(balance);
  } catch {
    return null;
  }
}

/** El saldo después de una liquidación confirmada: quien paga suma lo liquidado, quien recibe lo resta (FR-025). */
export function applySettlement(balance: readonly MemberBalance[], saved: Pick<SavedSettlement, "fromUserId" | "toUserId" | "amountMinor">): MemberBalance[] {
  const amount = BigInt(saved.amountMinor);
  return balance.map((row) => {
    const out = row.settledOut.amountMinor + (row.userId === saved.fromUserId ? amount : 0n);
    const into = row.settledIn.amountMinor + (row.userId === saved.toUserId ? amount : 0n);
    return { ...row, settledOut: money(out), settledIn: money(into), net: money(row.paid.amountMinor - row.share.amountMinor + out - into) };
  });
}

type Props = { balance: readonly MemberBalance[]; members: readonly BalanceMember[]; today: string; variant?: "screen" | "module" };

export function BalancePanel({ balance, members, today, variant = "screen" }: Props) {
  const annotate = useOptionalAnnotate();
  const actions = annotate?.sharedActions ?? null;
  const [pinned, setPinned] = useState<readonly MemberBalance[] | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const inFlight = useRef(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const shown = pinned ?? balance;
  const shownRef = useRef(shown);
  useEffect(() => { shownRef.current = shown; });
  // La página nueva del servidor manda, salvo mientras una liquidación espera respuesta.
  useEffect(() => { if (!inFlight.current) setPinned(null); }, [balance]);

  const current = suggestion(shown);
  const byId = new Map(members.map((member) => [member.userId, member]));
  const debtor = current ? byId.get(current.fromUserId) : undefined;
  const creditor = current ? byId.get(current.toUserId) : undefined;

  const onPendingChange = useCallback((waiting: boolean) => {
    if (waiting && !inFlight.current) setPinned(shownRef.current);
    inFlight.current = waiting;
  }, []);
  const close = useCallback(() => {
    setSheetKey(null);
    inFlight.current = false;
    setPinned(null);
    trigger.current?.focus();
  }, []);
  const onDone = useCallback((saved: SavedSettlement) => {
    const base = shownRef.current;
    const before = suggestion(base)?.amount.amountMinor ?? 0n;
    // Solo si lo que se ve es el saldo del que partió la función; si no, lo que traiga el servidor.
    const next = before.toString() === saved.pendingBeforeMinor ? applySettlement(base, saved) : null;
    inFlight.current = false;
    setPinned(next);
    setCelebrate((value) => value + 1);
    setSheetKey(null);
    const after = BigInt(saved.pendingAfterMinor);
    const from = byId.get(saved.fromUserId)?.name ?? "";
    const to = byId.get(saved.toUserId)?.name ?? "";
    setAnnouncement(after === 0n ? copy.balance.settle.announceSettled(from, to) : copy.balance.settle.announcePending(from, to, formatMoney(money(after))));
    annotate?.offerSettlementUndo(saved);
    trigger.current?.focus();
  }, [annotate, byId]);

  const settleButton = current && actions?.settle ? (
    <Button ref={trigger} size="lg" icon="arrows-left-right" className={variant === "screen" ? "flex-1" : "w-full"} onClick={() => setSheetKey(newIdempotencyKey())}>{copy.balance.actions.settle}</Button>
  ) : null;
  const breakdownLink = variant === "screen"
    ? <Link href="#desglose" className="inline-flex h-[52px] items-center justify-center rounded-[var(--radius-lg)] bg-raised px-4 text-base font-semibold text-ink shadow-raised hover:bg-sunken">{copy.balance.actions.breakdown}</Link>
    : <Link href="/balance#desglose" className="inline-flex min-h-11 items-center gap-1 text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4">{copy.balance.actions.breakdown}<AppIcon name="caret-right" weight="bold" size={14} /></Link>;

  return (
    <>
      <SharedBalance balance={shown} members={members} size={variant} celebrate={celebrate} headerAction={variant === "module" ? breakdownLink : undefined}>
        {variant === "screen" ? (
          settleButton ? <div className="flex gap-2">{settleButton}{breakdownLink}</div> : null
        ) : settleButton}
      </SharedBalance>
      <p aria-live="polite" data-settle-announce="" className="sr-only">{announcement}</p>
      {sheetKey && current && debtor && creditor && actions?.settle ? (
        <SettleSheet
          key={sheetKey}
          open
          onClose={close}
          debtor={debtor}
          creditor={creditor}
          pending={current.amount}
          today={today}
          idempotencyKey={sheetKey}
          actions={actions}
          onDone={onDone}
          onPendingChange={onPendingChange}
        />
      ) : null}
    </>
  );
}
