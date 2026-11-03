# AGENTS.md — Juntia

Este archivo es el contrato compartido para Codex, Claude Code y otros agentes del repositorio.

## Autoridad y alcance
1. Leer completo `docs/JUNTIA_MASTER.md` antes de implementar o decidir arquitectura.
2. Jerarquía: maestro (§15 v1.3 prevalece sobre el cuerpo v1.2) > ADRs de `docs/adr/` y contratos de dinero y privacidad > paquete de diseño aprobado en `docs/design/` > especificación del slice > consejos de skills.
2a. El paquete de diseño vive en `docs/design/`; el documento operativo es `docs/design/HANDOFF_CLAUDE_CODE.md`. **No existen `DESIGN.md` ni `MOTION.md`** y no se van a crear: sus nombres en el cuerpo v1.2 del maestro se refieren a `docs/design/DESIGN_SYSTEM.md` y `docs/design/MOTION_SYSTEM.md`.
3. **Fase actual: P0.** F0-a cerrada; **F0-b cerrada en especificación, pendiente en implementación** (maestro §15.1). Cerrado: la exploración visual y la especificación de diseño. Pendiente: los entregables ejecutables que el maestro §11 asigna a F0-b (app shell, Expense Flow, fixtures tipadas, primitivos), que produce y verifica la primera especificación de ingeniería. Dirección visual elegida: **I2 Bosque & Arena**; no se reabre. `prompts/archive/F0-A.md` es histórico y **no es ejecutable**. Todavía no existe scaffold de aplicación: crearlo es trabajo de la primera especificación de P0.
4. MVP-1 = **funcionamiento real + diseño premium a la par**. Mobile-first con desktop diseñado expresamente. S1–S5 (incluido progreso de metas) se integran con datos reales en sus slices, no al final.
5. Presupuesto opcional (DEC-R01): `null` no es cero. Metas individuales/compartidas también funcionan sin presupuesto. Nunca afirmar «te alcanza» por existir margen (DEC-R17).
5a. Metas P0 (DEC-G01..G06): aportes/uso/retiros no son gastos ficticios ni saldos bancarios; no crean deuda por sí solos. `total_destinado_neto` requiere pruebas de no doble conteo y atribución por aportante. No operar fondos ajenos sin confirmación.
6. Gastos privados nunca visibles para otro usuario; dinero exacto, asignaciones y liquidaciones reconciliadas; testear invariantes y RLS antes de mover datos reales.
7. Uso interno con datos reales permitido desde P0-1 tras los checks del slice; el release gate de S1–S5 aplica al **lanzamiento MVP-1**, no a beta interna.
8. Fuera de MVP: IA, Jev, OCR, scraping, precios, ofertas, inversión real y transferencias bancarias automáticas. Spike de precios únicamente después de cuatro semanas consecutivas de uso estable de MVP-1 por ambas personas.
9. **Juntia es el nombre de producto elegido**, no un codename. El registro de marca y dominio se verifica antes de uso público/comercial; no bloquea la app privada. No comprar dominios ni publicar landing durante MVP-1.

## Diseño y comprobación
10. Iconografía visible y coherente obligatoria (DEC-V03). Biblioteca elegida: **Phosphor** (`@phosphor-icons/react`) con wrapper `AppIcon`; no mezclar familias, no usar emojis ni placeholders. Evaluar 390 y 1440 px y nunca estirar simplemente el móvil.
11. Cada experiencia conserva semántica, accesibilidad, movimiento reducido y estados vacío/carga/error, según `docs/design/MOTION_SYSTEM.md` y `docs/design/RESPONSIVE_SPECIFICATIONS.md`.
12. Antes de afirmar «verificado», ejecutar realmente las pruebas o herramientas y guardar capturas de navegador; nunca inventar evidencia. Las marcas **[V]** del paquete de diseño son verificación pendiente, no decisiones resueltas. Las marcas **[P]** son **propuestas**, no decisiones aprobadas: cuando afectan al alcance de una especificación requieren **gate humano** antes de implementarse y no se cierran dentro de un PR de código. La interpretación formal de **[A]**, **[P]** y **[V]** y el inventario completo de los `[P]` están en el maestro §15.9.
13. Instalar únicamente herramientas necesarias para el slice. Impeccable y Playwright CLI están disponibles y **verifican** la ejecución; no dirigen el alcance ni la dirección visual. Taste Skill queda reservada para la landing posterior (maestro §9). No introducir más librerías sin necesidad.

## Flujo de trabajo y entregables
14. Inspeccionar repo y `git status` antes de editar; trabajar en un branch acotado por slice. No tocar trabajo ajeno sin permiso.
15. PRs **pequeños y demostrables**, un slice por PR. Cada PR: objetivo, archivos, decisiones, comandos ejecutados/resultados, capturas móvil/escritorio, riesgos y pendientes.
16. Cada slice de P0 se mide contra los criterios de aceptación de `docs/design/HANDOFF_CLAUDE_CODE.md` y los umbrales de rendimiento del maestro §15.7. Los datos del caso de octubre de `docs/design/COMPONENT_SPECIFICATIONS.md` deben reproducirse exactamente.
17. No aprobar unilateralmente dirección visual, alcance adicional, cambios de seguridad o branding. Una decisión nueva, significativa o difícil de revertir se escribe como ADR en `docs/adr/` y se revisa **antes** de implementarla; no se decide dentro de una especificación ni dentro de un PR de código. Detenerse y pedir revisión humana en cada entregable.
18. No afirmar que tests, build, screenshots, push o PR se completaron si no se realizaron. Si no hay remoto/autenticación, dejar commits locales y entregar instrucciones sin inventar URLs.
19. Mantener la arquitectura modular y económica; no crear monorepo, capas o dependencias que el slice actual no necesita.
20. `docs/research/` es material de referencia y **nunca** lista ejecutable de tareas del MVP.
