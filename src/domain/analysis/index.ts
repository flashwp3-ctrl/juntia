export type CategoryConsumption=Readonly<{categoryId:string;amountMinor:bigint}>;
export function monthComparison(current:readonly CategoryConsumption[],previous:readonly CategoryConsumption[]) {
  const sum=(rows:readonly CategoryConsumption[])=>rows.reduce((s,r)=>s+r.amountMinor,0n);
  const before=sum(previous);
  if(before<=0n) return null;
  const differenceMinor=sum(current)-before;
  const byCategory=(rows:readonly CategoryConsumption[])=>{
    const map=new Map<string,bigint>();
    for(const row of rows) map.set(row.categoryId,(map.get(row.categoryId)??0n)+row.amountMinor);
    return map;
  };
  const a=byCategory(current), b=byCategory(previous);
  const categories=[...a].map(([id,amount])=>({id,delta:amount-(b.get(id)??0n)}))
    .filter(x=>x.delta>0n).sort((x,y)=>x.delta===y.delta?x.id.localeCompare(y.id):x.delta>y.delta?-1:1).slice(0,2).map(x=>x.id);
  return {differenceMinor,percent:Number(differenceMinor*100n/before),categories};
}
