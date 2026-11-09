export const NotAvailable = "notAvailable" as const;
export type MetricValue = bigint | typeof NotAvailable;
export type Metrics = Readonly<{ gasto_consumo:MetricValue; aporte_a_metas:MetricValue; retiro_de_metas:MetricValue; gasto_financiado_con_meta:MetricValue }>;
export function total_destinado_neto(values:Metrics):MetricValue {
  const {gasto_consumo:g,aporte_a_metas:a,retiro_de_metas:r,gasto_financiado_con_meta:f}=values;
  if(g===NotAvailable || a===NotAvailable || r===NotAvailable || f===NotAvailable) return NotAvailable;
  return g+a-r-f;
}
type DatedEntry=Readonly<{kind:"contribution"|"withdrawal";amountMinor:bigint;date:string;voided:boolean}>;
export function aporte_a_metas(entries:readonly DatedEntry[],month:string):bigint {
  return entries.filter(e=>!e.voided && e.kind==="contribution" && e.date.startsWith(month)).reduce((s,e)=>s+e.amountMinor,0n);
}
export function retiro_de_metas(entries:readonly DatedEntry[],month:string):bigint {
  return entries.filter(e=>!e.voided && e.kind==="withdrawal" && e.date.startsWith(month)).reduce((s,e)=>s+e.amountMinor,0n);
}
export function gasto_financiado_con_meta(usages:readonly Readonly<{amountMinor:bigint;transactionDate:string;applied:boolean;voided:boolean}>[],month:string):bigint {
  return usages.filter(u=>u.applied && !u.voided && u.transactionDate.startsWith(month)).reduce((s,u)=>s+u.amountMinor,0n);
}
export function gasto_consumo(expenses:readonly Readonly<{amountMinor:bigint;transactionDate:string;type:string;status:string}>[],month:string):bigint {
  return expenses.filter(e=>e.type==="expense" && e.status==="active" && e.transactionDate.startsWith(month)).reduce((s,e)=>s+e.amountMinor,0n);
}
