# Contrato del CI — 005

Aplica ADR-011 §3, §4 y §9, las decisiones 18, 19.5 y 21 y la partición del PR #83. Parte
de `specs/004-presupuestos-y-metas/contracts/ci.md` y del PR #83, y dice solo lo que
cambia. **Nada de esto está implementado**: lo implementa el PR A. Presupuestos y techos
**no se mueven** (cláusula anticliquet, `docs/TESTING.md` §9).

## Jobs del gate: sin cambios de forma

| Job | Presupuesto | Qué añade P0-4 | Estimado |
| --- | --- | --- | --- |
| `app` | < 360 s, avisa | Dominio (US-08), componentes (US-21, US-13), prueba del comparador puro | ≤ 330 s |
| `db` | < 360 s, avisa (hoy 408–547 s por el ensayo de restauración) | Integración de US-08 en la vista; la del borrado (D2) | ≤ 565 s |
| `e2e` | < 660 s, bloquea | Nada. El `skip` del gesto fuera de Chromium no cuesta | 321 s |
| `a11y-session` | < 660 s, bloquea | Estados de FR-041 en el nivel ligero, hasta 560 s estimados | ≤ 490 s |

- **Regla del encargo:** ninguna prueba nueva lleva un job por encima de ~600 s. Lo que
  no cabe va a `@sweep` o al job `release`.
- **Las condiciones de `app`, `db`, `e2e` y `a11y-session` ganan `&& !inputs.release_lab`**:
  un lanzamiento del laboratorio no corre también el gate entero.
- **Selectores:** sin cambios de reglas. `tests/evidence/**` ya es neutro para
  `a11y-select`; los archivos nuevos de `scripts/cls-frames/` y `scripts/account-deletion/`
  caen en la regla de `scripts/` (todo), que es lo correcto para el PR que los crea. Si el
  PR A añade un archivo `*.a11y.ts` nuevo (no está previsto: los estados van en
  `route-registry.ts`), entra en el mapa de `a11y-select` en el mismo PR, porque
  `tests/a11y-select.test.ts` lo exige.

## Job nuevo: `release` (solo a mano)

```yaml
release:
  if: github.event_name == 'workflow_dispatch' && inputs.release_lab
  runs-on: ubuntu-24.04
  timeout-minutes: 20
  strategy:
    fail-fast: false
    matrix:
      leg: [lab-cls-a, lab-cls-b, lab-interaction, webkit-e2e, webkit-cls, firefox-cls]
```

- **Entradas nuevas de `workflow_dispatch`:**
  - `release_lab` (booleano): lanza el job.
  - `release_legs` (texto; vacío = todos): los tramos que corren, separados por comas,
    para repetir solo los afectados por un PR B. Un tramo que no está en la lista termina
    en segundos con «no pedido», nunca como aprobado.
- **Cada tramo:** reloj del job; Supabase con Auth y Mailpit; caché de `.next/cache` con la
  clave del job `e2e`; `npm ci` y build; el navegador del tramo con el patrón de Chromium
  (tope propio, un reintento, matar el `apt-get` colgado); Arial y Georgia como en
  `evidence` (los respaldos de fuentes cambian la geometría); el comando del tramo;
  artefacto `release-<tramo>` con `test-results/` y los `.jsonl`; resumen con tiempos.
- **Presupuesto:** `jobBudget` devuelve **600 s sin bloquear** para `release`: avisa si un
  tramo pasa de 600 s y el plan lo parte (abajo). El tope duro es el `timeout-minutes`.
- **Nunca en `pull_request`.** `tests/ci-workflow.test.ts` lo afirma, junto con los seis
  tramos, el tope, que ningún otro job corre con `release_lab` y que el tramo
  `webkit-e2e` usa el proyecto `e2e-webkit`.

