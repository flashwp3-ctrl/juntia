// Casos de la regla 4 de ADR-011.
export async function fixture(page: { waitForTimeout: (ms: number) => Promise<void> }) {
  const delay = 100;
  // Las dos llamadas deben fallar.
  await page.waitForTimeout(delay);
  setTimeout(() => {}, delay);
}
