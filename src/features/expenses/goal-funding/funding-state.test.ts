// F20 (auditoría de Impeccable; propuesta aprobada por los fundadores el 11 de noviembre de 2026) y F77-3 (revisión del PR #77)
// — capa: componentes (lógica pura de la hoja). «Tus fondos» se precarga con tu parte del reparto: el uso se reparte en
// proporción a lo asignado a cada integrante en el reparto del gasto, en pesos enteros con mayor residuo y desempate por orden
// de ingreso (ADR-002); sin reparto, lo proporcional a lo disponible redondeado a mil; nunca por encima de lo disponible. El
// servidor sigue validando lo que se envía (FR-090). Los repartos se construyen con el dominio (`splitAmount`) y la propuesta se
// compara con lo que da el dominio (`proposeFunding`), no solo con la suma.
import { describe, expect, it } from "vitest";
import { splitAmount } from "@/domain/allocations";
import { proposeFunding } from "@/domain/goals";
import { moneyFromPesos } from "@/domain/money";
import { evaluateFunding, proposeFunds, type SplitShares } from "./funding-state";
import type { Contributor } from "./types";

const minor = (pesos: bigint) => (pesos * 100n).toString();
const person = (userId: string, name: string, joinOrder: 1 | 2, isMe: boolean, available: bigint): Contributor => ({ userId, name, joinOrder, isMe, availableMinor: minor(available) });
const sara = (available: bigint, joinOrder: 1 | 2 = 1) => person("sara", "Sara", joinOrder, true, available);
const tomas = (available: bigint, joinOrder: 1 | 2 = 2) => person("tomas", "Tomás", joinOrder, false, available);
// Japón en el dataset dorado: Sara 6.120.000 y Tomás 5.220.000 disponibles.
const japan = [sara(6120000n), tomas(5220000n)];

/** El reparto del gasto como lo calcula el dominio, convertido a lo que recibe la propuesta. */
function shares(expensePesos: bigint, mode: "equal" | "percent" | "amount", order: { sara: number; tomas: number } = { sara: 1, tomas: 2 }, values: Record<string, number | bigint> = {}): SplitShares {
  const people = [{ userId: "sara", joinOrder: order.sara }, { userId: "tomas", joinOrder: order.tomas }];
  return splitAmount(moneyFromPesos(expensePesos), mode, people, values).map(({ userId, amount }) => ({ userId, joinOrder: userId === "sara" ? order.sara : order.tomas, pesos: amount.amountMinor / 100n }));
}
/** Lo que da el dominio para el uso sobre esas asignaciones (antes de topes). */
const domain = (split: SplitShares, usage: bigint) => Object.fromEntries(proposeFunding(split!.map(({ userId, joinOrder, pesos }) => ({ userId, joinOrder, amountMinor: pesos * 100n })), usage * 100n).map(({ userId, amountMinor }) => [userId, Number(amountMinor / 100n)]));

