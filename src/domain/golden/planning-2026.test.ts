// 004 SC-004, F63-1: «invitación ≤ activación ≤ creación ... ≤ su primer aporte».
// Maestro §15.10: «Los valores se copian ... nunca se recalculan».
import { computeBalance } from "../balances";
import { progress } from "../goals";
import { NotAvailable,total_destinado_neto } from "../metrics";
import { afterSettlement,beforeSettlement,sharedOctober2026,settlementOctober25 } from "./october-2026";
import { planningDates,japanContributions,japan,octoberBudgets,metricCases,bicycle,ticketsPending,ticketsApproved,ticketsRejected } from "./planning-2026";
it("T007: cronología de la pareja, metas y primer aporte; octubre no cambia",()=>{
  expect(planningDates.invited<=planningDates.activated).toBe(true);
  expect(planningDates.activated<=planningDates.japanCreated).toBe(true);
  for(const e of japanContributions) {expect(e.date>=planningDates.japanCreated).toBe(true);expect(e.date<="2026-10-31").toBe(true);}
  for(const e of bicycle.contributions) expect(e.date>=planningDates.bicycleCreated).toBe(true);
  for(const e of sharedOctober2026) expect(e.transactionDate>="2026-10-01").toBe(true);
  expect(settlementOctober25.settlementDate>="2026-10-01").toBe(true);
  expect(computeBalance(beforeSettlement.expenses,beforeSettlement.settlements,beforeSettlement.members)[0].net.amountMinor).toBe(42990000n);
  expect(computeBalance(afterSettlement.expenses,afterSettlement.settlements,afterSettlement.members)[0].net.amountMinor).toBe(22990000n);
  expect(sharedOctober2026.reduce((s,e)=>s+e.amount.amountMinor,0n)).toBe(284000000n);
});
it("T007: Japón 21 aportes, por persona y por mes",()=>{
  expect(japanContributions).toHaveLength(21);
  for(const [member,count,total] of [["sara",11,6120000n],["tomas",10,5220000n]] as const) {
    const own=japanContributions.filter(e=>e.member===member);
    expect(own).toHaveLength(count);expect(own.reduce((s,e)=>s+e.pesos,0n)).toBe(total);
  }
  for(const [month,total] of [["2026-08",1050000n],["2026-09",1000000n],["2026-10",900000n]] as const)
    expect(japanContributions.filter(e=>e.date.startsWith(month)).reduce((s,e)=>s+e.pesos,0n)).toBe(total);
  expect(progress(japan.balancePesos*100n,japan.targetPesos*100n)).toBe(63);
  expect(octoberBudgets.map(b=>b.versions.at(-1)!.limitPesos)).toEqual([900000n,260000n,340000n]);
});
it.each(metricCases)("T007: $name",row=>{
  expect(total_destinado_neto({gasto_consumo:row.consumption===null?NotAvailable:row.consumption*100n,aporte_a_metas:row.contributions*100n,retiro_de_metas:row.withdrawals*100n,gasto_financiado_con_meta:row.funded*100n})).toBe(row.net===null?NotAvailable:row.net*100n);
});
it("T007: escenarios aislados conservan saldos y progreso",()=>{
  expect(bicycle.contributions.reduce((s,e)=>s+e.pesos,0n)-bicycle.withdrawalPesos).toBe(bicycle.balanceAfterPesos);
  for(const state of [ticketsPending,ticketsApproved,ticketsRejected]) expect(progress(state.balancePesos*100n,japan.targetPesos*100n)).toBe(state.progress);
});
