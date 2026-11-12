"use client";
// 004 PR C (T049) / FR-037, FR-075–FR-077, FR-101; US-4.5; SC-011; MOTION_SYSTEM §4 «Goal Journey». La meta inmersiva es una
// ruta, nunca un diálogo: el fallback (Q6) a pantalla completa con la hoja en móvil; desde lg, el fallback de un lado y el
// panel del otro (RESPONSIVE). La tarjeta crece hasta aquí con View Transitions (`goal-photo`, `goal-title` y
// `goal-ribbon` por meta, React 19.3 en las navegaciones del App Router); sin la API, el respaldo de Motion (`layoutId`).
// Al llegar, el foco va al título; × y Escape cierran hacia Metas y el foco vuelve a la tarjeta de origen. Con movimiento
// reducido: crossfade de 200 ms y la cinta ya llena; el valor final siempre está en el DOM. La cinta solo cambia tras la
// confirmación del servidor (la página nueva llega con `revalidatePath`); con error no anima nada (FR-077).
import Link from "next/link";
import * as m from "motion/react-m";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialOf } from "@/domain/account";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import { useOptionalAnnotate } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { ContributeSheet } from "./contribute-sheet";
import { cop, overlineOf, paceOf, reached, surplusOf } from "./format";
import { GoalFallback, overlineClass } from "./goal-card";
import { GoalFormSheet } from "./goal-form-sheet";
import { GoalHistory } from "./goal-history";
import { UsageRequests } from "@/features/expenses/goal-funding/usage-request-card";
import type { UsageRequestView } from "@/features/expenses/goal-funding/types";
import { rememberOrigin, useViewTransitionsSupported } from "./goal-journey";
import { GoalRibbon } from "./goal-ribbon";
import { GoalStatusDialog } from "./goal-status-dialog";
import { WithdrawSheet } from "./withdraw-sheet";
import type { GoalActions, GoalEntryView, GoalMemberView, GoalPerson, GoalView, PlanningContext } from "./types";

/** 004 PR D (T062; FR-056): `requests`, las solicitudes de fondos pendientes de esta meta (B4 y B5). */
type Props = { goal: GoalView; members: readonly GoalMemberView[]; entries: readonly GoalEntryView[]; people: readonly GoalPerson[]; today: string; context: PlanningContext; actions: GoalActions; requests?: readonly UsageRequestView[] };
type Open = { kind: "contribute" | "withdraw" | "edit" | "complete" | "archive"; key: string } | null;

/** Sin ninguna interacción del usuario en este documento: se llegó por URL (recarga, enlace o barra de direcciones). */
function arrivedWithoutInteraction() {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return activation?.hasBeenActive === false;
}

