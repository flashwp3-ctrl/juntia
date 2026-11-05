// @vitest-environment node
// T024 / FR-060: cada código del contrato se traduce y lo desconocido es unexpected.
import { expect, it } from "vitest";
import { mapDbError } from "./errors";
const codes = {
  JT001: "notAuthenticated", JT002: "invalidAmount", JT003: "amountOutOfRange", JT004: "invalidType",
  JT005: "invalidCategory", JT006: "invalidDate", JT007: "descriptionTooLong", JT008: "idempotencyKeyReused",
  JT009: "invalidIdempotencyKey", JT010: "transactionNotFound", JT011: "versionConflict", JT012: "transactionVoided",
  JT013: "immutableField", JT014: "invalidDisplayName", JT015: "invalidTheme", JT017: "invalidVoidReason",
  "40P01": "retryable", "40001": "retryable", "23514": "constraintViolation", "23503": "constraintViolation",
  "23505": "constraintViolation", "42501": "forbidden", PGRST301: "notAuthenticated",
};
it.each(Object.entries(codes))("%s → %s", (code, kind) => expect(mapDbError({ code, message: "technical detail" }).kind).toBe(kind));
it("HTTP, red y desconocidos sin filtrar mensaje técnico", () => {
  expect(mapDbError({ status: 401 }).kind).toBe("notAuthenticated");
  expect(mapDbError(new TypeError("fetch failed")).kind).toBe("network");
  expect(mapDbError({ code: "PGRST500" }).kind).toBe("unexpected");
  expect(mapDbError({ code: "unknown", message: "private detail" }).message).not.toContain("private detail");
});
