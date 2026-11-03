# CLAUDE.md — Juntia (Claude Code)

1. Lee **primero** `AGENTS.md`: son las reglas compartidas con Codex.
2. Lee completo `docs/JUNTIA_MASTER.md`; es la fuente de verdad congelada.
3. Jerarquía: maestro (§15 v1.3 prevalece sobre el cuerpo v1.2) > ADRs de `docs/adr/` y contratos de dinero/privacidad > paquete aprobado en `docs/design/` y convenciones de `docs/CONVENTIONS.md` > ticket actual > sugerencias de skills.
3a. **Qué documento resuelve qué: `AGENTS.md` §2b.** No lo duplico aquí. En corto: nombres y copy → `docs/CONVENTIONS.md` y `docs/GLOSSARY.md`; pruebas y CI → `docs/TESTING.md`; pantallas → `docs/design/`.
4. **Fase actual: P0.** F0-a cerrada; **F0-b cerrada en especificación, pendiente en implementación** (maestro §15.1): el diseño está especificado, pero los entregables ejecutables de F0-b todavía no existen: la 001 produce el app shell y los primitivos, y la especificación de P0-1 el Expense Flow conectado al servidor. Las decisiones de los fundadores sobre el alcance de la 001 y la navegación de escritorio están en el maestro §15.10. Dirección elegida: **I2 Bosque & Arena**. Lee `docs/design/HANDOFF_CLAUDE_CODE.md` antes de implementar: es el documento operativo. No existe scaffold de aplicación todavía.
5. La primera entrega real será funcional **y** visualmente extraordinaria; 390 y 1440 px son obligatorios.
6. Iconografía Phosphor con wrapper `AppIcon` (DEC-V03), presupuesto opcional (DEC-R01), metas privadas/compartidas P0 (DEC-G01..G06). No tratar ahorro como gasto ni afirmar «te alcanza» (DEC-R17). `total_destinado_neto` nunca se rotula «Total gastado» ni es el número héroe (DEC-G04, maestro §15.4).
7. Impeccable y Playwright CLI **verifican** la ejecución; no dirigen el alcance ni reabren la dirección visual. No instales skills adicionales sin necesidad del slice.
8. Las marcas **[V]** del paquete de diseño son verificación pendiente, no decisiones resueltas. No las des por hechas ni inventes validaciones. Las marcas **[P]** son **propuestas**: si afectan al alcance de una especificación, necesitan gate humano antes de implementarse y no se cierran dentro de un PR de código. Lee el maestro §15.9 (interpretación formal e inventario de `[P]`) antes de implementar cualquier componente marcado así.
9. Haz cambios pequeños, verificables y descritos como PR; conserva el trabajo preexistente. Una decisión nueva, significativa o difícil de revertir va a un ADR en `docs/adr/` **antes** de implementarla.
10. Sin IA, scraping, landing, integraciones bancarias ni modo offline en MVP-1. Marca visible: **Juntia**; el logo definitivo no se exige.
11. P0-1 permite pruebas internas con datos reales tras validar seguridad y recuperación; el gate premium completo rige el lanzamiento MVP-1.
12. Si este archivo contradice `AGENTS.md` o el maestro, manda el maestro y luego `AGENTS.md`.