export function GoalImmersive({ goal, members, entries, people, today, context, actions, requests = [] }: Props) {
  const router = useRouter();
  const annotate = useOptionalAnnotate();
  const reduced = usePrefersReducedMotion();
  const supported = useViewTransitionsSupported();
  const title = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState<Open>(null);
  const pace = paceOf(goal, today);
  const active = goal.status === "active";
  const archived = goal.status === "archived";
  const surplus = surplusOf(goal);
  const canWithdraw = BigInt(goal.myAvailableMinor) > 0n;
  const show = (kind: NonNullable<Open>["kind"]) => setOpen({ kind, key: newIdempotencyKey() });
  const close = () => setOpen(null);

  // Al llegar, el foco va al título (MOTION_SYSTEM §4, «Teclado»). F04 (auditoría de Impeccable): si se entra por URL (recarga
  // o enlace, sin ninguna interacción en el documento), el foco es programático y no pinta el anillo: `focusVisible: false` y,
  // donde el navegador no lo admite, `data-quiet-focus` lo apaga hasta que el título pierde el foco. Al llegar desde la
  // tarjeta, el navegador decide como siempre: con un toque no hay anillo y con el teclado (Enter) sí.
  useEffect(() => {
    const node = title.current;
    if (!node) return;
    const byUrl = arrivedWithoutInteraction();
    if (byUrl) node.setAttribute("data-quiet-focus", "");
    node.focus({ preventScroll: true, ...(byUrl ? { focusVisible: false } : {}) });
  }, []);
  // Escape cierra la meta cuando no hay una hoja abierta (la hoja se cierra primero con su propio Escape). T084 (fallo 3): al
  // cerrar, × y Escape dejan dicho cuál es la tarjeta de origen (esta meta), aunque se haya llegado por URL o el origen ya se
  // haya consumido; así Metas siempre devuelve el foco a la tarjeta y nunca lo deja en BODY.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || open || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      rememberOrigin(goal.id);
      router.push("/metas");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goal.id, open, router]);

  // Con movimiento reducido, el crossfade de 200 ms lo hacen las View Transitions (globals.css); aquí nada aparece desde 0.
  return (
    <article aria-labelledby="goal-title" className="-mx-4 flex flex-col sm:-mx-6 lg:mx-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-start lg:gap-10 lg:pt-6">
      <ViewTransition name={`goal-photo-${goal.id}`} share="goal-morph" default="none">
        <m.div layoutId={supported || reduced ? undefined : `goal-photo-${goal.id}`} data-goal-tint={goal.goalType} className="relative isolate flex min-h-[min(52vh,460px)] flex-col justify-end overflow-hidden bg-[var(--goal-tint-bg)] px-6 pt-[max(76px,env(safe-area-inset-top))] pb-12 text-ink lg:sticky lg:top-8 lg:min-h-[min(78vh,720px)] lg:rounded-[38px] lg:px-10 lg:pb-12">
          <GoalFallback goal={goal} size="immersive" />
          <Link href="/metas" onClick={() => rememberOrigin(goal.id)} aria-label={copy.goals.immersive.close} className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 z-10 grid size-11 place-items-center rounded-full bg-raised text-ink shadow-raised hover:bg-sunken lg:top-6 lg:right-6">
            <AppIcon name="x" weight="bold" size={18} />
          </Link>
          <div className="relative flex flex-col gap-2">
            <p className={`${overlineClass} text-pending`}>{overlineOf(goal)}</p>
            <ViewTransition name={`goal-title-${goal.id}`} share="goal-morph" default="none">
              <h1 id="goal-title" ref={title} tabIndex={-1} onBlur={(event) => event.currentTarget.removeAttribute("data-quiet-focus")} className="max-w-[18ch] font-serif text-[clamp(44px,13vw,84px)] leading-[0.98] font-medium tracking-[-0.02em] text-balance outline-none focus-visible:outline-[length:var(--border-focus)] focus-visible:outline-offset-4 focus-visible:outline-focus focus-visible:outline-solid data-[quiet-focus]:focus-visible:outline-none lg:text-[clamp(56px,6vw,112px)]">
                {goal.name}
              </h1>
            </ViewTransition>
          </div>
        </m.div>
      </ViewTransition>

      <div className="relative -mt-7 flex flex-col gap-6 rounded-t-[28px] bg-canvas px-5 pt-6 pb-10 shadow-sheet lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0 lg:shadow-none">
        <section aria-label={copy.goals.immersive.target} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <p className="text-[clamp(40px,11vw,56px)] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">{copy.goals.percent(goal.progressPercent)}</p>
            <p className="pb-1 text-[15px] font-semibold text-ink tabular-nums">{copy.goals.ofTarget(cop(goal.balanceMinor), cop(goal.targetMinor))}</p>
          </div>
          <ViewTransition name={`goal-ribbon-${goal.id}`} share="goal-morph" default="none">
            <div><GoalRibbon members={members} targetMinor={goal.targetMinor} pacePercent={pace.kind === "line" ? pace.elapsedPercent : null} size="immersive" grow /></div>
          </ViewTransition>
          {goal.status === "completed" ? (
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink"><AppIcon name="flag-checkered" weight="fill" size={18} />{copy.goals.status.completed}</p>
          ) : active && reached(goal) ? (
            <p className="flex flex-col gap-0.5 text-[14px] text-ink"><span className="flex items-center gap-2 font-semibold"><AppIcon name="check-circle" weight="fill" size={18} className="text-saving" />{copy.goals.reached[context]}</span><span className="text-[13px] text-ink-secondary">{copy.goals.reachedHint}</span></p>
          ) : null}
          {surplus > 0n ? <p className="text-[13px] font-medium text-ink-secondary">{copy.goals.surplus(cop(surplus))}</p> : null}
          {pace.kind === "line" ? (
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-secondary">
              <span className="rounded-full border-[1.5px] border-dashed border-projection px-1.5 text-[11px] font-semibold">{copy.goals.pace.estimate}</span>{pace.text}
            </p>
          ) : pace.kind === "pastDue" ? <p className="text-[13px] text-ink-secondary">{pace.text}</p> : null}
          {goal.hasPendingRequest ? <p className="flex items-center gap-2 text-[13px] font-medium text-ink"><AppIcon name="clock" size={16} />{copy.goals.pending}</p> : null}
        </section>

        {members.length > 0 ? (
          <ul aria-label={copy.goals.immersive.available} className="flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3">
                <Avatar person={member.joinOrder} initial={initialOf(member.name)} size={32} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-semibold text-ink">{member.name}</span>
                  {/* F06 (propuesta aprobada el 11 de noviembre de 2026): arriba, lo DISPONIBLE de cada uno; el historial dice lo
                      aportado. Si ya se usó o retiró algo, también lo aportado, para que las dos cifras cuadren a la vista. */}
                  <span data-member-available="" className="text-[12px] text-ink-secondary tabular-nums">
                    {member.isMe ? copy.goals.immersive.availableMine(cop(member.availableMinor)) : copy.goals.immersive.availableOf(member.name, cop(member.availableMinor))}
                    {member.contributedMinor !== member.availableMinor ? copy.goals.immersive.contributedSuffix(cop(member.contributedMinor), member.isMe) : null}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {archived ? <p className="rounded-[14px] bg-sunken px-3 py-2.5 text-[13px] font-medium text-ink">{copy.goals.immersive.readOnly}</p> : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {active ? <Button size="lg" icon="piggy-bank" onClick={() => show("contribute")}>{copy.goals.immersive.contribute}</Button> : null}
              {/* Sin aportes propios disponibles no hay nada que retirar: la acción se deshabilita y se dice por qué (Q14). */}
              <Button size="lg" variant="secondary" icon="arrow-u-up-left" onClick={() => show("withdraw")} disabled={!canWithdraw} aria-describedby={canWithdraw ? undefined : "goal-withdraw-nothing"} className={active ? "" : "col-span-2"}>{copy.goals.immersive.withdraw}</Button>
            </div>
            {canWithdraw ? null : <p id="goal-withdraw-nothing" className="text-[13px] text-ink-secondary">{copy.goals.withdrawSheet.nothing}</p>}
            {goal.status === "completed" ? <p className="text-[13px] text-ink-secondary">{copy.goals.immersive.completedNote}</p> : null}
            <div role="group" aria-label={copy.goals.immersive.more} className="flex flex-wrap gap-2">
              <Button variant="ghost" icon="pencil-simple" onClick={() => show("edit")}>{copy.goals.immersive.edit}</Button>
              {active ? <Button variant="ghost" icon="flag-checkered" onClick={() => show("complete")}>{copy.goals.immersive.complete}</Button> : null}
              <Button variant="ghost" icon="archive" onClick={() => show("archive")}>{copy.goals.immersive.archive}</Button>
            </div>
          </div>
        )}

        <UsageRequests requests={requests} people={people} actions={actions.funding ?? null} />
        <GoalHistory goal={goal} entries={entries} members={members} people={people} today={today} actions={actions} />
      </div>

      {open?.kind === "contribute" ? (
        <ContributeSheet open onClose={close} goal={goal} context={context} today={today} idempotencyKey={open.key} actions={actions}
          onDone={(saved, payload) => { close(); annotate?.offerGoalUndo({ kind: "contribution", saved, message: copy.goals.contribute.done(cop(BigInt(payload.amountPesos) * 100n), goal.name) }); }} />
      ) : null}
      {open?.kind === "withdraw" ? (
        <WithdrawSheet open onClose={close} goal={goal} available={goal.myAvailableMinor} today={today} idempotencyKey={open.key} actions={actions}
          onDone={(saved, payload) => { close(); annotate?.offerGoalUndo({ kind: "withdrawal", saved, message: copy.goals.withdrawSheet.done(cop(BigInt(payload.amountPesos) * 100n), goal.name) }); }} />
      ) : null}
      {open?.kind === "edit" ? (
        <GoalFormSheet open onClose={close} goal={goal} context={context} today={today} idempotencyKey={open.key} actions={actions}
          onDone={() => { close(); annotate?.notify({ tone: "success", message: copy.goals.sheet.updated }); }} />
      ) : null}
      {open?.kind === "complete" || open?.kind === "archive" ? (
        <GoalStatusDialog kind={open.kind} goal={goal} idempotencyKey={open.key} actions={actions} onClose={close}
          onDone={() => { close(); annotate?.notify({ tone: "success", message: open.kind === "complete" ? copy.goals.statusDialog.completedDone : copy.goals.statusDialog.archivedDone }); }} />
      ) : null}
    </article>
  );
}
