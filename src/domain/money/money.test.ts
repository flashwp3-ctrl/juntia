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
    // Revisión del PR #44: «$412.900», sin espacio, como el diseño.
    expect(formatMoney(moneyFromPesos(412900n))).toBe("$412.900");
    expect(formatMoney({ amountMinor: -20000000n, currency: "COP" })).toBe("-$200.000");
    expect(formatMoney(moneyFromPesos(9007199254740993n))).toBe("$9.007.199.254.740.993");
  });
});

// 005 · PR B, corrección 3 (FR-052; maestro §15.7, INP < 200 ms). Laboratorio del run 44349192421: guardar en Anotar a 1440
// pasó de 200 ms, y el perfil de CPU de esa interacción atribuyó a formatMoney la mayor parte del JavaScript propio: construía
// un Intl.NumberFormat en cada llamada, y cada fila y cada total lo llaman al volver a pintarse. Criterio: el formateador se
// construye una vez y el resultado no cambia.
describe("formatMoney — un solo formateador (corrección 3 del PR B)", () => {
  it("no construye un Intl.NumberFormat por llamada", () => {
    const spy = vi.spyOn(Intl, "NumberFormat");
    try {
      expect([formatMoney(moneyFromPesos(412_900n)), formatMoney(moneyFromPesos(-1_500n)), formatMoney(moneyFromPesos(0n))]).toEqual(["$412.900", "-$1.500", "$0"]);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
