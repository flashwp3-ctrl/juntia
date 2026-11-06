// 003 T003 · FR-025/026/030: «net = pagado − corresponde + enviadas − recibidas», suma cero; ADR-007.
import { moneyFromPesos as pesos } from "../money";
import { computeBalance, settlementSuggestion } from ".";
const members = [{ userId: "sara", joinOrder: 1 }, { userId: "tomas", joinOrder: 2 }];
const expense = (total: bigint) => ({ amount: pesos(total), payerUserId: "sara", status: "active" as const, allocations: [{ userId: "sara", amount: pesos(total / 2n) }, { userId: "tomas", amount: pesos(total - total / 2n) }] });
const settlement = { amount: pesos(90000n), fromUserId: "tomas", toUserId: "sara", status: "active" as const };
it("cena 180.000, liquidación completa y corrección que invierte el saldo (US-02/10)", () => {
  const before = computeBalance([expense(180000n)], [], members);
  expect(before.map(p => p.net.amountMinor)).toEqual([9000000n, -9000000n]);
  expect(settlementSuggestion(before)).toEqual({ fromUserId: "tomas", toUserId: "sara", amount: pesos(90000n) });
  expect(settlementSuggestion(computeBalance([expense(180000n)], [settlement], members))).toBeNull();
  const corrected = computeBalance([expense(100000n)], [settlement], members);
  expect(settlementSuggestion(corrected)).toEqual({ fromUserId: "sara", toUserId: "tomas", amount: pesos(40000n) });
  expect(computeBalance([expense(180000n)], [{ ...settlement, status: "voided" }], members)).toEqual(before);
  expect(computeBalance([{ ...expense(180000n), status: "voided" }], [], members).every(p => p.net.amountMinor === 0n)).toBe(true);
});
it("la suma de net es cero para importes y liquidaciones variables, también N integrantes", () => {
  for (let i = 1n; i <= 300n; i++) {
    const rows = computeBalance([expense(i * 8761n)], [{ ...settlement, amount: pesos(i * 17n) }], members);
    expect(rows.reduce((s, p) => s + p.net.amountMinor, 0n)).toBe(0n);
  }
  const three = [...members, { userId: "carla", joinOrder: 3 }];
  const rows = computeBalance([{ amount: pesos(30n), payerUserId: "carla", status: "active", allocations: three.map(p => ({ userId: p.userId, amount: pesos(10n) })) }], [], three);
  expect(rows.map(p => p.net.amountMinor)).toEqual([-1000n, -1000n, 2000n]);
});
it("rechaza partes sin reconciliar o actores ajenos al grupo", () => {
  expect(() => computeBalance([{ ...expense(10n), amount: pesos(11n) }], [], members)).toThrow();
  expect(() => computeBalance([{ ...expense(10n), payerUserId: "outsider" }], [], members)).toThrow();
  expect(() => computeBalance([], [{ ...settlement, toUserId: "outsider" }], members)).toThrow();
});
