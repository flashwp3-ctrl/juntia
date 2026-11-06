const secret = process.env.JUNTIA_DEV_SECRET_KEY;
const mapped = process.env.SECRET_KEY;
const indexed = process.env["JUNTIA_DEV_DB_URL"];
const prefix = "sb_secret_";
const file = `.env.test`;
const name = "SECRET_KEY";
const allowed = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
void [secret, mapped, indexed, prefix, file, name, allowed];
