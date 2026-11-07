"use client";
// T061, T063 (spec 003, PR D) / FR-025, FR-026, FR-030, FR-047, FR-051, FR-053; US-5; decisión 20.2 (SharedBalance aprobado
// en su forma); COMPONENT_SPECIFICATIONS.md §SharedBalance; 02·3 y 04·2 (pantalla, barras de 28 px) y 04·7 (módulo de
// Inicio desde 1024, barras de 16 px); MOTION_SYSTEM.md §3 (S4).
// Lo que pagó cada persona frente a lo que le corresponde, en la misma escala, y el saldo resultante, que sale de
// `couple_balance` (una sola lectura, FR-043) con la sugerencia de `settlementSuggestion` del dominio. Estados: por saldar,
// al día (LIQUIDADO), sin gastos compartidos (nunca «Al día $0»), cargando, error e invertido (la sugerencia cambia de
// dirección). Cada barra es `role="img"` con las cifras completas; la tabla de desglose es la alternativa (BalanceBreakdown).
// «le debe», nunca «está en deuda»; sin rankings ni colores de ganador (glosario §9).
// S4: anima solo cuando `celebrate` cambia, que BalancePanel cambia con la confirmación del servidor (`ok`); con
// `rejected` o `unknown` no llega nada nuevo y no se mueve nada. Con movimiento reducido, el estado final sin animar.
import { animate } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar, personFill } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { initialOf } from "@/domain/account";
import { settlementSuggestion, type MemberBalance } from "@/domain/balances";
import { formatMoney, type Money } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { pesos } from "@/lib/format";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { barGeometry, balanceScale, type SegmentKind } from "./bar-geometry";
import type { BalanceMember } from "./types";

export type { BalanceMember } from "./types";

const money = (amountMinor: bigint): Money => ({ amountMinor, currency: "COP" });
const emphasized = [0.3, 0, 0, 1] as const;
/** S4 dura 900 ms (MOTION_SYSTEM §3, storyboard): mientras tanto, `data-s4="animating"`. */
const S4_MS = 900;

function suggestion(balance: readonly MemberBalance[]) {
  try {
    return settlementSuggestion(balance);
  } catch {
    return null;
  }
}
/** Sin ningún gasto compartido ni liquidación: el estado vacío, nunca «Al día $0». */
const isEmpty = (balance: readonly MemberBalance[]) => balance.length === 0 || balance.every((row) => row.paid.amountMinor === 0n && row.share.amountMinor === 0n && row.settledOut.amountMinor === 0n && row.settledIn.amountMinor === 0n);

const segmentClass: Record<SegmentKind, string> = {
  paid: "",
  over: "shadow-[inset_0_0_0_2px_var(--color-ink)]",
  settled: "bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_2px,transparent_2px_6px)] opacity-55",
  received: "border-[1.5px] border-dashed border-border-emphasis bg-transparent",
  missing: "border-[1.5px] border-dashed border-border-emphasis bg-transparent",
};
const inset: Partial<Record<SegmentKind, boolean>> = { received: true, missing: true };

type Props = {
  balance: readonly MemberBalance[];
  members: readonly BalanceMember[];
  /** `loading`: el esqueleto con la geometría final; `error`: la lectura falló. */
  state?: "ready" | "loading" | "error";
  /** `screen`: Balance (barras de 28 px, una fila por persona); `module`: Inicio desde 1024 (barras de 16 px). */
  size?: "screen" | "module";
  /** S4: cambia (un número nuevo) cuando el servidor confirmó una liquidación. */
  celebrate?: number;
  /** El enlace al desglose del módulo de Inicio. */
  headerAction?: ReactNode;
  /** Lo que va debajo de las barras: la acción de liquidar. */
  children?: ReactNode;
};

