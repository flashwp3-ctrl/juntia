// T084 (simulación de la guía de salida interna, 12 de noviembre de 2026, fallo 1). Lo de cada aportante en una meta.
// `goal_member_balances` agrupa los asientos vivos, así que una persona sin ninguno (sus aportes se anularon o deshicieron,
// o todavía no aporta) no tiene fila. La lista de quién está en una meta no sale de ahí: en una compartida, los dos
// integrantes de la pareja aparecen siempre, con $0 si no tienen nada; en una personal, solo quien la mira (su dueña). Sin
// migración: la vista sigue igual y aquí solo se completan los ceros.
import type { GoalMemberTransport } from "@/lib/db/types";
import type { GoalMemberView, GoalPerson, GoalScope } from "./types";

const zero = (person: GoalPerson): GoalMemberView => ({
  ...person, contributedMinor: "0", withdrawnMinor: "0", usedMinor: "0", availableMinor: "0", contributionCount: 0,
});

/** Una persona que la vista no trajo: todo en cero. Sirve para no confundirla con alguien que sí tiene asientos. */
export const isEmptyMember = (member: GoalMemberView) =>
  member.contributionCount === 0 && [member.contributedMinor, member.withdrawnMinor, member.usedMinor, member.availableMinor].every((value) => BigInt(value) === 0n);

/** Por meta, lo de cada aportante en orden de ingreso; en las compartidas, los dos integrantes aunque tengan $0. */
export function membersByGoal(
  rows: readonly GoalMemberTransport[],
  people: readonly GoalPerson[],
  goals: readonly { id: string; scope: GoalScope }[],
): Record<string, GoalMemberView[]> {
  const byGoal: Record<string, GoalMemberView[]> = {};
  for (const goal of goals) {
    const expected = goal.scope === "shared" ? people : people.filter((person) => person.isMe);
    byGoal[goal.id] = expected.map((person) => {
      const row = rows.find((candidate) => candidate.goal_id === goal.id && candidate.user_id === person.userId);
      return row ? {
        ...person, contributedMinor: row.contributed_minor, withdrawnMinor: row.withdrawn_minor, usedMinor: row.used_minor,
        availableMinor: row.available_minor, contributionCount: Number(row.contribution_count),
      } : zero(person);
    }).sort((a, b) => a.joinOrder - b.joinOrder);
    // En una personal, sin ningún asiento, no hay nadie que mostrar (como antes): la meta inmersiva no lista a su dueña en $0.
    if (goal.scope === "personal" && byGoal[goal.id].every(isEmptyMember)) byGoal[goal.id] = [];
  }
  return byGoal;
}
