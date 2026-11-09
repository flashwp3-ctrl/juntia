"use client";
// 004 PR C (T045) / FR-034–FR-037, FR-076, FR-103; US-4.3, US-4.6, US-4.9; GoalCard (COMPONENT_SPECIFICATIONS) con el
// fallback sin foto aprobado ([A]): fondo de ahorro, inicial gigante en serif al 30 % e ícono Duotone del tipo de meta,
// texto en tinta (Q6: sin fotos en P0-3). Anatomía: metadatos (COMPARTIDA/PERSONAL + fecha) · nombre en Brygada 1918 ·
// % · cinta · importe. Con el saldo ≥ objetivo, «Lo lograron» como sugerencia y el excedente neutro; el estado solo
// cambia con «Dar por lograda» (Q15). Lograda: `flag-checkered` y la cinta llena. El ritmo es una estimación marcada con
// el patrón punteado, nunca una promesa (Q9; glosario §9). La tarjeta es un enlace a la meta inmersiva con nombre
// accesible con cifras; tocarla recuerda su rectángulo para Goal Journey y el retorno del foco.
import Link, { useLinkStatus } from "next/link";
import * as m from "motion/react-m";
import { ViewTransition, type MouseEvent } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { accessibleName, cop, overlineOf, paceOf, reached, surplusOf, targetMonthLabel } from "./format";
import { GoalRibbon } from "./goal-ribbon";
import { rememberOrigin, useViewTransitionsSupported } from "./goal-journey";
import type { GoalMemberView, GoalType, GoalView, PlanningContext } from "./types";

export const goalTypeIcon: Record<GoalType, AppIconName> = {
  travel: "airplane-tilt", home: "house-line", wedding: "heart", vehicle: "car-profile", education: "graduation-cap", emergency: "lifebuoy", other: "flag-banner",
};

/**
 * Revisión del PR #68 (T052): la navegación a la meta inmersiva espera a la página (sin Skeleton intermedio, para que la
 * View Transition se forme). Mientras tanto, la tarjeta tocada responde: un indicador en su esquina y el anuncio
 * «Abriendo {meta}…». Sin espera fija: lo decide el estado del enlace (`useLinkStatus`). Con movimiento reducido no gira.
 */
function OpeningMark({ name }: { name: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span role="status" data-goal-opening="" className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-raised text-ink shadow-raised">
      <AppIcon name="circle-notch" weight="bold" size={18} className="motion-safe:animate-[button-spin_0.8s_linear_infinite]" />
      <span className="sr-only">{copy.goals.card.opening(name)}</span>
    </span>
  );
}

export const overlineClass = "text-[length:var(--overline-size)] leading-[var(--overline-line)] font-semibold tracking-[var(--overline-tracking)] uppercase";

type Props = {
  goal: GoalView;
  members: readonly GoalMemberView[];
  today: string;
  context: PlanningContext;
  /** Capa que asoma en la pila: arriba, el nombre y el %. */
  peek?: boolean;
  /** La capa que asoma trae su tarjeta al frente en lugar de abrirla (GoalStack, «Gestos»). */
  onPeekClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
  tabIndex?: number;
};

/** Lo visible de una meta sin foto (Q6): lo comparten la tarjeta y la meta inmersiva. */
export function GoalFallback({ goal, size, peek = false }: { goal: GoalView; size: "card" | "immersive"; peek?: boolean }) {
  return (
    <>
      <span data-goal-fallback="" aria-hidden="true" className={`pointer-events-none absolute font-serif leading-none font-medium text-saving opacity-30 select-none ${size === "card" ? "-right-3 -bottom-16 text-[248px]" : "-right-6 -bottom-24 text-[min(88vw,440px)] lg:-bottom-28 lg:text-[min(44vw,560px)]"}`}>
        {goal.name.trim().charAt(0).toLocaleUpperCase("es-CO")}
      </span>
      <AppIcon name={goalTypeIcon[goal.goalType]} weight="duotone" size={size === "card" ? 30 : 44} className={`absolute text-saving ${peek ? "hidden" : ""} ${size === "card" ? "top-5 right-5" : "top-[max(20px,env(safe-area-inset-top))] left-6 lg:top-10 lg:left-10"}`} />
    </>
  );
}

