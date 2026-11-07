const kinds = {
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
} as const;
export type DbErrorKind = (typeof kinds)[keyof typeof kinds] | "unexpected" | "network" | "retryExhausted";
export class DbError extends Error {
  constructor(readonly kind: DbErrorKind) { super(kind); this.name = "DbError"; }
}
export function mapDbError(error: unknown): DbError {
  if (error instanceof DbError) return error;
  if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) return new DbError("network");
  if (typeof error === "object" && error !== null) {
    if ("status" in error && error.status === 401) return new DbError("notAuthenticated");
    if ("code" in error && error.code === "23505" && "message" in error && typeof error.message === "string") {
      if (/unique constraint "budgets_one_per_key"/.test(error.message)) return new DbError("budgetAlreadyExists");
      if (/unique constraint "goal_usage_confirmations_one_pending"/.test(error.message)) return new DbError("requestResolved");
    }
    if ("code" in error && error.code === "23505" && "message" in error && typeof error.message === "string"
      && /unique constraint "(?:group_members_one_couple_per_person|group_invitations_one_pending)"/.test(error.message)) return new DbError("alreadyInCouple");
    if ("code" in error && typeof error.code === "string" && Object.hasOwn(kinds, error.code)) return new DbError(kinds[error.code as keyof typeof kinds]);
    // PostgREST envuelve los fallos de fetch en un objeto con code vacío.
    if ("code" in error && error.code === "" && "message" in error && typeof error.message === "string"
      && /^(?:TypeError: (?:fetch failed|Failed to fetch|Load failed)|AbortError:|FetchError:)/.test(error.message)) return new DbError("network");
  }
  return new DbError("unexpected");
}
