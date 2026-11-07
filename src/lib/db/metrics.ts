import type {SupabaseClient} from "@supabase/supabase-js";
import type {MetricMonthTransport,PlanningContext} from "./types";
import {planningRows} from "./planning";
export function metricMonths(client:SupabaseClient,context:PlanningContext,month?:string){return planningRows<MetricMonthTransport>(client,"metric_months",{context,...(month?{month}:{})});}
