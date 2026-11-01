# Juntia — Starter del producto (v1.2)

**Juntia** es el nombre elegido para la aplicación web de finanzas personales y compartidas. El primer lanzamiento privado debe ser **funcional, seguro, mobile-first y visualmente excepcional también en escritorio**.

## Archivos

- `docs/JUNTIA_MASTER.md`: fuente de verdad v1.2, que conserva todas las decisiones del maestro v1.1.1 e incorpora metas personales/compartidas P0 (DEC-G01..G06) y nombre Juntia (DEC-R09).
- `AGENTS.md`: contrato compartido para Codex, Claude Code y otros agentes.
- `CLAUDE.md`: complemento breve de Claude Code; no duplica reglas.
- `prompts/F0-A.md`: único primer prompt, exactamente 3 direcciones y 6 capturas, incluyendo un estado de meta ficticia.
- `docs/research/`: investigación histórica recopilada bajo el nombre de trabajo **Ronda**; es material contextual, no tareas de MVP.

## Primera implementación

1. Extrae el ZIP dentro de una carpeta `juntia/` (o dentro de la carpeta `ronda/` existente sin crear un segundo repo). Si ya tienes un remoto GitHub, no vuelvas a inicializar Git.
2. Abre `docs/JUNTIA_MASTER.md` y luego `AGENTS.md`/`CLAUDE.md`.
3. Verifica `git status`; trabaja en la rama `design/f0-a-direcciones`.
4. En Claude Code o Codex: «Ejecuta `prompts/F0-A.md` siguiendo `AGENTS.md` y `docs/JUNTIA_MASTER.md`; detente al terminar F0-a».
5. Evalúa con tu pareja las 6 capturas 390/1440; elijan una dirección antes de F0-b.

No hay código ni base de datos en este paquete: el agente crea el scaffold mínimo en F0-a. No habilitar scraping, IA, banco, OCR, precios ni aportes automatizados ahora.

## Reglas contables de metas

- La contribución a una meta **no** es un gasto de consumo ni genera deuda entre integrantes.
- La pantalla mensual separa **gastos**, **aportes a metas**, **retiros** y **gastos financiados por metas**. `total_destinado_neto` es planificación, no saldo bancario.
- Un fondo registrado como `reserved` es una asignación virtual; `transferred_declared` es un movimiento declarado sin verificación externa.
- Presupuestos siempre opcionales. Las metas no crean presupuestos implícitos.
- Los usos de dinero compartido ajeno requieren confirmación explícita; RLS y test de no doble conteo son bloqueantes.

**Nombre y dominios:** Juntia está seleccionado como nombre del producto, sujeto a revisión comercial/marcaria antes de publicación pública. No afirmar que se ha adquirido un dominio.
