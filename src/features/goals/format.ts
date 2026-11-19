// 004 PR C (T045–T049) / FR-034, FR-037; Q9; GoalCard. Cómo se dicen en pantalla las cifras de una meta. El saldo, el
// progreso y lo de cada aportante llegan del servidor (vistas de una sola sentencia, FR-096); aquí solo se formatean. El
// ritmo es la aritmética descriptiva de `goalPace` del dominio (decisión 22.9): nunca una predicción ni «Llegarán».
import { goalPace } from "@/domain/goals";
import { formatMoney, type Money } from "@/domain/money";
import { copy } from "@/lib/copy/es";
import { monthName } from "@/lib/format";
import type { GoalPerson, GoalView } from "./types";

export const money = (minor: string | bigint): Money => ({ amountMinor: typeof minor === "bigint" ? minor : BigInt(minor), currency: "COP" });
export const cop = (minor: string | bigint) => formatMoney(money(minor));

/** «abril de 2027», del primer día del mes objetivo. */
export const targetMonthLabel = (targetMonth: string) => `${monthName(targetMonth.slice(0, 7))} de ${targetMonth.slice(0, 4)}`;

/** La fecha de creación de la meta en Bogotá (AAAA-MM-DD): un aporte nunca puede ser anterior (Q12). */
export function createdDay(createdAt: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(createdAt));
}

export type Pace = { kind: "line"; text: string; elapsedPercent: number } | { kind: "pastDue"; text: string } | { kind: "none" };

/** Q9: «Faltan $X en {n} meses · $Y al mes» con fecha futura; «La fecha era {mes}» si ya pasó; nada sin fecha. */
export function paceOf(goal: GoalView, today: string): Pace {
  if (!goal.targetMonth) return { kind: "none" };
  const pace = goalPace({ balanceMinor: BigInt(goal.balanceMinor), targetMinor: BigInt(goal.targetMinor), createdAt: goal.createdAt, targetMonth: goal.targetMonth }, today);
  if (!pace) return { kind: "pastDue", text: copy.goals.pace.pastDue(targetMonthLabel(goal.targetMonth)) };
  if (pace.remainingMinor === 0n) return { kind: "none" };
  return { kind: "line", text: copy.goals.pace.line(cop(pace.remainingMinor), pace.months, cop(pace.monthlyMinor)), elapsedPercent: pace.elapsedPercent };
}

/** Metadatos de 04·3: «COMPARTIDA · PARA ABRIL DE 2027» o «PERSONAL · SIN FECHA». */
export function overlineOf(goal: GoalView) {
  const when = goal.targetMonth ? copy.goals.due(targetMonthLabel(goal.targetMonth)) : copy.goals.noDate;
  return `${goal.scope === "shared" ? copy.goals.scope.shared : copy.goals.scope.personal} · ${when}`;
}

/**
 * Orden de la pila (decisión del fundador del 10 de noviembre de 2026): al frente, la meta con el aporte no anulado más
 * reciente (fecha del aporte y, en el mismo día, el registrado más tarde). Las que no tienen aportes van detrás, y los
 * empates, por creación: la más antigua primero. Por último el id, para un orden total estable.
 */
export function stackOrder(a: GoalView, b: GoalView): number {
  const byCreation = a.createdAt !== b.createdAt ? (a.createdAt < b.createdAt ? -1 : 1) : a.id < b.id ? -1 : 1;
  if (a.lastContributionDate === null || b.lastContributionDate === null) {
    if (a.lastContributionDate === b.lastContributionDate) return byCreation;
    return a.lastContributionDate === null ? 1 : -1;
  }
  if (a.lastContributionDate !== b.lastContributionDate) return a.lastContributionDate > b.lastContributionDate ? -1 : 1;
  const at = (value: string | null) => (value === null ? 0 : Date.parse(value));
  if (at(a.lastContributionCreatedAt) !== at(b.lastContributionCreatedAt)) return at(a.lastContributionCreatedAt) > at(b.lastContributionCreatedAt) ? -1 : 1;
  return byCreation;
}

export const reached = (goal: GoalView) => BigInt(goal.balanceMinor) >= BigInt(goal.targetMinor);
export const surplusOf = (goal: GoalView) => {
  const extra = BigInt(goal.balanceMinor) - BigInt(goal.targetMinor);
  return extra > 0n ? extra : 0n;
};

/** El porcentaje que se muestra: entero truncado, nunca por encima de lo que es (FR-034). */
export const percentOf = (balanceMinor: bigint, targetMinor: bigint) => (targetMinor > 0n && balanceMinor > 0n ? Number((balanceMinor * 100n) / targetMinor) : 0);

export function accessibleName(goal: GoalView) {
  return copy.goals.card.accessibleName({
    name: goal.name, scope: (goal.scope === "shared" ? copy.goals.scope.shared : copy.goals.scope.personal).toLowerCase(),
    percent: goal.progressPercent, balance: cop(goal.balanceMinor), target: cop(goal.targetMinor),
  });
}

/** Nombre de una persona por su id, o vacío si ya no está en la pareja. */
export const personName = (people: readonly GoalPerson[], userId: string | null) => people.find((person) => person.userId === userId)?.name ?? "";

// F79-2: la tabla vive en src/lib/text-fit.ts desde el PR B de P0-4, que la usa también en los títulos de acceso.
export { longestWordEm } from "@/lib/text-fit";
