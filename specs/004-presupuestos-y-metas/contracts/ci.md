# Contrato de `verify` y del CI — 004

Aplica ADR-011 §3, §4 y §9 (decisiones 17, 18, 19.5 y 21) y `docs/TESTING.md`. Parte
de `specs/003-pareja-y-balances/contracts/ci.md` y dice solo lo que cambia. **Nada de
esto está implementado.** `docs/TESTING.md`, `.github/` y `scripts/` no se tocan desde
este slice: si P0-3 necesitara cambiarlos, sería en un PR técnico aparte.

## Jobs

Los jobs `app`, `db` y `e2e` no cambian de forma, disparadores ni `timeout`. Crece su
contenido:

| Job | Qué añade P0-3 | Presupuesto |
| --- | --- | --- |
| `app` | Componentes (BudgetIndicator, Plan, Análisis, PlanningNote, GoalCard, GoalStack, Registrar aporte, Retirar, FundingLedger, ConfirmationBadge, B1–B7) en `components`; dominio (`budgets`, `goals`, `metrics`, `analysis`, `golden`) en `domain`; axe sin sesión de lo que no la necesite | Gate < 6 min; `verify` < 90 s; dominio < 15 s |
| `db` | pgTAP `12_budgets.test.sql`, `13_goals.test.sql` (ledger, solo inserción, saldo por aportante, solicitudes, funciones redefinidas, `transaction_goal_funded`) y la ampliación de `01_privileges`, `03_views` y `05_direct_writes`. Integración: carreras de FR-112 con `raceUnderLock`, idempotencia de cada escritura, lectura consistente, exportación. `db:types:check` con las vistas y funciones nuevas | `test:db` < 60 s (comando) · gate < 6 min |
| `e2e` | **Spec E2E 5** (nace en el PR B, crece en el E) y **spec E2E 4** (nace en el PR C, crece en el D con dos contextos). axe con sesión, nivel ligero, de cada pantalla y estado nuevo | **< 480 s, bloqueante** (decisiones 19.5 y 21.4) |

## El presupuesto del job `e2e` con las specs 4 y 5

Línea base: **420 s** en el gate del PR #60 (research R9). Margen: 60 s.

- Cada PR corre solo la spec de su área además de las 1, 2 y 3 (`docs/TESTING.md`
  §4): B y E corren la 5, C y D la 4. El PR E toca las dos áreas y corre las cinco.
- La parte P0-3 del dataset se siembra **por SQL** dentro de `seedCouple()`, una vez
  por worker; ninguna spec crea metas o presupuestos por la interfaz para preparar un
  caso (regla dura 1). El recorrido que la spec comprueba sí usa la interfaz.
- La spec 4 usa los dos `storageState` (Sara y Tomás) del worker; no crea cuentas.
- Los estados de axe nuevos se agrupan por ruta, con los dos temas en el mismo
  contexto, como en la 003.
- **Puntos de control con medición:** el PR B y el PR C lanzan `gh workflow run` una
  vez, cuando nace su spec, para medir el job y registrarlo en la evidencia. Si supera
  480 s, el PR se para y va a los fundadores. El techo no se mueve por una medición
  (cláusula anticliquet).

## Barrido completo de accesibilidad (decisión 21.2)

Lo lanza el gestor a mano con «Run workflow»: en cada PR que añade pantallas (B, C, D
y E) y **al cerrar P0-3**. Siete anchos, texto al 200 %, teclado completo y objetivos
de 44 px, con la etiqueta `@sweep`. Sus fallos bloquean el cierre de la etapa.

## Qué specs corre cada PR

| PR | Specs E2E | Puntos de control de CI |
| --- | --- | --- |
| A | 1, 2, 3 (no hay pantallas nuevas) | Dos: tras las tablas (`db`) y tras las funciones (`db`); y el gate |
| B | 1, 2, 3, **5** | Uno al nacer la spec 5 (medición `e2e`); y el gate |
| C | 1, 2, 3, **4** | Uno al nacer la spec 4 (medición `e2e`); y el gate |
| D | 1, 2, 3, 4 | Solo el gate |
| E | 1, 2, 3, 4, 5 | Solo el gate |

**Iteración, no CI.** Mientras se desarrolla, todo se itera contra `juntia-dev` con su
bloqueo: solo las pruebas afectadas, y `e2e:dev` completo una vez antes de cada push.
La pasada final de cada PR es la de marcarlo listo, después de la revisión de ChatGPT
con el PR en borrador (`docs/TESTING.md` §3). Ningún spike ni verificación usa runners
ni workflows.