| Tramo | Navegador | Comando | FR | Estimado |
| --- | --- | --- | --- | --- |
| `lab-cls-a` | Chromium | `release-cls.capture.ts` con Inicio Yo, Inicio Nosotros, Actividad y Balance; `--workers 1` | FR-050 | 550–650 s |
| `lab-cls-b` | Chromium | `release-cls.capture.ts` con Plan, Análisis y Metas, y la calibración del comparador en Chromium (contrato del comparador §5) | FR-050, FR-051 | 500–620 s |
| `lab-interaction` | Chromium | `inp.capture.ts` (tres variantes), `release-lcp.capture.ts`, `release-goalstack.capture.ts` (criterio de D3: ≥ 95 % de fotogramas en ≤ 18,2 ms y ninguno > 50 ms, CPU 4×), `release-long-lists.capture.ts`; `--workers 1` | FR-052, FR-053, FR-054, FR-043 | 450–580 s |
| `webkit-e2e` | WebKit | `--project e2e-webkit` con las cinco specs: primero sin `@serial` y después `@serial` con un worker, como el gate | FR-020 | 420–670 s |
| `webkit-cls` | WebKit | `--project evidence-webkit` (`cls-frames.capture.ts`) | FR-051 | 400–550 s |
| `firefox-cls` | Firefox | `--project evidence-firefox` (`cls-frames.capture.ts`) | FR-051 | 400–550 s |

**Si un tramo mide más de 600 s** en el punto de control del PR A, se parte en dos con
`--shard=1/2` y `2/2` como tramos nuevos de la matriz, en el mismo PR. **Decisión del
plan.** Ningún tramo se acorta quitando cargas: las 40 de FR-050 son de la spec.

**Coste:** seis tramos de 8–11 min facturados ≈ **55 min por lanzamiento completo**.
Lanzamientos previstos: el punto de control del PR A, el paso 2 solo si el A no lo cubrió y
el candidato (paso 4c); `release_legs` limita los relanzamientos tras un PR B.

## Barrido `@sweep`

- Corre como hoy: `a11y_sweep` en `app` (sin sesión) y `a11y-session` (con sesión), sin
  presupuesto que bloquee y con el tope de 12 min.
- **Casos nuevos del PR A** (en `routes.a11y.ts`, etiqueta `@sweep`): 200 % en hojas,
  diálogos, A1–A6 e invitación (FR-042); raíz al 200 % a 1440 en Inicio · Yo y Metas
  (residuo de F13); Anotar con un monto escrito de 390 a 1024 px y vuelta (R8); el foco
  vuelve al disparador al llegar por URL y cerrar con Escape (FR-046).
- **Si el barrido medido en el paso 2 pasa de 600 s**, `a11y-session` en modo barrido corre
  como matriz de dos tramos con `--shard`, solo cuando `a11y_sweep` es verdadero; el nivel
  ligero del gate no cambia. **Decisión del plan**, condicionada a la medición.

## Runs a mano sobre el commit candidato (paso 4)

**En serie, nunca dos a la vez** (el grupo de concurrencia `ci-<ref>` cancela el anterior):

1. **Run completo** (`gh workflow run ci.yml --ref main`, sin entradas): `app`, `db` con el
   ensayo de restauración y N1–N11, `e2e` con las cinco specs (el selector cae en la regla
   6 sin PR) y `a11y-session` con el registro completo. FR-010, FR-020 (Chromium), SC-001.
2. **Barrido:** `-f a11y_sweep=true`. FR-040, SC-004.
3. **Laboratorio:** `-f release_lab=true`. FR-020 (WebKit), FR-050–FR-054, FR-043.

Los lanza el gestor (los agentes no lanzan CI). Si uno falla por la infraestructura del
runner y no por el código, se relanza solo el job o tramo fallido. **No se relanza «para ver
si pasa»** (`AGENTS.md` 15a): un fallo se diagnostica con el log del run.

## Lo que no cambia

- Specs E2E: 5 de 4–6. Ninguna nueva.
- Presupuestos de `e2e` y `a11y-session` (660 s, bloquean) y sus topes (12 min).
- El job `evidence` y sus entradas.
- El «Nivel 2» de `docs/TESTING.md` §3 sigue sin implementarse; lo enmienda el PR
  documental T085 (fila 17 de la spec). El PR A documenta el job `release` en §3 y §9 sin
  presentarlo como nivel 2.
