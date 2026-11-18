// 005 T014 · FR-012 (US-08), SC-001: «gasto grupal 400.000 al 50/50 → 400.000 del grupo, 200.000 a cada persona, nunca
// 800.000», leído de las vistas que lee Inicio · Nosotros (`loadCoupleHome`: `couple_month_summary` para el total del
// mes y `couple_balance` para la parte de cada persona) en UNA sola sentencia, con la sesión de un integrante. El
// dominio puede acertar y la vista contar doble: por eso esta capa (Anexo A de tasks.md).
import { expect, it } from "vitest";
import { expense, rpc, setupCoupleFixtures } from "./support/couple";
import { runnerSql } from "./support/sql";
const fixtures = setupCoupleFixtures();

it("US-08 literal en la vista: 400.000 del grupo y 200.000 a cada persona, nunca 800.000", async () => {
  const p = await fixtures.couple();
  await rpc(p.sara.client, "create_shared_expense", expense(p, { p_amount_minor: "40000000", p_transaction_date: "2026-10-03",
    p_payer_user_id: p.sara.id, p_split_mode: "equal", p_parts: { [p.sara.id]: "20000000", [p.tomas.id]: "20000000" } }));
  for (const viewer of [p.sara.id, p.tomas.id]) {
    const read = JSON.parse(runnerSql(`begin; set local role authenticated; set local "request.jwt.claims"='{"sub":"${viewer}","role":"authenticated"}';
      select jsonb_build_object(
        'group',(select total_minor from public.couple_month_summary where month='2026-10-01'),
        'people',(select jsonb_object_agg(user_id,share_minor) from public.couple_balance))::text;
      rollback;`));
    expect(read).toEqual({ group: "40000000", people: { [p.sara.id]: "20000000", [p.tomas.id]: "20000000" } });
    expect(read.group).not.toBe("80000000");
  }
});
