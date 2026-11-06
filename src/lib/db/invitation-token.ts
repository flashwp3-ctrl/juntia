/** Solo devuelve SHA-256. El token nunca forma parte de resultados ni registros. */
export async function hashInvitationToken(token:string):Promise<string> {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
