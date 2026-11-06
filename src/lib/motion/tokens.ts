// MOTION_SYSTEM.md, Tokens: spring snappy para perilla y pulsación.
export const snappy = { type: "spring", stiffness: 520, damping: 38, mass: 1 } as const;
// MOTION_SYSTEM.md, Tokens y §2: aparición de la hoja.
export const sheet = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
// MOTION_SYSTEM.md, Cuenta: diálogo con escala .98 → 1 y duración standard.
export const dialog = { initialScale: 0.98, finalScale: 1, durationMs: 240 } as const;
// MOTION_SYSTEM.md, Reglas técnicas: cambio de color de tema, 180 ms.
export const themeDurationMs = 180;
// MOTION_SYSTEM.md, Tokens: spring gentle para el Toast y la fila nueva de E5.
export const gentle = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
// MOTION_SYSTEM.md, Tokens: counter de 240 ms (el total que cuenta hacia arriba en E5).
export const counterMs = 240;
// MOTION_SYSTEM.md §2: la hoja se cierra con un deslizamiento de más de 120 px o con más de 800 px/s.
export const sheetDismiss = { distancePx: 120, velocityPxPerS: 800 } as const;
