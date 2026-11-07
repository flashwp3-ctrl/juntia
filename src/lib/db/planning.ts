import type {SupabaseClient} from "@supabase/supabase-js";
import {DbError} from "./errors";
import {requireClaims} from "./session";
import {withRetry} from "./retry";
import {afterFilter,readByCursor,type PageOptions} from "./paginate";
const monetary=/^(?:.*_minor|gasto_consumo|aporte_a_metas|retiro_de_metas|gasto_financiado_con_meta|total_destinado_neto)$/;
/** SQL declara text, incluso dentro de JSON. Rechaza respuestas numéricas antes de perder precisión. */
export function planningMoney<T>(value:T):T {
 const walk=(v:unknown):void=>{if(!v||typeof v!=="object")return;for(const [key,item] of Object.entries(v)){if(monetary.test(key)&&item!==null&&(typeof item!=="string"||!(/^-?[0-9]+$/).test(item)))throw new DbError("unexpected");walk(item);}};walk(value);return value;
}
export async function planningWrite<T>(client:SupabaseClient,name:string,args:Record<string,unknown>):Promise<T>{await requireClaims(client);return planningMoney(await withRetry<T>(()=>client.rpc(name,args)));}
export async function planningRows<T>(client:SupabaseClient,view:string,filters:Record<string,string>={}):Promise<T[]> {
 await requireClaims(client);let q=client.from(view).select("*");for(const [column,value] of Object.entries(filters))q=q.eq(column,value);return planningMoney(await withRetry<T[]>(()=>q));
}
export async function planningPages<T extends {id:string}>(client:SupabaseClient,view:string,filters:Record<string,string>,columns:readonly string[],options:PageOptions={}):Promise<T[]> {
 await requireClaims(client);return planningMoney(await readByCursor<T>((after,limit)=>{let q=client.from(view).select("*");for(const [key,value] of Object.entries(filters))q=q.eq(key,value);
 if(after)q=q.or(afterFilter(Object.fromEntries([...columns,"id"].map(key=>[key,String(after[key as keyof T])])),"desc",columns));for(const key of [...columns,"id"])q=q.order(key,{ascending:false});return q.limit(limit);},{...options,columns}));
}
