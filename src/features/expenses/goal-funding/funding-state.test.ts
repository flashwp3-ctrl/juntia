// F20 (auditoría de Impeccable; propuesta aprobada por los fundadores el 11 de noviembre de 2026) — capa: componentes (lógica
// pura de la hoja). «Tus fondos» se precarga con tu parte del reparto (50/50 de $300.000 son $150.000) o, si no aplica,
// redondeado a mil; nunca por encima de lo disponible. El servidor sigue validando lo que se envía (FR-090).
import { describe, expect, it } from "vitest";
import { evaluateFunding, proposeFunds } from "./funding-state";
import type { Contributor } from "./types";

const minor = (pesos: bigint) => (pesos * 100n).toString();
const sara = (available: bigint): Contributor => ({ userId: "sara", name: "Sara", joinOrder: 1, isMe: true, availableMinor: minor(available) });
const tomas = (available: bigint): Contributor => ({ userId: "tomas", name: "Tomás", joinOrder: 2, isMe: false, availableMinor: minor(available) });
// Japón en el dataset dorado: Sara 6.120.000 y Tomás 5.220.000 disponibles.
const japan = [sara(6120000n), tomas(5220000n)];
const half = (expense: bigint) => ({ minePesos: expense / 2n, expensePesos: expense });

describe("proposeFunds (F20)", () => {
  it("con reparto 50/50 de un uso de $300.000: $150.000 cada uno, no $160.676", () => {
    expect(proposeFunds(japan, 300000, half(300000n))).toEqual({ sara: 150000, tomas: 150000 });
  });

  it("con reparto 55/45 (Arriendo): tu parte exacta del uso, y el resto para el otro", () => {
    expect(proposeFunds(japan, 1600000, { minePesos: 880000n, expensePesos: 1600000n })).toEqual({ sara: 880000, tomas: 720000 });
  });

  it("si el uso es menor que el gasto, tu parte del reparto se aplica al uso", () => {
    expect(proposeFunds(japan, 200000, half(300000n))).toEqual({ sara: 100000, tomas: 100000 });
  });

  it("nunca por encima de lo disponible: lo que no cabe en uno pasa al otro", () => {
    expect(proposeFunds([sara(100000n), tomas(5220000n)], 300000, half(300000n))).toEqual({ sara: 100000, tomas: 200000 });
    expect(proposeFunds([sara(6120000n), tomas(50000n)], 300000, half(300000n))).toEqual({ sara: 250000, tomas: 50000 });
  });

  it("si no eres parte del reparto, el otro pone todo lo que le cabe", () => {
    expect(proposeFunds(japan, 300000, { minePesos: 0n, expensePesos: 300000n })).toEqual({ sara: 0, tomas: 300000 });
  });

  it("sin reparto: lo proporcional a lo disponible, redondeado a mil, y la suma cuadra con el uso", () => {
    // 300.000 × 6,12/11,34 = 161.904,8 → 162.000; Tomás 138.000.
    const funds = proposeFunds(japan, 300000);
    expect(funds).toEqual({ sara: 162000, tomas: 138000 });
    expect(evaluateFunding({ expensePesos: 300000, usagePesos: 300000, funds, contributors: japan }).kind).toBe("ok");
  });

  it("un solo aportante (Yo, meta personal): todo el uso, con su tope", () => {
    expect(proposeFunds([sara(1050000n)], 300000)).toEqual({ sara: 300000 });
    expect(proposeFunds([tomas(1050000n)], 300000, half(300000n))).toEqual({ tomas: 300000 });
  });

  it("si el uso supera lo disponible de todos, o no hay uso, no propone nada", () => {
    expect(proposeFunds([sara(100000n), tomas(100000n)], 300000, half(300000n))).toEqual({ sara: null, tomas: null });
    expect(proposeFunds(japan, null, half(300000n))).toEqual({ sara: null, tomas: null });
    expect(proposeFunds(japan, 0)).toEqual({ sara: null, tomas: null });
  });

  it("toda propuesta cuadra con el uso y respeta los topes (la valida evaluateFunding)", () => {
    for (const [usage, share] of [[300000, half(300000n)], [186400, { minePesos: 102520n, expensePesos: 186400n }], [999, half(999n)], [11340000, half(11340000n)]] as const) {
      const funds = proposeFunds(japan, usage, share);
      expect(evaluateFunding({ expensePesos: usage, usagePesos: usage, funds, contributors: japan }).kind).toBe("ok");
    }
  });
});
