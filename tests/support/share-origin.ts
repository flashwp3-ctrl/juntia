// F93-1 (revisión del PR #93): la tarjeta para compartir anuncia una URL absoluta, y WhatsApp la descarga tal cual. No basta
// con la ruta: el origen tiene que ser el del sitio. Es el de SITE_URL si está definida (la misma variable que usa
// metadataBase en src/app/layout.tsx) y, si no, el de la app que sirve la prueba.

/** Origen que la tarjeta debe anunciar en este entorno. */
export function expectedShareOrigin(env: { SITE_URL?: string }, appUrl: string): string {
  const site = env.SITE_URL?.trim();
  return new URL(site || appUrl).origin;
}

/** `null` si `announced` es una URL absoluta con el origen esperado; si no, por qué no lo es. */
export function shareOriginProblem(announced: string | null | undefined, expectedOrigin: string): string | null {
  if (!announced) return "la etiqueta no está";
  let url: URL;
  try {
    url = new URL(announced);
  } catch {
    return `«${announced}» no es una URL absoluta`;
  }
  return url.origin === expectedOrigin ? null : `anuncia ${url.origin} y se esperaba ${expectedOrigin}`;
}
