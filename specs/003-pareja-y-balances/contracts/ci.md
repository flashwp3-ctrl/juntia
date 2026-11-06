# Contrato de `verify` y del CI — 003

Aplica ADR-011 §3, §4 y §9 (con la decisión 18, §9.9, y la 19.5) y
`docs/TESTING.md`. Parte del contrato de la 002
(`specs/002-cuentas-y-gastos-privados/contracts/ci.md`) y dice solo lo que
cambia. **Nada de esto está implementado.** `docs/TESTING.md` y los scripts de
`juntia-dev` (PR #48) no se tocan desde este slice: si P0-2 necesitara cambiarlos,
sería en un PR técnico aparte.

## Jobs

Los jobs `app`, `db` y `e2e` no cambian de forma, disparadores ni `timeout`. Lo
que crece es su contenido:

| Job | Qué añade P0-2 | Presupuesto |
| --- | --- | --- |
| `app` | Componentes nuevos (Anotar compartido, Mi pareja, Balance, Mover a Pareja) en el proyecto `components` | Gate < 6 min |
| `db` | pgTAP `10_couple.test.sql` (grupos, membresías, invitaciones, estados, carreras con dos sesiones en SQL), `11_shared_money.test.sql` (partes, gastos compartidos, versión esperada, liquidaciones y su anulación, Mover a Pareja y su deshacer) y la ampliación de `01_privileges` (rol `juntia_membership`, auxiliares, inventario sin funciones de extensiones, lección F40-2). Integración de servidor de concurrencia (FR-064) y de lecturas consistentes (FR-043). `db:types:check` con las vistas y funciones nuevas | `test:db` < 60 s (comando) · Gate < 6 min |
| `e2e` | La **spec E2E 3** nace en el PR C y crece en el PR D; la spec 1 suma el caso de invitación en el PR B; axe con sesión de pareja en las rutas nuevas, en los dos temas | **< 480 s** (decisión 19.5) · humo < 3 min |

## El presupuesto del job `e2e` con la spec 3

La decisión 19.5 subió el presupuesto a < 480 s con las specs 1 y 2 midiendo
421–445 s. **La spec 3 y las auditorías de axe de Nosotros y de Balance caben
solo si la siembra no crece en proporción.** Por eso (research R8):

- La pareja se siembra **una vez por worker** con `seedCouple()` por base de datos
  (`docs/TESTING.md` §5, regla 1) y se reutiliza entre los casos de la spec 3 y
  las auditorías de axe de pareja, con dos `storageState` (Sara y Tomás) por
  worker (regla 2).
- Las auditorías de axe con sesión de pareja se agrupan por ruta, con los dos
  temas en el mismo contexto, como en el PR D de la 002.
- El PR C **mide** el job con la spec 3 recién nacida y lo registra en la
  evidencia. Si supera 480 s, **no se mueve el presupuesto**: se para y se lleva a
  los fundadores (`AGENTS.md` 13a; ADR-011 §4, «solo se mueven por decisión
  documentada de los fundadores»).
- Con el cierre de P0-2 el presupuesto **pasa a bloquear** (Q17; `docs/TESTING.md`
  §9): el PR D es el primero en el que superar 480 s falla el build.

## Qué specs corre cada PR (`docs/TESTING.md` §4)

| PR | Specs E2E | Nota |
| --- | --- | --- |
| A | 1 y 2 (no tocan el esquema nuevo, pero el gate corre las que existen) | Ninguna nace |
| B | 1 (con el caso nuevo) y 2 | La spec 3 todavía no existe: no hay gasto compartido sin el PR C |
| C | 1, 2 y **3** (nace) | Gasto compartido 50/50, «Cambiar Yo/Nosotros» y «Mover a Pareja» |
| D | 1, 2 y 3 (crece) | Balance y liquidación parcial |

## Iteración frente a gate (decisión 18)

- **Mientras se desarrolla**, el agente aplica las migraciones de la rama a
  `juntia-dev`, la reinicia y ejecuta pgTAP, integración y las E2E que no leen
  correos contra ella, con el guardia de destino `itfrhnadovezpahikuol` y **un solo
  agente a la vez** (ADR-011 §9.9). Esto depende del PR técnico de la decisión 18
  (PR #48). **Ningún spike ni verificación corre en runners o workflows de GitHub
  Actions** (regla del gestor del 6 de noviembre de 2026): si `juntia-dev` está
  ocupado por otra sesión, el agente **espera** a que libere el lock. El preflight
  de este plan en un runner efímero (research) fue el último de ese tipo.
- **El CI corre solo** en los puntos de control que pide cada PR de este plan y en
  el gate final (`AGENTS.md` 15a). La evidencia de una `[V]` o de un punto de
  control sale **solo del CI**, nunca de `juntia-dev` (ADR-011 §9.8).

## Puntos de control (`gh workflow run ci.yml --ref <rama>`)

| PR | Punto de control | Qué demuestra |
| --- | --- | --- |
| A | 1 — migración `couple_foundation` | Auxiliares sin recursión, RLS de grupos, privilegios de `juntia_membership`, ninguna escritura directa |
| A | 2 — migración `shared_money_tables` | Vistas de la 002 con el filtro explícito, vistas nuevas sin datos privados, triggers e invariantes |
| A | Gate | Funciones de pareja y dinero compartido, concurrencia, lecturas consistentes |
| B, C, D | Gate (y uno intermedio en C, tras nacer la spec 3, para medir el job `e2e`) | Interfaz, specs E2E y axe |
