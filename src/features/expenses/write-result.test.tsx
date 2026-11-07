// T042 (spec 003, PR C) / FR-059; contracts/server-actions.md §1; contracts/errors.md — capa: componentes.
// Criterio literal (tasks.md, T042): «`ok`/`rejected`/`unknown` (con `unknown` nunca se afirma que no se escribió)».
// T045 amplía el módulo común del PR B (src/features/shared/write-result.ts) a las escrituras de gasto compartido y de
// Mover a Pareja: cada `JT` de esas funciones es un rechazo confirmado con lo que la interfaz sabe decir, y la red, el
// tiempo agotado o un 5xx sin código siguen siendo desconocidos. Las acciones que se consultan con `write_status` son
// las de `idempotency_records`.
import { describe, expect, it } from "vitest";
import { DbError } from "@/lib/db/errors";
import { outcomeFromError, runWrite, SHARED_WRITE_ACTIONS } from "@/features/shared/write-result";

describe("clasificación de las escrituras compartidas (T045)", () => {
  it.each([
    ["versionConflict", { status: "rejected", error: "versionConflict" }],
    ["transactionVoided", { status: "rejected", error: "alreadyDeleted" }],
    ["transactionNotFound", { status: "rejected", error: "notFound" }],
    ["invalidSplit", { status: "rejected", error: "invalidSplit" }],
    ["invalidSplitMode", { status: "rejected", error: "invalidSplit" }],
    ["notCoupleMember", { status: "rejected", error: "invalidSplit" }],
    ["coupleNotActive", { status: "rejected", error: "coupleNotActive" }],
    ["moveNotAllowed", { status: "rejected", error: "moveNotAllowed" }],
    ["moveFundedByGoal", { status: "rejected", error: "moveNotAllowed" }],
    ["undoNotAvailable", { status: "rejected", error: "undoNotAvailable" }],
    ["invalidAmount", { status: "rejected", error: "invalid" }],
    ["invalidCategory", { status: "rejected", error: "invalid" }],
    ["invalidDate", { status: "rejected", error: "invalid" }],
    ["descriptionTooLong", { status: "rejected", error: "invalid" }],
    ["notAuthenticated", { status: "rejected", error: "sessionExpired" }],
    ["network", { status: "unknown" }],
    ["retryExhausted", { status: "unknown" }],
    ["retryable", { status: "unknown" }],
    ["unexpected", { status: "unknown" }],
  ] as const)("%s → %o", (kind, outcome) => {
    expect(outcomeFromError(new DbError(kind))).toEqual(outcome);
  });

  it("runWrite: un fallo de red es unknown y nunca se convierte en rechazo", async () => {
    await expect(runWrite(async () => { throw new TypeError("fetch failed"); })).resolves.toEqual({ status: "unknown" });
    await expect(runWrite(async () => 1)).resolves.toEqual({ status: "ok", value: 1 });
  });

  it("las acciones consultables con write_status incluyen las cinco escrituras del PR C", () => {
    expect(SHARED_WRITE_ACTIONS).toEqual(["create_shared_expense", "update_shared_expense", "void_shared_expense", "reclassify_to_shared", "undo_reclassify_to_shared"]);
  });
});
