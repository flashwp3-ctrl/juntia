// 003 T002 · FR-019/019a/020: «las partes suman exactamente el importe», pesos enteros y desempate por ingreso (ADR-002).
import { moneyFromPesos as pesos } from "../money";
import { splitAmount, validateSplit, nextSplitOnParticipantsChange, SPLIT_VERSION } from ".";
import { gasto_consumo } from "../metrics";
const members = [{ userId: "sara", joinOrder: 1 }, { userId: "tomas", joinOrder: 2 }];
const parts = (amount: bigint, mode: "equal" | "percent" | "amount", values: Record<string, number | bigint> = {}) => splitAmount(pesos(amount), mode, members, values).map(p => p.amount.amountMinor / 100n);
it("aplica los ejemplos obligatorios de FR-019a sin dar el residuo al pagador", () => {
  expect(SPLIT_VERSION).toBe(1);
  expect(parts(150000n, "percent", { sara: 70, tomas: 30 })).toEqual([105000n, 45000n]);
  expect(parts(100001n, "equal")).toEqual([50001n, 50000n]);
  expect(parts(100001n, "percent", { sara: 33, tomas: 67 })).toEqual([33000n, 67001n]);
  expect(parts(100001n, "percent", { sara: 100, tomas: 0 })).toEqual([100001n, 0n]);
  expect(splitAmount(pesos(100001n), "equal", [members[0]], {})).toEqual([{ userId: "sara", amount: pesos(100001n) }]);
  expect(parts(100001n, "amount", { sara: 200n, tomas: 9999900n })).toEqual([2n, 99999n]);
});
it("suma exacta, múltiplos de 100, determinismo e independencia del orden de entrada", () => {
  let seed = 7203n;
  for (let i = 0; i < 1000; i++) {
    seed = (seed * 48271n) % 2147483647n;
    const total = 1n + seed % 999999999n;
    const percent = Number(seed % 101n);
    for (const mode of ["equal", "percent", "amount"] as const) {
      const values = mode === "amount" ? { sara: (total / 3n) * 100n, tomas: (total - total / 3n) * 100n } : { sara: percent, tomas: 100 - percent };
      const result = splitAmount(pesos(total), mode, members, values);
      expect(result.reduce((s, p) => s + p.amount.amountMinor, 0n)).toBe(total * 100n);
      expect(result.every(p => p.amount.amountMinor >= 0n && p.amount.amountMinor % 100n === 0n)).toBe(true);
      expect(splitAmount(pesos(total), mode, [...members].reverse(), values)).toEqual(result);
      expect(splitAmount(pesos(total), mode, members, values)).toEqual(result);
    }
  }
});
it("rechaza repartos inválidos y devuelve cuánto falta o sobra sin redondear", () => {
  expect(validateSplit(pesos(10n), [{ userId: "sara", amount: pesos(7n) }])).toEqual({ valid: false, missing: pesos(3n), excess: pesos(0n) });
  expect(validateSplit(pesos(10n), [{ userId: "sara", amount: pesos(12n) }])).toEqual({ valid: false, missing: pesos(0n), excess: pesos(2n) });
  for (const values of [{ sara: 50, tomas: 49 }, { sara: -1, tomas: 101 }, { sara: 50.5, tomas: 49.5 }]) expect(() => parts(10n, "percent", values)).toThrow();
  expect(() => splitAmount(pesos(10n), "equal", [], {})).toThrow();
  expect(() => splitAmount(pesos(10n), "equal", [members[0], members[0]], {})).toThrow();
  expect(() => splitAmount({ currency: "COP", amountMinor: 101n }, "equal", members, {})).toThrow();
});
it("55/45 → uno → dos restaura; 100/0 → uno → dos vuelve a 50/50 (FR-019a)", () => {
  for (const [sara, tomas, restored] of [[55, 45, { sara: 55, tomas: 45 }], [100, 0, {}]] as const) {
    const initial = { mode: "percent" as const, participants: members, values: { sara, tomas } };
    const single = nextSplitOnParticipantsChange(initial, [members[0]]);
    expect(splitAmount(pesos(100001n), single.mode, single.participants, single.values)).toEqual([{ userId: "sara", amount: pesos(100001n) }]);
    const again = nextSplitOnParticipantsChange(single, members);
    expect(again.mode).toBe(sara === 55 ? "percent" : "equal");
    expect(again.values).toEqual(restored);
  }
});
// 005 T013 · FR-012 (US-08), SC-001: «gasto grupal 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada persona, nunca
// 800.000». El total del grupo es el importe del gasto una sola vez; las partes son la parte de cada persona.
it("US-08 literal: 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada persona, nunca 800.000", () => {
  const amount = pesos(400000n);
  const result = splitAmount(amount, "equal", members);
  expect(result).toEqual([{ userId: "sara", amount: pesos(200000n) }, { userId: "tomas", amount: pesos(200000n) }]);
  const sumOfParts = result.reduce((sum, part) => sum + part.amount.amountMinor, 0n);
  expect(sumOfParts).toBe(amount.amountMinor);
  expect(validateSplit(amount, result)).toEqual({ valid: true, missing: pesos(0n), excess: pesos(0n) });
  // Revisión del PR #87, F87-7: el total del grupo y el de cada persona salen de la función de dominio real que agrega el
  // consumo (`gasto_consumo`), no de una constante: el gasto del grupo cuenta una vez, y cada persona, su parte.
  const month = "2026-10";
  const expense = (amountMinor: bigint) => ({ amountMinor, transactionDate: "2026-10-03", type: "expense", status: "active" });
  const groupTotal = gasto_consumo([expense(amount.amountMinor)], month);
  expect(groupTotal).toBe(pesos(400000n).amountMinor);
  expect(groupTotal).not.toBe(pesos(800000n).amountMinor);
  for (const part of result) expect(gasto_consumo([expense(part.amount.amountMinor)], month)).toBe(pesos(200000n).amountMinor);
  expect(result.reduce((sum, part) => sum + gasto_consumo([expense(part.amount.amountMinor)], month), 0n)).toBe(groupTotal);
});
