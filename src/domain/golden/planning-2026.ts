import type { PersonId } from "./october-2026";
export type GoldenContribution=Readonly<{date:string;member:PersonId;pesos:bigint;fundingMode:"reserved"}>;
export const planningDates={invited:"2025-11-30",activated:"2025-12-01",japanCreated:"2025-12-01",bicycleCreated:"2026-08-01"} as const;
export const japan={name:"Japón",targetPesos:18000000n,targetMonth:"2027-04-01",balancePesos:11340000n,progress:63} as const;
// Spec 004, parte A. Datos copiados; nunca se usan como datos de la app.
const contributions:readonly [string,PersonId,bigint][]=[
  ["2025-12-27","sara",580000n], ["2026-01-12","tomas",520000n],
  ["2026-01-27","sara",570000n], ["2026-02-27","sara",570000n],
  ["2026-03-27","sara",570000n], ["2026-04-27","sara",570000n],
  ["2026-05-27","sara",570000n], ["2026-06-27","sara",570000n], ["2026-07-27","sara",570000n],
  ["2026-02-12","tomas",550000n], ["2026-03-12","tomas",550000n],
  ["2026-04-12","tomas",550000n], ["2026-05-12","tomas",550000n],
  ["2026-06-12","tomas",550000n], ["2026-07-12","tomas",550000n],
  ["2026-08-12","tomas",500000n], ["2026-08-27","sara",550000n],
  ["2026-09-14","tomas",500000n], ["2026-09-28","sara",500000n],
  ["2026-10-15","tomas",400000n], ["2026-10-22","sara",500000n],
];
export const japanContributions:readonly GoldenContribution[]=contributions.map(([date,member,pesos])=>({date,member,pesos,fundingMode:"reserved"}));
export const octoberBudgets=[
  {categoryId:"market",consumedPesos:640000n,versions:[{date:"2026-10-01",by:"tomas",limitPesos:800000n},{date:"2026-10-03",by:"sara",limitPesos:900000n}]},
  {categoryId:"restaurants",consumedPesos:240000n,versions:[{date:"2026-10-01",by:"sara",limitPesos:260000n}]},
  {categoryId:"services",consumedPesos:360000n,versions:[{date:"2026-10-01",by:"tomas",limitPesos:340000n}]},
] as const;
export const metricCases=[
  {name:"October us",consumption:2840000n,contributions:900000n,withdrawals:0n,funded:0n,net:3740000n},
  {name:"October Sara",consumption:1912900n,contributions:500000n,withdrawals:0n,funded:0n,net:2412900n},
  {name:"October Tomas",consumption:null,contributions:400000n,withdrawals:0n,funded:0n,net:null},
  {name:"Withdrawal Sara",consumption:0n,contributions:0n,withdrawals:200000n,funded:0n,net:-200000n},
  {name:"Tickets us",consumption:3000000n,contributions:0n,withdrawals:0n,funded:3000000n,net:0n},
  {name:"Tickets Sara",consumption:1500000n,contributions:0n,withdrawals:0n,funded:1620000n,net:-120000n},
  {name:"Tickets Tomas",consumption:1500000n,contributions:0n,withdrawals:0n,funded:1380000n,net:120000n},
] as const;
export const bicycle={name:"Bicicleta de ruta",targetPesos:3000000n,targetMonth:null,contributions:[{date:"2026-08-05",pesos:600000n},{date:"2026-09-05",pesos:450000n}],withdrawalPesos:200000n,balanceAfterPesos:850000n} as const;
export const tickets={date:"2026-11-03",pesos:3000000n,categoryId:"transport",payer:"tomas",createdBy:"sara",ownPesos:1620000n,requestedPesos:1380000n,sharePesos:1500000n} as const;
export const ticketsPending={status:"pending",balancePesos:9720000n,progress:54,saraAvailablePesos:4500000n,tomasAvailablePesos:5220000n,fundedPesos:1620000n} as const;
export const ticketsApproved={status:"approved",balancePesos:8340000n,progress:46,saraAvailablePesos:4500000n,tomasAvailablePesos:3840000n,fundedPesos:3000000n} as const;
export const ticketsRejected={...ticketsPending,status:"rejected"} as const;
export const planningScenarios={us04:{limitPesos:1000000n,consumedPesos:1180000n,percent:118,overPesos:180000n},us18:{targetPesos:2000000n,contributionPesos:250000n},us19:{saraPesos:300000n,tomasPesos:200000n,balancePesos:500000n}} as const;
