# AGENTS.md — Juntia

Este archivo es el contrato compartido para Codex, Claude Code y otros agentes del repositorio.

## Autoridad y alcance
1. Leer completo `docs/JUNTIA_MASTER.md` antes de implementar o decidir arquitectura.
2. Jerarquía: maestro (§15 v1.3 prevalece sobre el cuerpo v1.2) > ADRs de `docs/adr/` y contratos de dinero y privacidad > paquete de diseño aprobado en `docs/design/` y convenciones de `docs/CONVENTIONS.md` > especificación del slice > consejos de skills.
2a. El paquete de diseño vive en `docs/design/`; el documento operativo es `docs/design/HANDOFF_CLAUDE_CODE.md`. **No existen `DESIGN.md` ni `MOTION.md`** y no se van a crear: sus nombres en el cuerpo v1.2 del maestro se refieren a `docs/design/DESIGN_SYSTEM.md` y `docs/design/MOTION_SYSTEM.md`.

### 2b. Mapa de documentos — léelo antes de buscar nada

| Documento | Qué resuelve | Cuándo lo necesitas |
| --- | --- | --- |
| `docs/JUNTIA_MASTER.md` | Fuente de verdad del producto. La **§15** registra las decisiones de noviembre de 2026 y prevalece sobre el cuerpo v1.2 | Siempre, antes de implementar o decidir arquitectura |
| `docs/design/HANDOFF_CLAUDE_CODE.md` | Decisiones aprobadas, alcance P0, DEC-G04, orden de implementación y **criterios de aceptación de P0** | Antes de implementar cualquier pantalla o flujo |
| `docs/design/` (5 documentos más) | Tokens, componentes, motion, responsive y marca | Al construir interfaz. Procedencia y erratas en `docs/design/README.md` |
| `docs/adr/` | Decisiones de arquitectura. Índice de ADR-001..011; el maestro §12.2 tiene la resolución corta de las que no tienen archivo | Antes de tomar una decisión significativa o difícil de revertir |
| `docs/CONVENTIONS.md` | Idioma de cada capa, la excepción de las cinco métricas DEC-G04, el módulo de copy y las convenciones de git. **Bloque A** deriva del maestro; **Bloque B** son decisiones nuevas aprobadas en revisión | Al nombrar cualquier cosa, escribir copy o abrir un PR |
| `docs/GLOSSARY.md` | Término de negocio → identificador → string de interfaz, con las precisiones que el producto no puede perder | Siempre que vayas a inventar un nombre. **No inventes uno que ya esté aquí** |
| `docs/TESTING.md` | Documento operativo de ADR-011: comandos, qué corre dónde, presupuestos, las siete reglas duras y el reparto de responsabilidades | Antes de escribir un test o tocar CI |
| `specs/NNN-nombre/` | La especificación de cada slice (`spec.md`, `plan.md`, `tasks.md` y auxiliares), escrita con Spec Kit (ADR-012). Dice **qué construye** el slice; **no decide**: cita las decisiones que aplica. Dentro de `tasks.md`, y solo ahí, `[P]` significa paralelizable | Antes de implementar un slice, o al escribir su especificación |
| `.specify/memory/constitution.md` | **Puntero, no autoridad.** Existe porque las skills de Spec Kit lo leen; remite a este archivo y al maestro. Solo cambia en un PR documental dedicado, y `speckit-constitution` no se ejecuta (ADR-012 §3.4) | Nunca como fuente: si contradice otro documento, está mal |

`docs/TESTING.md` es operativo de ADR-011 y `docs/GLOSSARY.md` es referencia, no autoridad: ante un conflicto manda la decisión de la que derivan.
3. **Fase actual: P0.** F0-a cerrada; **F0-b cerrada en especificación, pendiente en implementación** (maestro §15.1). Cerrado: la exploración visual y la especificación de diseño. Pendiente: los entregables ejecutables que el maestro §11 asigna a F0-b, repartidos por decisión de los fundadores (maestro §15.1 y §15.10): la **001** produce el app shell con navegación y selector de contexto y los primitivos; la especificación de **P0-1** produce el Expense Flow, conectado al servidor. **El alcance de la 001 y la navegación de escritorio están decididos en el maestro §15.10**: léelo antes de escribir su spec. Dirección visual elegida: **I2 Bosque & Arena**; no se reabre. `prompts/archive/F0-A.md` es histórico y **no es ejecutable**. Todavía no existe scaffold de aplicación: crearlo es trabajo de la primera especificación de P0.
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
13a. **Pruebas: lee `docs/TESTING.md` antes de escribir una.** Lo que no se negocia desde ahí: cada criterio se prueba en la capa más baja que puede detectar su fallo; el tope es de 4–6 specs E2E para todo P0 y cada slice declara cuántas añade; una funcionalidad no se mergea sin su E2E obligatoria; y los presupuestos de tiempo solo se mueven por decisión documentada de los fundadores, nunca porque una medición los supere. La decisión está en `docs/adr/ADR-011-estrategia-de-pruebas-y-ci.md`.

## Flujo de trabajo y entregables
14. Inspeccionar repo y `git status` antes de editar; trabajar en un branch acotado por slice. No tocar trabajo ajeno sin permiso.
14a. **`main` solo cambia por merge de un PR revisado.** Nunca empujes a `main`, nunca uses `--no-verify` y nunca desactives el hook. En GitHub `main` no tiene protección de rama (el plan no lo permite), así que la barrera es local: reglas de denegación en `.claude/settings.json` y el hook `.githooks/pre-push`, que cada clon activa con `git config core.hooksPath .githooks`. Las dos se pueden saltar a propósito: no hacerlo es parte de este contrato (ADR-012 §5).
14b. **Dos agentes en paralelo, dos worktrees.** Un checkout compartido no aísla las ramas: si otro agente cambia de rama, tus commits caen en la suya. Cada agente trabaja en su propio `git worktree`.
15. PRs **pequeños y demostrables**, un slice por PR. Cada PR: objetivo, archivos, decisiones, comandos ejecutados/resultados, capturas móvil/escritorio, riesgos y pendientes.
16. Cada slice de P0 se mide contra los criterios de aceptación de `docs/design/HANDOFF_CLAUDE_CODE.md`, los umbrales de rendimiento del maestro §15.7 y lo que `docs/TESTING.md` exija para su capa. Los datos del caso de octubre de `docs/design/COMPONENT_SPECIFICATIONS.md` deben reproducirse exactamente.
17. No aprobar unilateralmente dirección visual, alcance adicional, cambios de seguridad o branding. Una decisión nueva, significativa o difícil de revertir se escribe como ADR en `docs/adr/` y se revisa **antes** de implementarla; no se decide dentro de una especificación ni dentro de un PR de código. Detenerse y pedir revisión humana en cada entregable.
18. No afirmar que tests, build, screenshots, push o PR se completaron si no se realizaron. Si no hay remoto/autenticación, dejar commits locales y entregar instrucciones sin inventar URLs.
19. Mantener la arquitectura modular y económica; no crear monorepo, capas o dependencias que el slice actual no necesita.
20. `docs/research/` es material de referencia y **nunca** lista ejecutable de tareas del MVP.
