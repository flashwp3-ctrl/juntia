// 004 FR-034, FR-037, FR-051: «asignaciones que suman el uso»; «progreso ... entero truncado».
// DEC-G06: «fondos disponibles por aportante»; Q9: «sin extrapolar».
import { goalBalance, memberAvailable, progress, proposeFunding, goalPace, type LedgerEntry } from "./index";
const p = (n: bigint) => n * 100n;
describe("metas y fondos (T003)", () => {
  it.each([[11340000n,63],[9720000n,54],[8340000n,46],[11840000n,65]] as const)("progreso %s", (balance, percent) => {
    expect(progress(p(balance), p(18000000n))).toBe(percent);
  });
  it("ignora anulados y atribuye usos al aportante, no al reparto", () => {
    const entries: LedgerEntry[] = [
      { id:"a",kind:"contribution",memberUserId:"sara",amountMinor:p(300000n) },
      { id:"b",kind:"contribution",memberUserId:"tomas",amountMinor:p(200000n) },
      { id:"c",kind:"withdrawal",memberUserId:"sara",amountMinor:p(100000n) },
      { id:"u",kind:"usage",amountMinor:p(50000n),allocations:[{userId:"tomas",amountMinor:p(50000n)}] },
      { id:"v",kind:"void",voidsEntryId:"c" },
    ];
    expect(memberAvailable(entries,"sara")).toBe(p(300000n));
    expect(memberAvailable(entries,"tomas")).toBe(p(150000n));
    expect(goalBalance(entries)).toBe(p(450000n));
  });
  it("mayor residuo en pesos, desempate por ingreso, dentro del disponible (propiedad)", () => {
    for(let a=0; a<23; a++) for(let b=0; b<17; b++) {
      if(a+b===0) continue;
      for(const pesos of [1,Math.floor((a+b)/2),a+b].filter(n=>n>0)) {
        const funds=[{userId:"sara",joinOrder:1,amountMinor:p(BigInt(a))},{userId:"tomas",joinOrder:2,amountMinor:p(BigInt(b))}];
        const parts=proposeFunding(funds,p(BigInt(pesos)));
        expect(parts.reduce((sum,x)=>sum+x.amountMinor,0n)).toBe(p(BigInt(pesos)));
        for(const part of parts) { expect(part.amountMinor%100n).toBe(0n); expect(part.amountMinor).toBeGreaterThanOrEqual(0n); expect(part.amountMinor).toBeLessThanOrEqual(funds.find(f=>f.userId===part.userId)!.amountMinor); }
      }
    }
    expect(proposeFunding([{userId:"tomas",joinOrder:2,amountMinor:100n},{userId:"sara",joinOrder:1,amountMinor:100n}],100n))
      .toEqual([{userId:"sara",amountMinor:100n},{userId:"tomas",amountMinor:0n}]);
    expect(()=>proposeFunding([{userId:"a",joinOrder:1,amountMinor:100n}],200n)).toThrow();
  });
  it("ritmo descriptivo: faltan 6.660.000 en seis meses", () => {
    const goal={balanceMinor:p(11340000n),targetMinor:p(18000000n),createdAt:"2025-12-01",targetMonth:"2027-04-01"};
    expect(goalPace(goal,"2026-10-31")).toMatchObject({remainingMinor:p(6660000n),months:6,monthlyMinor:p(1110000n)});
    expect(goalPace({...goal,targetMonth:null},"2026-10-31")).toBeNull();
    expect(goalPace(goal,"2027-05-01")).toBeNull();
  });
});
