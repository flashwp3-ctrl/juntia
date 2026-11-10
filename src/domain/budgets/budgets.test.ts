// 004 FR-013, FR-015, FR-016: «consumo 0 con presupuesto activo → dentro, 0 %, distinto de null».
// Decisión 22.7: «Los meses anteriores conservan el límite que tenían».
import { budgetChangeKind, budgetState, displayedPercent, limitInForce } from "./index";
const p = (pesos: bigint) => pesos * 100n;
describe("presupuestos opcionales y vigencia (T002)", () => {
  it.each([
    [640000n, 900000n, "within", 71], [240000n, 260000n, "near", 92],
    [360000n, 340000n, "over", 105], [1180000n, 1000000n, "over", 118],
    [100n, 100n, "near", 100], [0n, 100n, "within", 0], [996n, 1000n, "near", 99],
  ] as const)("%s / %s", (consumed, limit, state, percent) => {
    expect(budgetState(p(consumed), p(limit))).toBe(state);
    expect(displayedPercent(p(consumed), p(limit))).toBe(percent);
  });
  it("ausencia no es cero y cerca se compara sin redondear", () => {
    expect(budgetState(0n, null)).toBe("none");
    expect(displayedPercent(0n, null)).toBeNull();
    expect(budgetState(84999n, 100000n)).toBe("within");
    expect(budgetState(85000n, 100000n)).toBe("near");
    expect(() => budgetState(0n, 0n)).toThrow();
    expect(budgetState(9007199254740993n, 9007199254740994n)).toBe("near");
  });
  it("la última versión vigente gana, también si desactiva", () => {
    const versions = [
      { effectiveMonth: "2026-10-01", changedAt: "2026-10-01T12:00:00Z", limitMinor: p(800000n) },
      { effectiveMonth: "2026-10-01", changedAt: "2026-10-03T12:00:00Z", limitMinor: p(900000n) },
      { effectiveMonth: "2026-11-01", changedAt: "2026-11-02T12:00:00Z", limitMinor: p(1000000n) },
      { effectiveMonth: "2026-12-01", changedAt: "2026-12-01T12:00:00Z", limitMinor: null },
    ];
    expect(["2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01"].map(m => limitInForce(versions, m)))
      .toEqual([null, p(900000n), p(1000000n), null]);
  });
});

// 004 PR B (T029, T033) / FR-018; US-2 escenario 6: «el historial con autor, fecha, valor anterior y nuevo, y la línea
// «Último cambio: Sara subió Mercado a $900.000 · 3 oct»». El tipo de cada cambio sale de la versión anterior del mismo
// presupuesto (`budget_history.previous_limit_minor`) y de si es la primera; desactivar es `null`, nunca un límite 0.
describe("tipo de cada cambio del historial (PR B)", () => {
  it.each([
    [null, p(800000n), true, "create"], [p(800000n), p(900000n), false, "raise"], [p(900000n), p(800000n), false, "lower"],
    [p(340000n), null, false, "deactivate"], [null, p(340000n), false, "reactivate"], [p(260000n), p(260000n), false, "keep"],
  ] as const)("%s → %s (primera: %s) = %s", (previous, limit, first, kind) => {
    expect(budgetChangeKind(previous, limit, first)).toBe(kind);
  });
});
