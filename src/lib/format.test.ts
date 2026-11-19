// 005 · PR B, corrección 3 (FR-052; maestro §15.7, INP < 200 ms): como formatMoney (src/domain/money), `pesos` se llama en
// cada fila al volver a pintarse; construía un Intl.NumberFormat por llamada. Criterio: un solo formateador, mismo resultado.
import { afterEach, describe, expect, it, vi } from "vitest";
import { moneyFromPesos } from "@/domain/money";
import { pesos } from "./format";

describe("pesos — un solo formateador (corrección 3 del PR B)", () => {
  afterEach(() => vi.restoreAllMocks());
  it("no construye un Intl.NumberFormat por llamada y redondea igual", () => {
    const spy = vi.spyOn(Intl, "NumberFormat");
    expect([pesos(moneyFromPesos(412_900n)), pesos(moneyFromPesos(-1_500n)), pesos({ amountMinor: 149n, currency: "COP" })]).toEqual(["412.900", "1.500", "1"]);
    expect(spy).not.toHaveBeenCalled();
  });
});
