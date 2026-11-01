# AGENTS.md — Juntia

Este archivo es el contrato compartido para Codex, Claude Code y otros agentes del repositorio.

## Autoridad y alcance
1. Leer completo `docs/JUNTIA_MASTER.md` antes de implementar o decidir arquitectura.
2. Jerarquía: maestro congelado > ADRs/contratos de dinero y privacidad > `docs/DESIGN.md` y `docs/MOTION.md` **cuando estén aprobados** > especificación del slice > consejos de skills.
3. **Fase actual: F0-a.** Hacer solo lo pedido en `prompts/F0-A.md`; no adelantar F0-b ni P0.
4. MVP-1 = **funcionamiento real + diseño premium a la par**. Mobile-first con desktop diseñado expresamente. S1–S5 (incluido progreso de metas) se integran con datos reales en sus slices, no al final.
5. Presupuesto opcional (DEC-R01): `null` no es cero. Metas individuales/compartidas también funcionan sin presupuesto. Nunca afirmar «te alcanza» por existir margen (DEC-R17).
5a. Metas P0 (DEC-G01..G06): aportes/uso/retiros no son gastos ficticios ni saldos bancarios; no crean deuda por sí solos. `total_destinado_neto` requiere pruebas de no doble conteo y atribución por aportante. No operar fondos ajenos sin confirmación.
6. Gastos privados nunca visibles para otro usuario; dinero exacto, asignaciones y liquidaciones reconciliadas; testear invariantes y RLS antes de mover datos reales.
7. Uso interno con datos reales permitido desde P0-1 tras los checks del slice; el release gate de S1–S5 aplica al **lanzamiento MVP-1**, no a beta interna.
8. Fuera de MVP: IA, Jev, OCR, scraping, precios, ofertas, inversión real y transferencias bancarias automáticas. Spike de precios únicamente después de cuatro semanas consecutivas de uso estable de MVP-1 por ambas personas.
9. **Juntia es el nombre de producto elegido**, no un codename. Usarlo desde F0-a. El registro de marca y dominio se verifica antes de uso público/comercial; no bloquea app privada. No comprar dominios ni publicar landing durante F0-a.

## Diseño y comprobación
10. Iconografía visible y coherente obligatoria (DEC-V03); no usar emojis ni placeholders de iconos. Evaluar 390 y 1440 px y nunca estirar simplemente el móvil.
11. Cada experiencia conserva semántica, accesibilidad, movimiento reducido y estados vacío/carga/error. `MOTION.md` se crea en F0-b, no en F0-a.
12. Antes de afirmar «verificado», ejecutar realmente las pruebas o herramientas y guardar capturas de navegador; nunca inventar evidencia.
13. Instalar únicamente herramientas necesarias para la fase: Impeccable y Playwright CLI en F0-a; emil-design-eng desde F0-b. No introducir más librerías sin necesidad.

## Flujo de trabajo y entregables
14. Inspeccionar repo y `git status` antes de editar; trabajar en un branch acotado (`design/f0-a-direcciones` para F0-a). No tocar trabajo ajeno sin permiso.
15. PRs **pequeños y demostrables**, un slice por PR. Cada PR: objetivo, archivos, decisiones, comandos ejecutados/resultados, capturas móvil/escritorio, riesgos y pendientes.
16. F0-a entrega seis capturas reales: direcciones A/B/C × 390/1440 px, con mismos datos **incluida una meta ficticia**; propuesta comparativa y borrador de diseño **sin elegir ganador**. No son mockups generados sin interfaz comprobable.
17. No aprobar unilateralmente dirección visual, alcance adicional, cambios de seguridad o branding. Detenerse al terminar F0-a y pedir selección humana para F0-b.
18. No afirmar que tests, build, screenshots, push o PR se completaron si no se realizaron. Si no hay remoto/autenticación, dejar commits locales y entregar instrucciones sin inventar URLs.
19. Mantener la arquitectura modular y económica; no crear monorepo, capas o dependencias que el slice actual no necesita.
20. `docs/research/` es material de referencia y **nunca** lista ejecutable de tareas del MVP.