export function SharedBalance({ balance, members, state = "ready", size = "screen", celebrate = 0, headerAction, children }: Props) {
  const reduced = usePrefersReducedMotion();
  const current = suggestion(balance);
  const finalMinor = current?.amount.amountMinor ?? 0n;
  // S4: el contador va del saldo anterior al nuevo (emphasized, 600 ms) solo con una confirmación nueva.
  const [shown, setShown] = useState(finalMinor);
  const [animating, setAnimating] = useState(false);
  const previous = useRef(finalMinor);
  const handled = useRef(celebrate);
  // El saldo anterior (distinto) que se pintó: sus tramos ya existían; lo nuevo crece desde su inicio, lo demás cambia de ancho.
  const key = balance.map((row) => `${row.userId}:${row.paid.amountMinor}:${row.share.amountMinor}:${row.settledOut.amountMinor}:${row.settledIn.amountMinor}`).join("|");
  const [painted, setPainted] = useState<{ key: string; balance: readonly MemberBalance[]; prior: readonly MemberBalance[] | null }>({ key, balance, prior: null });
  if (painted.key !== key) setPainted({ key, balance, prior: painted.balance });
  useEffect(() => {
    const from = previous.current;
    previous.current = finalMinor;
    const fresh = celebrate !== handled.current;
    handled.current = celebrate;
    if (!fresh || reduced) { setShown(finalMinor); setAnimating(false); return; }
    setAnimating(true);
    const done = window.setTimeout(() => setAnimating(false), S4_MS);
    const controls = from === finalMinor ? null : animate(Number(from / 100n), Number(finalMinor / 100n), {
      duration: 0.6, ease: emphasized,
      onUpdate: (latest) => setShown(BigInt(Math.round(latest)) * 100n),
      onComplete: () => setShown(finalMinor),
    });
    if (!controls) setShown(finalMinor);
    return () => { window.clearTimeout(done); controls?.stop(); };
  }, [finalMinor, celebrate, reduced]);

  if (state === "loading") return <BalanceSkeleton size={size} />;
  if (state === "error") return <BalanceError />;
  if (isEmpty(balance)) {
    return (
      <section data-shared-balance="" aria-labelledby="balance-empty" className="flex flex-col items-start gap-2 rounded-[var(--radius-xl)] bg-raised p-5 shadow-raised">
        <AppIcon name="scales" weight="duotone" size={28} className="text-ink-secondary" />
        <h2 id="balance-empty" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.balance.empty.title}</h2>
        <p className="text-[length:var(--body-m-size)] leading-[1.45] text-pretty text-ink-secondary">{copy.balance.empty.description}</p>
      </section>
    );
  }

  const byId = new Map(members.map((member) => [member.userId, member]));
  const debtor = current ? byId.get(current.fromUserId) : null;
  const creditor = current ? byId.get(current.toUserId) : null;
  const counting = animating && shown !== finalMinor;
  const scale = balanceScale(balance);
  const priorScale = painted.prior ? balanceScale(painted.prior) : 1n;
  const kindsBefore = new Map((painted.prior ?? []).map((row) => [row.userId, new Set(barGeometry(row, priorScale).segments.map((segment) => segment.kind))]));
  const rows = [...balance].sort((a, b) => (byId.get(a.userId)?.joinOrder ?? 9) - (byId.get(b.userId)?.joinOrder ?? 9));
  const usedKinds = new Set<SegmentKind>();
  const bars = rows.map((row) => {
    const member = byId.get(row.userId);
    const geometry = barGeometry(row, scale);
    for (const segment of geometry.segments) usedKinds.add(segment.kind);
    const net = row.net.amountMinor;
    const status = net > 0n ? copy.balance.owed(pesos(row.net)) : net < 0n ? copy.balance.owesShort(pesos(row.net)) : copy.balance.even;
    const label = copy.balance.bar({
      name: member?.name ?? "", paid: pesos(row.paid), share: pesos(row.share),
      settledOut: row.settledOut.amountMinor > 0n ? pesos(row.settledOut) : null, settledIn: row.settledIn.amountMinor > 0n ? pesos(row.settledIn) : null,
      status: net > 0n ? copy.balance.barStatus.owed(pesos(row.net)) : net < 0n ? copy.balance.barStatus.owes(pesos(row.net)) : copy.balance.barStatus.even,
    });
    const before = kindsBefore.get(row.userId);
    return { row, member, geometry, status, label, net, before };
  });

  const height = size === "screen" ? "h-7" : "h-4";
  const titleId = size === "screen" ? "balance-title" : "balance-module-title";
  const amountText = formatMoney(money(counting ? shown : finalMinor));
  return (
    <section
      data-shared-balance=""
      data-s4={animating ? "animating" : undefined}
      aria-labelledby={titleId}
      className={size === "screen" ? "flex flex-col gap-4" : "flex flex-col gap-3 rounded-[var(--radius-xl)] bg-raised p-5 shadow-raised"}
    >
      <div className="flex flex-col items-start gap-1.5">
        <div className="flex w-full items-center justify-between gap-3">
          <span data-balance-badge={current ? "pending" : "settled"} className="inline-flex">
            <Badge status={current ? "pending" : "settled"} />
          </span>
          {headerAction}
        </div>
        {size === "module" && debtor && creditor ? (
          <p aria-hidden="true" className="flex items-center gap-2 pt-1">
            <Avatar person={debtor.joinOrder} initial={initialOf(debtor.name)} size={24} />
            <AppIcon name="arrow-right" weight="bold" size={14} className="text-ink-secondary" />
            <Avatar person={creditor.joinOrder} initial={initialOf(creditor.name)} size={24} />
          </p>
        ) : null}
        <h2 id={titleId} className={size === "screen" ? "font-serif text-[length:var(--title-l-size)] leading-[1.1] font-medium tracking-[var(--title-l-tracking)] text-balance text-ink" : "text-[length:var(--body-m-size)] font-medium text-ink"}>
          {current && debtor && creditor ? copy.balance.owes(debtor.name, creditor.name) : copy.balance.settled}
        </h2>
        {current || counting ? (
          <p data-balance-amount={current ? formatMoney(current.amount) : undefined} className="text-[clamp(32px,9vw,var(--money-l-size))] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink tabular-nums">
            <span aria-hidden="true" data-balance-counter="">{amountText}</span>
            <span className="sr-only">{current ? formatMoney(current.amount) : copy.balance.settled}</span>
          </p>
        ) : null}
        {size === "screen" ? <p className="text-[length:var(--body-s-size)] leading-[1.45] text-pretty text-ink-secondary">{current ? copy.balance.cumulative : copy.balance.settledNote}</p> : null}
      </div>

      <div className={size === "screen" ? "flex flex-col gap-4 rounded-[var(--radius-xl)] bg-raised px-4 py-[18px] shadow-raised" : "flex flex-col gap-2.5"}>
        {bars.map(({ row, member, geometry, status, label, net, before }) => (
          <div key={row.userId} className="flex flex-col gap-2">
            {size === "screen" ? (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] font-medium text-ink-secondary">
                <span className="flex min-w-0 items-center gap-2">
                  {member ? <Avatar person={member.joinOrder} initial={initialOf(member.name)} size={24} /> : null}
                  <span className="truncate font-semibold text-ink">{member?.name}</span>
                </span>
                <span className={`flex items-center gap-1 ${net === 0n ? "text-saving" : "text-ink"}`}>
                  {net === 0n ? <AppIcon name="check" weight="bold" size={14} /> : null}
                  {status}
                </span>
              </div>
            ) : null}
            <div role="img" aria-label={label} className={`relative ${height} [contain:layout]`}>
              <span aria-hidden="true" className="absolute inset-0 rounded-[10px] bg-sunken" />
              {geometry.segments.map((segment, index) => {
                const first = index === 0;
                const last = index === geometry.segments.length - 1 && segment.end >= 99.99;
                return (
                  <span
                    key={segment.kind}
                    aria-hidden="true"
                    data-segment={segment.kind}
                    data-new-segment={before && !before.has(segment.kind) ? "" : undefined}
                    style={{ left: `${segment.start}%`, width: `${segment.end - segment.start}%` }}
                    className={`absolute ${inset[segment.kind] ? "inset-y-[3px]" : "inset-y-0"} ${first ? "rounded-l-[10px]" : ""} ${last ? "rounded-r-[10px]" : ""} ${segment.kind === "paid" || segment.kind === "over" ? (member ? personFill[member.joinOrder] : "bg-ink-secondary") : ""} ${segmentClass[segment.kind]}`}
                  />
                );
              })}
              <span aria-hidden="true" style={{ left: `${geometry.mark}%` }} className="absolute -inset-y-[5px] -ml-px w-0.5 rounded-[2px] bg-ink" />
            </div>
            {size === "screen" ? <p className="text-[12px] text-ink-secondary tabular-nums">{copy.balance.paidLine(pesos(row.paid), pesos(row.share))}</p> : null}
          </div>
        ))}
        {size === "screen" ? (
          <ul aria-label={copy.balance.legend.label} className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[11px] font-medium text-ink-secondary">
            <li className="flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-0.5 bg-ink" />{copy.balance.legend.share}</li>
            {usedKinds.has("over") ? <li className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-4 rounded-[3px] ${personFill[1]} ${segmentClass.over}`} />{copy.balance.legend.over}</li> : null}
            {usedKinds.has("missing") ? <li className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-4 rounded-[3px] ${segmentClass.missing}`} />{copy.balance.legend.missing}</li> : null}
            {usedKinds.has("received") ? <li className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-4 rounded-[3px] ${segmentClass.received}`} />{copy.balance.legend.received}</li> : null}
            {usedKinds.has("settled") ? <li className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-4 rounded-[3px] ${segmentClass.settled}`} />{copy.balance.legend.settled}</li> : null}
          </ul>
        ) : (
          <p className="text-[12px] leading-[1.45] text-pretty text-ink-secondary">{copy.balance.moduleCaption}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function BalanceSkeleton({ size }: { size: "screen" | "module" }) {
  const bar = size === "screen" ? 28 : 16;
  return (
    <SkeletonGroup label={copy.balance.loading} className="flex flex-col gap-4">
      <Skeleton width={96} height={24} radius={8} />
      <Skeleton width="70%" height={28} />
      <Skeleton width={180} height={40} />
      <div className="flex flex-col gap-4 rounded-[var(--radius-xl)] bg-raised px-4 py-[18px]">
        {[0, 1].map((row) => (
          <div key={row} className="flex flex-col gap-2">
            <Skeleton width="50%" height={24} />
            <Skeleton height={bar} radius={10} />
            <Skeleton width="60%" height={14} />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

function BalanceError() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section role="alert" data-shared-balance="" className="flex flex-col items-start gap-3 rounded-[var(--radius-xl)] bg-raised p-5 shadow-raised">
      <AppIcon name="wifi-slash" weight="duotone" size={28} className="text-danger" />
      <h2 className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.balance.error.title}</h2>
      <p className="text-[length:var(--body-m-size)] text-pretty text-ink-secondary">{copy.balance.error.description}</p>
      <Button variant="secondary" icon="arrow-clockwise" loading={pending} loadingLabel={copy.primitives.loading} onClick={() => start(() => router.refresh())}>{copy.balance.error.retry}</Button>
    </section>
  );
}
