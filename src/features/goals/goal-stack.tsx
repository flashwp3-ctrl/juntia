"use client";
// 004 PR C (T045) / FR-035, FR-076; US-4.10; GoalStack [P], aprobado en su forma (decisión 22.2; COMPONENT_SPECIFICATIONS):
// hasta tres capas visibles —la frontal completa, la segunda asoma 60 px con nombre y %, la tercera solo un canto de
// color— y un pie con «N metas» y «Ver todas», siempre visible como alternativa al gesto. 0 metas: nada (la pantalla
// enseña el vacío); 1: solo la tarjeta; 2: frontal + 1; 3 o más: frontal + 2; más de 3, el conteo en el pie.
// Tocar la frontal la abre; tocar la que asoma la trae al frente (spring `card`). Teclado: Tab entre tarjetas y Enter abre.
// Lector de pantalla: una lista de metas, no un carrusel; las que no caben en la pila siguen en la lista (fuera de la
// vista y fuera del orden de tabulación: «Ver todas» es el camino del teclado). Desde lg, la pila se abre en abanico
// horizontal (la segunda girada 4°) con «+» punteado para crear meta (RESPONSIVE).
// La `[V]` de rendimiento del abanico con 6 metas en gama media (T054) es del gestor; si falla, el PR cae a la lista.
import * as m from "motion/react-m";
import { useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { copy } from "@/lib/copy/es";
import { usePrefersReducedMotion } from "@/lib/motion/reduced";
import { GoalCard } from "./goal-card";
import type { GoalMemberView, GoalView, PlanningContext } from "./types";

type Props = {
  goals: readonly GoalView[];
  members: Readonly<Record<string, readonly GoalMemberView[]>>;
  today: string;
  context: PlanningContext;
  /** El «+» del abanico. Sin él (Inicio), no hay «+». */
  onCreate?: () => void;
  /** Encabezado accesible de la lista; por defecto «Metas». */
  label?: string;
  /** Abanico desde lg (Metas). En una columna estrecha (Inicio), la pila sigue vertical. */
  fan?: boolean;
};

const card = { type: "spring", stiffness: 260, damping: 28, mass: 1 } as const;
// Posición de cada capa: en móvil, apiladas hacia arriba (la segunda deja 60 px a la vista y la tercera un canto de 12);
// desde lg, en abanico hacia la derecha, la segunda girada 4°.
const WIDE = "lg:w-[280px]";
function layerClass(visible: number, index: number, fan: boolean) {
  if (!fan) {
    if (index === 0) return `relative z-30 ${visible === 3 ? "mt-[72px]" : visible === 2 ? "mt-[60px]" : ""}`;
    return `absolute inset-x-0 origin-top ${index === 1 ? `${visible === 3 ? "top-[12px]" : "top-0"} z-20 scale-x-[.96]` : "top-0 z-10 scale-x-[.92]"}`;
  }
  if (index === 0) return `relative z-30 ${visible === 3 ? "mt-[72px]" : visible === 2 ? "mt-[60px]" : ""} lg:mt-0 ${visible === 1 ? "" : WIDE}`;
  const mobile = index === 1 ? `${visible === 3 ? "top-[12px]" : "top-0"} z-20 scale-x-[.96]` : "top-0 z-10 scale-x-[.92]";
  const spread = index === 1 ? "lg:left-[224px] lg:rotate-[4deg]" : "lg:left-[448px] lg:rotate-[7deg]";
  return `absolute inset-x-0 origin-top ${mobile} lg:inset-x-auto lg:top-2 lg:origin-bottom-left lg:scale-x-100 ${spread} ${WIDE}`;
}

export function GoalStack({ goals, members, today, context, onCreate, label = copy.goals.stack.list, fan = true }: Props) {
  const reduced = usePrefersReducedMotion();
  const [front, setFront] = useState(0);
  const [listed, setListed] = useState(false);
  if (goals.length === 0) return null;
  const start = front < goals.length ? front : 0;
  const ordered = [...goals.slice(start), ...goals.slice(0, start)];
  const visible = Math.min(ordered.length, 3);
  const footer = (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{copy.goals.stack.count(goals.length)}</span>
      <button type="button" onClick={() => setListed((value) => !value)} aria-expanded={listed}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] px-2 text-[length:var(--label-m-size)] font-semibold text-ink underline underline-offset-4 hover:bg-sunken">
        {listed ? copy.goals.stack.collapse : copy.goals.stack.seeAll}
      </button>
    </div>
  );
  if (listed) {
    return (
      <div className="flex flex-col gap-3">
        <ul aria-label={copy.goals.stack.showAll} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => <li key={goal.id}><GoalCard goal={goal} members={members[goal.id] ?? []} today={today} context={context} /></li>)}
        </ul>
        {footer}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="lg:flex lg:items-start lg:gap-6">
        <ul aria-label={label} className={`relative flow-root ${fan ? `lg:h-[244px] lg:flex-none ${visible === 1 ? "lg:w-full lg:max-w-[360px]" : visible === 2 ? "lg:w-[504px]" : "lg:w-[728px]"}` : ""}`}>
          {ordered.map((goal, index) => {
            const shown = index < visible;
            return (
              <m.li
                key={goal.id}
                layout={reduced ? false : "position"}
                transition={card}
                data-stack-layer={shown ? index : undefined}
                className={shown ? layerClass(visible, index, fan) : "sr-only"}
              >
                <GoalCard
                  goal={goal}
                  members={members[goal.id] ?? []}
                  today={today}
                  context={context}
                  peek={index > 0 && shown}
                  tabIndex={shown ? undefined : -1}
                  // La que asoma se trae al frente con el primer toque; la frontal (o Enter con el teclado) abre.
                  onPeekClick={index > 0 && shown ? (event) => { if (event.detail > 0) { event.preventDefault(); setFront(goals.indexOf(goal)); } } : undefined}
                />
              </m.li>
            );
          })}
        </ul>
        {onCreate ? (
          <button type="button" onClick={onCreate}
            className="hidden h-[228px] w-[132px] shrink-0 flex-col items-center justify-center gap-2 rounded-[26px] border-[length:var(--border-strong)] border-dashed border-border-emphasis text-[length:var(--label-m-size)] font-semibold text-ink hover:bg-sunken lg:flex">
            <AppIcon name="plus" weight="bold" size={22} />
            {copy.goals.stack.create}
          </button>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
