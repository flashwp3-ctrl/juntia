export type Goal = Readonly<{ balanceMinor: bigint; targetMinor: bigint; createdAt: string; targetMonth: string | null }>;
export type UsageAllocation = Readonly<{ userId: string; amountMinor: bigint }>;
export type LedgerEntry = Readonly<
  {id:string;kind:"contribution"|"withdrawal";memberUserId:string;amountMinor:bigint} |
  {id:string;kind:"usage";amountMinor:bigint;allocations:readonly UsageAllocation[]} |
  {id:string;kind:"void";voidsEntryId:string}
>;
function live(entries: readonly LedgerEntry[]) {
  const voided = new Set(entries.filter(e=>e.kind==="void").map(e=>e.voidsEntryId));
  return entries.filter(e=>e.kind!=="void" && !voided.has(e.id));
}
export function memberAvailable(entries: readonly LedgerEntry[], userId: string): bigint {
  return live(entries).reduce((sum,e)=>e.kind==="usage"
    ? sum-e.allocations.filter(a=>a.userId===userId).reduce((s,a)=>s+a.amountMinor,0n)
    : e.kind!=="void" && e.memberUserId===userId ? sum+(e.kind==="contribution"?e.amountMinor:-e.amountMinor) : sum,0n);
}
export function goalBalance(entries: readonly LedgerEntry[]): bigint {
  return live(entries).reduce((sum,e)=>e.kind==="void"?sum:sum+(e.kind==="contribution"?e.amountMinor:-e.amountMinor),0n);
}
export function progress(balance:bigint,target:bigint):number {
  if(balance<0n || target<=0n) throw new RangeError("invalidGoal");
  return Number(balance*100n/target);
}
/** Mayor residuo en pesos; el orden de ingreso decide los empates (ADR-002). */
export function proposeFunding(available:readonly (UsageAllocation & {joinOrder:number})[],amount:bigint):UsageAllocation[] {
  if(amount<=0n || amount%100n!==0n || new Set(available.map(x=>x.userId)).size!==available.length || new Set(available.map(x=>x.joinOrder)).size!==available.length || available.some(x=>x.amountMinor<0n || x.amountMinor%100n!==0n)) throw new RangeError("invalidUsageAllocation");
  const total=available.reduce((s,x)=>s+x.amountMinor,0n);
  if(amount>total) throw new RangeError("insufficientMemberFunds");
  const pesos=amount/100n;
  const parts=available.map(x=>({...x,assigned:pesos*x.amountMinor/total,remainder:pesos*x.amountMinor%total}));
  let left=pesos-parts.reduce((s,x)=>s+x.assigned,0n);
  parts.sort((a,b)=>a.remainder===b.remainder?a.joinOrder-b.joinOrder:a.remainder>b.remainder?-1:1);
  for(const part of parts) if(left>0n) {part.assigned++;left--;}
  return parts.sort((a,b)=>a.joinOrder-b.joinOrder).map(x=>({userId:x.userId,amountMinor:x.assigned*100n}));
}
export function goalPace(goal:Goal,today:string) {
  if(!goal.targetMonth) return null;
  const [year,month]=today.slice(0,7).split("-").map(Number);
  const [targetYear,targetMonth]=goal.targetMonth.slice(0,7).split("-").map(Number);
  const months=(targetYear-year)*12+targetMonth-month;
  if(months<=0) return null;
  const remainingMinor=goal.targetMinor>goal.balanceMinor?goal.targetMinor-goal.balanceMinor:0n;
  const divisor=BigInt(months)*100n;
  const monthlyMinor=(remainingMinor+divisor-1n)/divisor*100n;
  const start=Date.parse(goal.createdAt.slice(0,10)+"T00:00:00Z");
  const end=Date.UTC(targetYear,targetMonth,1);
  const now=Date.parse(today.slice(0,10)+"T00:00:00Z");
  const elapsedPercent=Math.trunc(Math.min(1,Math.max(0,(now-start)/(end-start)))*100);
  return {remainingMinor,months,monthlyMinor,elapsedPercent};
}
