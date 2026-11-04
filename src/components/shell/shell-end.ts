// D21-1 (T077): id del último elemento del AppShell. El root layout lo nombra en <link rel="expect" blocking="render">
// para que Chrome no pinte hasta haber parseado el shell completo. Módulo sin "use client": lo leen el layout (servidor)
// y el AppShell (cliente).
export const SHELL_END_ID = "juntia-shell-end";
