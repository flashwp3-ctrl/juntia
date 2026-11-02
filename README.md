# Juntia — Starter del producto (v1.2)

**Juntia** es el nombre elegido para la aplicación web de finanzas personales y compartidas. El primer lanzamiento privado debe ser **funcional, seguro, mobile-first y visualmente excepcional también en escritorio**.

## Estado

**Fase actual: P0.** F0-a y F0-b están cerradas. La dirección visual elegida es **I2 · Bosque & Arena** y el sistema de diseño está completo. Todavía **no existe código de aplicación**: crear el scaffold es trabajo de la primera especificación de P0.

## Archivos

- `docs/JUNTIA_MASTER.md`: fuente de verdad. Cuerpo v1.2 más la **§15 (v1.3)**, que registra la dirección visual elegida y las decisiones P0 cerradas el 2 de noviembre de 2026 y **prevalece** donde difiera del cuerpo.
- `docs/design/`: paquete de diseño aprobado, importado desde Claude Design. El documento operativo es `HANDOFF_CLAUDE_CODE.md`; ver `docs/design/README.md` para la procedencia.
- `docs/adr/`: decisiones de arquitectura. El índice remite al maestro §12.2; ADR-001 y ADR-003 están desarrollados.
- `AGENTS.md`: contrato compartido para Codex, Claude Code y otros agentes.
- `CLAUDE.md`: complemento breve de Claude Code; no duplica reglas.
- `prompts/archive/`: prompts de fases cerradas, no ejecutables.
- `docs/research/`: investigación histórica recopilada bajo el nombre de trabajo **Ronda**; es material contextual, no tareas de MVP.

## Cómo empezar

1. Lee `AGENTS.md`, luego `docs/JUNTIA_MASTER.md` (incluida la §15) y después `docs/design/HANDOFF_CLAUDE_CODE.md`.
2. Verifica `git status` y trabaja en una rama acotada por slice.
3. El stack está decidido (maestro §7.1 y §15): Next.js App Router, TypeScript strict, Tailwind con tokens propios, shadcn/Radix, Supabase con RLS, Phosphor, Motion for React, Vitest y Playwright. No se vuelve a proponer.
4. Cada entregable se revisa antes de avanzar al siguiente. No se encadenan fases sin aprobación humana.

No habilitar scraping, IA, banco, OCR, precios, modo offline ni aportes automatizados.

## Reglas contables de metas

- La contribución a una meta **no** es un gasto de consumo ni genera deuda entre integrantes.
- La pantalla mensual separa **gastos**, **aportes a metas**, **retiros** y **gastos financiados por metas**. `total_destinado_neto` es planificación, no saldo bancario.
- Un fondo registrado como `reserved` es una asignación virtual; `transferred_declared` es un movimiento declarado sin verificación externa.
- Presupuestos siempre opcionales. Las metas no crean presupuestos implícitos.
- Los usos de dinero compartido ajeno requieren confirmación explícita; RLS y test de no doble conteo son bloqueantes.

**Nombre y dominios:** Juntia está seleccionado como nombre del producto, sujeto a revisión comercial/marcaria antes de publicación pública. No afirmar que se ha adquirido un dominio.