export function GoalCard({ goal, members, today, context, peek = false, onPeekClick, className = "", tabIndex }: Props) {
  const supported = useViewTransitionsSupported();
  const pace = paceOf(goal, today);
  const completed = goal.status === "completed";
  const suggest = goal.status === "active" && reached(goal);
  const surplus = surplusOf(goal);
  const ribbonMembers = completed && members.length === 0 ? [{ userId: "lleno", name: "", joinOrder: 1 as const, availableMinor: goal.targetMinor }] : members;
  const [scope, when] = overlineOf(goal).split(" · ");
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (onPeekClick) { onPeekClick(event); if (event.defaultPrevented) return; }
    rememberOrigin(goal.id);
  };
  return (
    <ViewTransition name={`goal-photo-${goal.id}`} share="goal-morph" default="none">
      <m.div layoutId={supported ? undefined : `goal-photo-${goal.id}`} className={`relative ${className}`}>
        <Link
          href={`/metas/${goal.id}`}
          data-goal-card={goal.id}
          onClick={open}
          tabIndex={tabIndex}
          className="group relative isolate flex h-[228px] flex-col justify-between overflow-hidden rounded-[26px] bg-saving-subtle p-5 text-ink shadow-float outline-offset-[3px] motion-safe:transition-transform motion-safe:duration-[var(--duration-quick)] active:scale-[.99]"
        >
          {/* WCAG 2.5.3: el nombre del enlace es un texto propio con las cifras; lo visible repite lo mismo y no se lee dos veces. */}
          <span className="sr-only">{accessibleName(goal)}{completed ? `, ${copy.goals.status.completed.toLowerCase()}` : suggest ? `, ${copy.goals.reached[context]}` : ""}</span>
          <GoalFallback goal={goal} size="card" peek={peek} />
          <OpeningMark name={goal.name} />
          <span aria-hidden="true" className={`relative flex min-w-0 flex-col gap-1 ${peek ? "-mt-1.5 pr-16 lg:pl-14" : "pr-12"}`}>
            <span className={`${overlineClass} text-ink ${peek ? "hidden" : ""}`}>
              <span>{scope}</span>{" · "}<span>{when === copy.goals.noDate ? copy.goals.noDate : copy.goals.due(targetMonthLabel(goal.targetMonth!))}</span>
            </span>
            <ViewTransition name={`goal-title-${goal.id}`} share="goal-morph" default="none">
              <span className={`font-serif font-medium tracking-[-0.015em] ${peek ? "truncate text-[24px] leading-[1.15]" : "line-clamp-2 text-[clamp(26px,8vw,32px)] leading-[1.04] text-balance"}`}>{goal.name}</span>
            </ViewTransition>
          </span>
          {peek ? <span aria-hidden="true" className="absolute top-3.5 right-4 rounded-full bg-raised px-2.5 py-1 text-[13px] font-semibold tabular-nums shadow-raised">{copy.goals.percent(goal.progressPercent)}</span> : null}
          <span aria-hidden="true" className={`relative flex flex-col gap-2.5 ${peek ? "invisible" : ""}`}>
            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2">
                <span className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{copy.goals.percent(goal.progressPercent)}</span>
                {completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em] text-ink shadow-raised">
                    <AppIcon name="flag-checkered" weight="fill" size={13} />{copy.goals.status.completed}
                  </span>
                ) : suggest ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[12px] font-semibold text-ink shadow-raised">
                    <AppIcon name="check-circle" weight="fill" size={13} className="text-saving" />{copy.goals.reached[context]}
                  </span>
                ) : null}
              </span>
              <span className="text-[13px] font-medium text-ink tabular-nums">{copy.goals.ofTarget(cop(goal.balanceMinor), cop(goal.targetMinor))}</span>
            </span>
            <ViewTransition name={`goal-ribbon-${goal.id}`} share="goal-morph" default="none">
              <span className="block"><GoalRibbon members={ribbonMembers} targetMinor={goal.targetMinor} pacePercent={pace.kind === "line" ? pace.elapsedPercent : null} /></span>
            </ViewTransition>
            {surplus > 0n ? <span data-goal-surplus="" className="text-[12px] font-medium text-ink">{copy.goals.surplus(cop(surplus))}</span> : null}
            {pace.kind === "line" ? (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[1.35] text-ink">
                <span className="rounded-full border-[1.5px] border-dashed border-ink px-1.5 text-[11px] font-semibold text-ink">{copy.goals.pace.estimate}</span>
                <span>{pace.text}</span>
              </span>
            ) : pace.kind === "pastDue" ? <span className="text-[12px] leading-[1.35] text-ink">{pace.text}</span> : null}
          </span>
        </Link>
      </m.div>
    </ViewTransition>
  );
}
