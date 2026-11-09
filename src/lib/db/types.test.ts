// T023 / FR-008: ningún campo de importe público admite number, tampoco argumentos RPC.
import { expectTypeOf, it } from "vitest";
import type { Database } from "../supabase/database.types";
import type { TransactionTransport, CreateTransactionInput, VoidResult, ReactivatedGoal } from "./types";
it("importes en texto o Money, nunca number", () => {
  expectTypeOf<Database["public"]["Views"]["my_transactions"]["Row"]["amount_minor"]>().toEqualTypeOf<string | null>();
  expectTypeOf<Database["public"]["Functions"]["create_transaction"]["Args"]["p_amount_minor"]>().toEqualTypeOf<string>();
  expectTypeOf<Database["public"]["Functions"]["update_transaction"]["Args"]["p_amount_minor"]>().toEqualTypeOf<string>();
  expectTypeOf<TransactionTransport["amount_minor"]>().toEqualTypeOf<string>();
  expectTypeOf<CreateTransactionInput["amount"]["amountMinor"]>().toEqualTypeOf<bigint>();
  expectTypeOf<VoidResult["reactivated_goals"]>().toEqualTypeOf<ReactivatedGoal[]|undefined>();
});

// T019: presencia y tipo de todos los importes nuevos en el artefacto generado.
import {expect} from "vitest";
import {readFileSync} from "node:fs";
import ts from "typescript";
it("public generado incluye planificación y ningún importe admite number",()=>{
 const text=readFileSync("src/lib/supabase/database.types.ts","utf8");
 const source=ts.createSourceFile("types.ts",text,ts.ScriptTarget.Latest,true);
 const money=/^(?:.*_minor|gasto_consumo|aporte_a_metas|retiro_de_metas|gasto_financiado_con_meta|total_destinado_neto)$/;
 const found=new Set<string>();const bad:string[]=[];
 const visit=(node:ts.Node)=>{if(ts.isPropertySignature(node)&&node.type){const name=node.name.getText(source).replaceAll('"',"");if(money.test(name)){found.add(name);if(/\bnumber\b/.test(node.type.getText(source)))bad.push(name);}}ts.forEachChild(node,visit);};visit(source);
 expect(bad).toEqual([]);for(const name of ["limit_minor","balance_minor","my_available_minor","target_minor","aporte_a_metas","total_destinado_neto","p_own_minor","p_requested_minor"])expect(found.has(name),name).toBe(true);
});
