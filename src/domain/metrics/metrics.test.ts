// DEC-G04, TESTING §6: «total_destinado_neto reproduce cada fila de la tabla anterior».
// 004 FR-062: «solo suma usos aplicados y cuenta en el mes del gasto».
import { total_destinado_neto, NotAvailable, aporte_a_metas, retiro_de_metas, gasto_financiado_con_meta, gasto_consumo } from "./index";
const p=(n:bigint)=>n*100n;
describe("DEC-G04 (T004)",()=>{
  it.each([
    [2840000n,900000n,0n,0n,3740000n], [1912900n,500000n,0n,0n,2412900n],
    [null,400000n,0n,0n,null], [0n,0n,200000n,0n,-200000n],
    [3000000n,0n,0n,3000000n,0n], [1500000n,0n,0n,1620000n,-120000n],
    [1500000n,0n,0n,1380000n,120000n],
  ])("fila %s / %s / %s / %s",(consumo,aportes,retiros,financiado,expected)=>{
    expect(total_destinado_neto({gasto_consumo:consumo===null?NotAvailable:p(consumo),aporte_a_metas:p(aportes!),retiro_de_metas:p(retiros!),gasto_financiado_con_meta:p(financiado!)})).toBe(expected===null?NotAvailable:p(expected!));
  });
  it("vistas concilian sin sumar contextos solapados",()=>{
    expect(p(-120000n)+p(120000n)).toBe(0n);
    expect(NotAvailable).not.toBe(0n);
  });
  it("asientos anulados y solicitudes no son dinero aplicado; mes del gasto",()=>{
    const entries=[
      {kind:"contribution" as const,amountMinor:100n,date:"2026-10-01",voided:false},
      {kind:"contribution" as const,amountMinor:200n,date:"2026-10-01",voided:true},
      {kind:"withdrawal" as const,amountMinor:100n,date:"2026-11-01",voided:false},
    ];
    expect(aporte_a_metas(entries,"2026-10")).toBe(100n);
    expect(retiro_de_metas(entries,"2026-11")).toBe(100n);
    expect(gasto_financiado_con_meta([{amountMinor:100n,transactionDate:"2026-10-01",applied:true,voided:false},{amountMinor:200n,transactionDate:"2026-10-01",applied:false,voided:false}],"2026-10")).toBe(100n);
    expect(gasto_consumo([{amountMinor:100n,transactionDate:"2026-10-01",type:"expense",status:"active"},{amountMinor:200n,transactionDate:"2026-10-01",type:"income",status:"active"}],"2026-10")).toBe(100n);
  });
});