describe("proposeFunds (F20, F77-3)", () => {
  it("con reparto 50/50 de un uso de $300.000: $150.000 cada uno, no $160.676", () => {
    expect(proposeFunds(japan, 300000, shares(300000n, "equal"))).toEqual({ sara: 150000, tomas: 150000 });
  });

  it("50/50 con uso impar: 1.001 → 501 para Sara (primera en ingresar) y 500 para Tomás, como el dominio", () => {
    const split = shares(1001n, "equal");
    expect(proposeFunds(japan, 1001, split)).toEqual({ sara: 501, tomas: 500 });
    expect(proposeFunds(japan, 1001, split)).toEqual(domain(split, 1001n));
  });

  it("si Sara es la SEGUNDA en ingresar, el desempate favorece a Tomás: 1.001 → 500 y 501", () => {
    const order = { sara: 2, tomas: 1 };
    const split = shares(1001n, "equal", order);
    const contributors = [sara(6120000n, 2), tomas(5220000n, 1)];
    expect(proposeFunds(contributors, 1001, split)).toEqual({ sara: 500, tomas: 501 });
    expect(proposeFunds(contributors, 1001, split)).toEqual(domain(split, 1001n));
  });

  it("55/45 con uso parcial: 25 de un gasto de 101 (asignado 56/45) → 14 y 11, por mayor residuo", () => {
    const split = shares(101n, "percent", undefined, { sara: 55, tomas: 45 });
    expect(split).toEqual([{ userId: "sara", joinOrder: 1, pesos: 56n }, { userId: "tomas", joinOrder: 2, pesos: 45n }]);
    expect(proposeFunds(japan, 25, split)).toEqual({ sara: 14, tomas: 11 });
    expect(proposeFunds(japan, 25, split)).toEqual(domain(split, 25n));
  });

  it("montos fijos: el uso se reparte en proporción a esos montos; con el uso igual al gasto, cada uno pone su parte", () => {
    const split = shares(1600000n, "amount", undefined, { sara: 88000000n, tomas: 72000000n });
    expect(proposeFunds(japan, 1600000, split)).toEqual({ sara: 880000, tomas: 720000 });
    expect(proposeFunds(japan, 1000000, split)).toEqual(domain(split, 1000000n));
  });

  it("nunca por encima de lo disponible: lo que no cabe en uno pasa al otro", () => {
    const split = shares(300000n, "equal");
    expect(proposeFunds([sara(100000n), tomas(5220000n)], 300000, split)).toEqual({ sara: 100000, tomas: 200000 });
    expect(proposeFunds([sara(6120000n), tomas(50000n)], 300000, split)).toEqual({ sara: 250000, tomas: 50000 });
  });

  it("si no eres parte del reparto, el otro pone todo lo que le cabe", () => {
    const split = splitAmount(moneyFromPesos(300000n), "equal", [{ userId: "tomas", joinOrder: 2 }]).map(({ userId, amount }) => ({ userId, joinOrder: 2, pesos: amount.amountMinor / 100n }));
    expect(proposeFunds(japan, 300000, split)).toEqual({ sara: 0, tomas: 300000 });
  });

  it("sin reparto: lo proporcional a lo disponible, redondeado a mil, y la suma cuadra con el uso", () => {
    // 300.000 × 6,12/11,34 = 161.904,8 → 162.000; Tomás 138.000.
    const funds = proposeFunds(japan, 300000);
    expect(funds).toEqual({ sara: 162000, tomas: 138000 });
    expect(evaluateFunding({ expensePesos: 300000, usagePesos: 300000, funds, contributors: japan }).kind).toBe("ok");
  });

  it("un solo aportante (Yo, meta personal): todo el uso, con su tope", () => {
    expect(proposeFunds([sara(1050000n)], 300000)).toEqual({ sara: 300000 });
    expect(proposeFunds([tomas(1050000n)], 300000, shares(300000n, "equal"))).toEqual({ tomas: 300000 });
  });

  it("si el uso supera lo disponible de todos, o no hay uso, no propone nada", () => {
    expect(proposeFunds([sara(100000n), tomas(100000n)], 300000, shares(300000n, "equal"))).toEqual({ sara: null, tomas: null });
    expect(proposeFunds(japan, null, shares(300000n, "equal"))).toEqual({ sara: null, tomas: null });
    expect(proposeFunds(japan, 0)).toEqual({ sara: null, tomas: null });
  });

  it("toda propuesta cuadra con el uso y respeta los topes (la valida evaluateFunding)", () => {
    for (const [usage, split] of [[300000, shares(300000n, "equal")], [186400, shares(186400n, "percent", undefined, { sara: 55, tomas: 45 })], [999, shares(999n, "equal")], [11340000, shares(11340000n, "equal")]] as const) {
      const funds = proposeFunds(japan, usage, split);
      expect(evaluateFunding({ expensePesos: usage, usagePesos: usage, funds, contributors: japan }).kind).toBe("ok");
    }
  });
});
