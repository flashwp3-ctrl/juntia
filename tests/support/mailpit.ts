// T050: el correo del Supabase local llega a Mailpit (puerto 54324 del runner). Devuelve el enlace de /auth/confirm del
// último correo de un tipo para una dirección. Sin esperas fijas: el que llama reintenta con expect.poll.
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type Summary = { ID: string; Created: string; To: { Address: string }[] };

export async function confirmLink(email: string, type: "signup" | "recovery"): Promise<string | null> {
  if (!["127.0.0.1", "localhost"].includes(new URL(MAILPIT).hostname)) throw new Error("Solo el Mailpit del runner");
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
  if (!search.ok) return null;
  const { messages = [] } = (await search.json()) as { messages?: Summary[] };
  const newest = [...messages].sort((a, b) => b.Created.localeCompare(a.Created));
  for (const message of newest) {
    const detail = await fetch(`${MAILPIT}/api/v1/message/${message.ID}`);
    if (!detail.ok) continue;
    const { HTML = "", Text = "" } = (await detail.json()) as { HTML?: string; Text?: string };
    const match = `${HTML}\n${Text}`.match(/https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/);
    if (!match) continue;
    const link = match[0].replace(/&amp;/g, "&");
    if (new URL(link).searchParams.get("type") === type) return link;
  }
  return null;
}
