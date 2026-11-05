const secret = process.env.SUPABASE_SECRET_KEY;
const legacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
const role = "service_role";
client.rpc("ensure_profile");
client.from("my_profile");
void [secret, legacy, role];
