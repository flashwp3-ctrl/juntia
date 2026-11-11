"use client";
// 004 PR C (T050) / FR-070; US-9; DEC-G04 (maestro §15.4; DESIGN_SYSTEM [A]); 04·7. En Inicio, el ahorro va aparte del gasto:
// el número héroe sigue siendo `gasto_consumo` y lo apartado del mes (`aporte_a_metas`, de `metric_months`) es un bloque
// propio que nunca se suma al héroe —«Apartado para metas $X · Son cosas distintas: no se suman.» en Nosotros y «Apartaste
// $X para metas» en Yo—. `total_destinado_neto` no aparece en Inicio (§15.4: solo en Análisis). El módulo de metas es la
// pila (o la tarjeta sola) con su cinta y su ritmo; sin metas, invita a crear una sin cifras (§15.10).
// 004 PR D: las notas sobre el verde de ahorro van en tinta (text.secondary daba 4,38:1; axe de goal-expense.a11y.ts).
import Link from "next/link";
import { AppIcon } from "@/components/ui/app-icon";
import { cop } from "@/features/goals/format";
import { GoalStack } from "@/features/goals/goal-stack";
import type { HomeGoals, PlanningContext } from "@/features/goals/types";
import { copy } from "@/lib/copy/es";
import { PendingRequests } from "@/features/expenses/goal-funding/usage-request-card";

/** «Apartado para metas»: el ahorro del mes, aparte del héroe. Sin aportes en el mes, no se pinta. */
export function SetAsideLine({ goals, context }: { goals: HomeGoals; context: PlanningContext }) {
  if (BigInt(goals.setAsideMinor) <= 0n) return null;
  const amount = cop(goals.setAsideMinor);
  if (context === "me") {
    return (
      <p data-set-aside="" className="flex items-start gap-2.5 rounded-[16px] bg-saving-subtle px-3.5 py-3 text-[14px] leading-[1.45] text-ink">
        <AppIcon name="piggy-bank" weight="duotone" size={20} className="mt-px shrink-0 text-saving" />
        <span className="flex flex-col gap-0.5"><span className="font-semibold">{copy.goals.home.meSetAside(amount)}</span><span className="text-[13px] text-ink">{copy.goals.home.meNote}</span></span>
      </p>
    );
  }
  return (
    <section aria-labelledby="home-set-aside" data-set-aside="" className="flex items-start gap-3 rounded-[16px] bg-saving-subtle px-3.5 py-3 text-ink">
      <AppIcon name="piggy-bank" weight="duotone" size={22} className="mt-0.5 shrink-0 text-saving" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <h2 id="home-set-aside" className="text-[14px] font-semibold">{copy.goals.home.usSetAside}</h2>
          <span className="text-[17px] font-semibold text-saving tabular-nums">{amount}</span>
        </span>
        <span className="text-[13px] text-ink">{copy.goals.home.usNote}</span>
      </span>
    </section>
  );
}

/**
 * El módulo de metas de Inicio: la pila del contexto, cuyo pie «N metas · Ver todas» es el único camino a Metas (decisión de
 * los fundadores del 11 de noviembre de 2026: sin «Ver metas» en el encabezado); sin metas, una invitación sin cifras.
 */
export function GoalsModule({ goals, context, today }: { goals: HomeGoals; context: PlanningContext; today: string }) {
  return (
    <section aria-labelledby="home-goals" data-goals-home="" className="flex flex-col gap-3 lg:rounded-[var(--radius-xl)] lg:p-5 lg:shadow-[0_0_0_1.5px_var(--color-border-subtle)]">
      <h2 id="home-goals" className="font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink">{copy.goals.home.module}</h2>
      {/* 004 PR D (T062; FR-056): en Nosotros, la solicitud de fondos en la sesión del otro (B5) y la propia (B4). */}
      {goals.requests?.length && goals.people ? <PendingRequests requests={goals.requests} people={goals.people} /> : null}
      {goals.goals.length > 0 ? (
        <GoalStack goals={goals.goals} members={goals.members} today={today} context={context} label={copy.goals.home.module} fan={false} seeAllHref="/metas" />
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-[16px] border-[length:var(--border-strong)] border-dashed border-border-emphasis px-4 py-4">
          <p className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-ink-secondary"><AppIcon name="flag-banner" weight="duotone" size={20} className="mt-px shrink-0 text-saving" />{copy.goals.home.createHint}</p>
          <Link href="/metas" className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] bg-raised px-3.5 text-[length:var(--label-m-size)] font-semibold text-ink shadow-raised hover:bg-sunken">
            <AppIcon name="plus" weight="bold" size={16} />{copy.goals.home.create}
          </Link>
        </div>
      )}
    </section>
  );
}
