// MOTION_SYSTEM.md, Tokens: spring snappy para perilla y pulsación.
export const snappy = { type: "spring", stiffness: 520, damping: 38, mass: 1 } as const;
// MOTION_SYSTEM.md, Tokens y §2: aparición de la hoja.
export const sheet = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
// MOTION_SYSTEM.md, Cuenta: diálogo con escala .98 → 1 y duración standard.
export const dialog = { initialScale: 0.98, finalScale: 1, durationMs: 240 } as const;
// MOTION_SYSTEM.md, Reglas técnicas: cambio de color de tema, 180 ms.
export const themeDurationMs = 180;
