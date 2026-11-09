// @vitest-environment node
// T024 / FR-060: cada código del contrato se traduce y lo desconocido es unexpected.
import { expect, it } from "vitest";
import { mapDbError } from "./errors";
const codes = {
  JT201: "goalNotFound", JT202: "goalNotOpen", JT203: "goalContextMismatch", JT204: "insufficientMemberFunds",
  JT205: "entryNotFound", JT206: "entryNotVoidable", JT207: "entryAlreadyVoided", JT208: "invalidEntryDate",
  JT209: "usageExceedsExpense", JT210: "requestNotFound", JT211: "notRequestParty", JT212: "requestResolved",
  JT213: "amountBelowGoalUsage", JT214: "goalTransitionNotAllowed", JT215: "invalidGoal", JT216: "invalidFundingMode",
  JT217: "withdrawalReasonRequired", JT218: "budgetNotFound", JT219: "budgetAlreadyExists", JT220: "goalNegative",
  JT221: "invalidBudget", JT222: "appendOnly", JT223: "invalidUsageAllocation", JT224: "oneGoalPerExpense",
  JT225: "goalUndoNotAvailable", JT226: "nothingToRemove",
  JT101: "alreadyInCouple", JT102: "invitationNotFound", JT103: "invitationAlreadyAccepted", JT104: "invitationInvalid",
  JT105: "coupleNotActive", JT106: "nothingToSettle", JT107: "settlementExceedsPending", JT108: "invalidEmail",
  JT109: "invalidTokenHash", JT110: "invalidSplit", JT111: "notCoupleMember", JT112: "settlementNotFound",
  JT113: "settlementVoided", JT114: "invalidSettlementDate", JT115: "moveNotAllowed", JT116: "moveFundedByGoal",
  JT117: "undoNotAvailable", JT118: "invalidSplitMode", JT119: "invalidCoupleTransition",
  JT001: "notAuthenticated", JT002: "invalidAmount", JT003: "amountOutOfRange", JT004: "invalidType",
  JT005: "invalidCategory", JT006: "invalidDate", JT007: "descriptionTooLong", JT008: "idempotencyKeyReused",
  JT009: "invalidIdempotencyKey", JT010: "transactionNotFound", JT011: "versionConflict", JT012: "transactionVoided",
  JT013: "immutableField", JT014: "invalidDisplayName", JT015: "invalidTheme", JT017: "invalidVoidReason",
  "40P01": "retryable", "40001": "retryable", "23514": "constraintViolation", "23503": "constraintViolation",
  "23505": "constraintViolation", "42501": "forbidden", PGRST301: "notAuthenticated",
};
// 004 contracts/errors.md: «23505 sobre budgets_one_per_key ... JT219 ... solicitud pendiente ... JT212».
it.each([["budgets_one_per_key","budgetAlreadyExists"],["goal_usage_confirmations_one_pending","requestResolved"]])("004: %s",(name,kind)=>{
  expect(mapDbError({code:"23505",message:`duplicate key value violates unique constraint "${name}"`}).kind).toBe(kind);
});
// 003 T007 · contracts/errors.md: «23505 sobre los índices de pareja se traduce a JT101».
it.each(["group_members_one_couple_per_person", "group_invitations_one_pending"])("%s se traduce sin filtrar mensaje técnico", name => {
  expect(mapDbError({ code: "23505", message: `duplicate key value violates unique constraint "${name}"` }).kind).toBe("alreadyInCouple");
});
it.each(Object.entries(codes))("%s → %s", (code, kind) => expect(mapDbError({ code, message: "technical detail" }).kind).toBe(kind));
it("HTTP, red y desconocidos sin filtrar mensaje técnico", () => {
  expect(mapDbError({ status: 401 }).kind).toBe("notAuthenticated");
  expect(mapDbError(new TypeError("fetch failed")).kind).toBe("network");
  expect(mapDbError({ code: "", message: "TypeError: fetch failed", details: "internal fetch stack" }).kind).toBe("network");
  expect(mapDbError({ code: "", message: "AbortError: The operation was aborted" }).kind).toBe("network");
  expect(mapDbError({ code: "PGRST500" }).kind).toBe("unexpected");
  expect(mapDbError({ code: "unknown", message: "private detail" }).message).not.toContain("private detail");
});
