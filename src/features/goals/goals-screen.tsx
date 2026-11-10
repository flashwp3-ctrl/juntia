"use client";
// 004 PR C (T045, T046) / FR-030, FR-035, FR-036, FR-085–FR-087, FR-103; US-4.1, US-4.3, US-4.8, US-4.10; Q11; 04·3, 04·6.
// Nosotros: solo metas compartidas, con «Apartado en metas compartidas» (de `goals_totals`, nunca sumando páginas) y «Es
// dinero apartado, no gastado. Sigue donde lo tengan.». Yo: «Tus metas» (personales, con su total) y, aparte, «Metas
// compartidas» con «Tus aportes $X» de cada una, sin un total que sume las dos (decisión 22.11). Las archivadas salen del
// listado principal y quedan en «Archivadas», de solo lectura. Sin metas: 04·6 con `flag-banner` y «Crear una meta». La
// hoja de crear guarda el contexto con el que se abrió (FR-099).
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ExitState } from "@/components/shell/provisional-state";
import { newIdempotencyKey } from "@/features/expenses/idempotency";
import { useOptionalAnnotate } from "@/features/expenses/annotate-provider";
import { copy } from "@/lib/copy/es";
import { cop } from "./format";
import { GoalCard, goalTypeIcon } from "./goal-card";
import { GoalFormSheet } from "./goal-form-sheet";
import { takeReturnFocus } from "./goal-journey";
import { GoalStack } from "./goal-stack";
import type { GoalActions, GoalPerson, GoalsScreenData, GoalView } from "./types";

type Props = { data: GoalsScreenData; people: readonly GoalPerson[]; today: string; actions: GoalActions };
const sectionTitle = "font-serif text-[length:var(--title-m-size)] leading-[var(--title-m-line)] font-medium text-ink";

function Total({ label, note, amount }: { label: string; note: string; amount: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[length:var(--label-s-size)] font-medium text-ink-secondary">{label}</p>
      <p data-goals-total="" className="text-[length:var(--money-l-size)] leading-[var(--money-l-line)] font-semibold tracking-[var(--money-l-tracking)] text-ink tabular-nums">{amount}</p>
      <p className="text-[13px] text-ink-secondary">{note}</p>
    </div>
  );
}

function Archived({ goals }: { goals: readonly GoalView[] }) {
  if (goals.length === 0) return null;
  return (
    <section aria-labelledby="goals-archived" className="flex flex-col gap-2">
      <h2 id="goals-archived" className={sectionTitle}>{copy.goals.sections.archived}</h2>
      <ul className="flex flex-col divide-y-[length:var(--border-hairline)] divide-border">
        {goals.map((goal) => (
          <li key={goal.id}>
            <Link href={`/metas/${goal.id}`} className="flex min-h-14 items-center gap-3 py-2 text-ink hover:bg-sunken">
              <span aria-hidden="true" data-goal-tint={goal.goalType} className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--goal-tint-bg)] text-[color:var(--goal-tint-icon)]"><AppIcon name={goalTypeIcon[goal.goalType]} weight="duotone" size={20} /></span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{goal.name}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-secondary">
                  <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-border-emphasis px-1.5 text-[10px] font-semibold tracking-[0.06em] text-ink"><AppIcon name="archive" size={12} />{copy.goals.status.archived}</span>
                  {copy.goals.ofTarget(cop(goal.balanceMinor), cop(goal.targetMinor))}
                </span>
              </span>
              <AppIcon name="caret-right" size={18} className="text-ink-secondary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GoalsScreen({ data, today, actions }: Props) {
  const annotate = useOptionalAnnotate();
  const [creating, setCreating] = useState<string | null>(null);
  const { context } = data;
  const open = data.goals.filter((goal) => goal.status !== "archived");
  const archived = data.goals.filter((goal) => goal.status === "archived");
  const personal = open.filter((goal) => goal.scope === "personal");
  const shared = open.filter((goal) => goal.scope === "shared");
  const create = () => setCreating(newIdempotencyKey());

  // Al volver de la meta inmersiva, el foco vuelve a la tarjeta de origen (MOTION_SYSTEM §4).
  useEffect(() => {
    const id = takeReturnFocus();
    if (id) document.querySelector<HTMLElement>(`[data-goal-card="${id}"]`)?.focus({ preventScroll: false });
  }, []);

  const sheet = creating ? (
    <GoalFormSheet open onClose={() => setCreating(null)} context={context} today={today} idempotencyKey={creating} actions={actions}
      onDone={(saved) => { setCreating(null); annotate?.notify({ tone: "success", message: copy.goals.sheet.created(saved.name) }); }} />
  ) : null;

  if (open.length === 0) {
    const empty = copy.goals.empty[context];
    return (
      <div className="flex flex-col gap-8 pb-6">
        <ExitState icon="flag-banner" title={empty.title} description={empty.description} actions={<Button size="lg" icon="plus" onClick={create}>{empty.action}</Button>} />
        <Archived goals={archived} />
        {sheet}
      </div>
    );
  }

  const createButton = <Button variant="secondary" icon="plus" onClick={create} className="lg:hidden">{copy.goals.stack.create}</Button>;
  return (
    <div className="flex flex-col gap-8 pt-5 pb-6 lg:gap-10 lg:pt-8">
      {context === "us" ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {data.totals ? <Total label={copy.goals.totals.us} note={copy.goals.totals.usNote} amount={cop(data.totals.balanceMinor)} /> : <span />}
            {createButton}
          </div>
          <GoalStack goals={shared} members={data.members} today={today} context="us" onCreate={create} />
        </>
      ) : (
        <>
          <section aria-labelledby="goals-mine" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="goals-mine" className={sectionTitle}>{copy.goals.sections.mine}</h2>
              {createButton}
            </div>
            {data.totals && personal.length > 0 ? <Total label={copy.goals.totals.me} note={copy.goals.totals.meNote} amount={cop(data.totals.balanceMinor)} /> : null}
            {personal.length > 0
              ? <GoalStack goals={personal} members={data.members} today={today} context="me" onCreate={create} label={copy.goals.sections.mine} />
              : <p className="text-[length:var(--body-m-size)] text-ink-secondary">{copy.goals.empty.me.description}</p>}
          </section>
          {shared.length > 0 ? (
            <section aria-labelledby="goals-shared" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="goals-shared" className={sectionTitle}>{copy.goals.sections.shared}</h2>
                <p className="text-[13px] text-ink-secondary">{copy.goals.sections.sharedNote}</p>
              </div>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {shared.map((goal) => (
                  <li key={goal.id} className="flex flex-col gap-2">
                    <GoalCard goal={goal} members={data.members[goal.id] ?? []} today={today} context="me" />
                    <p className="px-1 text-[13px] font-semibold text-ink tabular-nums">{copy.goals.yourShare(cop(goal.myAvailableMinor))}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <Archived goals={archived} />
      {sheet}
    </div>
  );
}
