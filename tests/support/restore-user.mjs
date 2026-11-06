// T029 / FR-059: únicamente runner, usuario aleatorio sintético, credenciales nunca impresas.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {execFileSync} from "node:child_process";
import {cleanPgEnv} from "../../scripts/dev-target/guard.mjs";
if (process.env.GITHUB_ACTIONS !== "true" || new URL(process.env.API_URL).hostname !== "127.0.0.1") throw new Error("Runner only");
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const publicClient = createClient(process.env.API_URL, process.env.PUBLISHABLE_KEY, options);
if (process.argv[2] === "seed") {
  const user = { email: `${randomUUID()}@seed.test`, password: `${randomUUID()}Aa1!` };
  const admin = createClient(process.env.API_URL, process.env.SECRET_KEY, options);
  const created = await admin.auth.admin.createUser({ ...user, email_confirm: true });
  if (created.error) throw new Error("Synthetic restore user creation failed");
  const partner=await admin.auth.admin.createUser({email:`${randomUUID()}@seed.test`,password:`${randomUUID()}Aa1!`,email_confirm:true});
  if(partner.error)throw new Error("Synthetic restore member creation failed");
  const negativeGroupId=randomUUID(),negativeMemberId=partner.data.user.id;
  if(new URL(process.env.DB_URL).hostname!=="127.0.0.1")throw new Error("Runner DB only");
  execFileSync('psql',['-X','-q','-v','ON_ERROR_STOP=1','-c',`select tests.seed_couple('${negativeGroupId}','${created.data.user.id}','${negativeMemberId}')`],{env:cleanPgEnv(process.env,process.env.DB_URL),stdio:'pipe'});
  writeFileSync(process.env.DRILL_USER_FILE, JSON.stringify({...user,negativeGroupId,negativeMemberId}), { mode: 0o600 });
}
const {email,password}=JSON.parse(readFileSync(process.env.DRILL_USER_FILE, "utf8"));
const user={email,password};
const { error } = await publicClient.auth.signInWithPassword(user);
if (error) throw new Error("Restored user cannot sign in");
if (process.argv[2] === "seed") {
  const { error } = await publicClient.rpc("create_transaction", { p_idempotency_key: randomUUID(), p_type: "expense", p_amount_minor: "4500000", p_category_id: "transport", p_transaction_date: "2026-10-03", p_description: "synthetic restore fixture" });
  if (error) throw new Error("Synthetic restore transaction failed");
}
console.log(process.argv[2] === "seed" ? "Synthetic restore fixture created" : "Restored synthetic user signed in");
