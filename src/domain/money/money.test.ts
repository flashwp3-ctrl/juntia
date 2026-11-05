// FR-012: «El dominio tiene un tipo Money en unidades menores ISO 4217 con bigint,
// sin number; COP se escribe en pesos enteros y se convierte exacto» (spec.md).
import { type Money, MAX_COP_PESOS, moneyFromPesos, parseAmountMinor, serializeAmountMinor, formatMoney } from "./index";

describe("Money — contrato de precisión", () => {
  it("no admite number en ninguna frontera pública", () => {
    expectTypeOf<Money["amountMinor"]>().toEqualTypeOf<bigint>();
    expectTypeOf<Parameters<typeof moneyFromPesos>[0]>().toEqualTypeOf<bigint>();
    expectTypeOf<Parameters<typeof parseAmountMinor>[0]>().toEqualTypeOf<string>();
    expectTypeOf<ReturnType<typeof serializeAmountMinor>>().toEqualTypeOf<string>();
    expectTypeOf<Parameters<typeof serializeAmountMinor>[0]>().toEqualTypeOf<Money>();
    expectTypeOf<Parameters<typeof formatMoney>[0]>().toEqualTypeOf<Money>();
    expect(moneyFromPesos(45000n)).toEqual({ amountMinor: 4500000n, currency: "COP" });
    expect(MAX_COP_PESOS).toBe(999999999n);
  });
  // ADR-013 [V] 6: «ida y vuelta de 9007199254740993 y de los límites de bigint».
  it.each(["0", "4500000", "9007199254740993", "9223372036854775807"])("conserva %s exacto", (text) => {
    expect(serializeAmountMinor(parseAmountMinor(text))).toBe(text);
  });
  it.each(["", "-1", "+1", "1.5", "1e3", " 1", "1\n", "abc", "9223372036854775808", "00000000000000000000"])("rechaza %j", (text) => {
    expect(() => parseAmountMinor(text)).toThrow();
  });
  it("formatea es-CO sin decimales sin perder precisión", () => {
    expect(formatMoney(moneyFromPesos(412900n))).toMatch(/^\$\s?412\.900$/);
    expect(formatMoney(moneyFromPesos(9007199254740993n))).toMatch(/^\$\s?9\.007\.199\.254\.740\.993$/);
  });
});
