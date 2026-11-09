// Decisión 22.10, FR-023: «Solo si el mes anterior tiene gastos ... hasta dos categorías con mayor aumento».
import { monthComparison } from "./index";
it("T005: sin gastos anteriores no hay comparación",()=>{
  expect(monthComparison([{categoryId:"home",amountMinor:100n}],[])).toBeNull();
});
it("T005: diferencia exacta, porcentaje entero y dos categorías, nunca un gasto concreto",()=>{
  expect(monthComparison([{categoryId:"home",amountMinor:20000n},{categoryId:"market",amountMinor:16000n},{categoryId:"services",amountMinor:7000n}], [{categoryId:"home",amountMinor:10000n},{categoryId:"market",amountMinor:10000n},{categoryId:"services",amountMinor:5000n}]))
    .toEqual({differenceMinor:18000n,percent:72,categories:["home","market"]});
});
