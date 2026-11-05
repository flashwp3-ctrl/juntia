// T023 / FR-008: ningún campo de importe público admite number, tampoco argumentos RPC.
import { expectTypeOf, it } from "vitest";
import type { Database } from "../supabase/database.types";
import type { TransactionTransport, CreateTransactionInput } from "./types";
it("importes en texto o Money, nunca number", () => {
  expectTypeOf<Database["public"]["Views"]["my_transactions"]["Row"]["amount_minor"]>().toEqualTypeOf<string | null>();
  expectTypeOf<Database["public"]["Functions"]["create_transaction"]["Args"]["p_amount_minor"]>().toEqualTypeOf<string>();
  expectTypeOf<Database["public"]["Functions"]["update_transaction"]["Args"]["p_amount_minor"]>().toEqualTypeOf<string>();
  expectTypeOf<TransactionTransport["amount_minor"]>().toEqualTypeOf<string>();
  expectTypeOf<CreateTransactionInput["amount"]["amountMinor"]>().toEqualTypeOf<bigint>();
});
