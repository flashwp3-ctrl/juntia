# Contrato del CI — 005

Aplica ADR-011 §3, §4 y §9, las decisiones 18, 19.5 y 21 y la partición del PR #83. Parte
de `specs/004-presupuestos-y-metas/contracts/ci.md` y del PR #83, y dice solo lo que
cambia. **Nada de esto está implementado**: lo implementa el PR A. Presupuestos y techos
**no se mueven** (cláusula anticliquet, `docs/TESTING.md` §9).

Revisión del PR #85 (ChatGPT):

- **En `1a529d8`:** F85-4 (las entradas del laboratorio y de la evidencia se excluyen
  entre sí) y F85-7 (presupuesto de los tramos de CLS, recalculado con el arranque).
- **En `4a820fe`:** F85-9 (el guardia de entradas corre también en `pull_request`, para
  no omitir el gate).

## Jobs del gate: mismo contenido, un `needs` más

Los cuatro jobs del gate ganan `needs: inputs-guard` y la condición `!inputs.release_lab`
(abajo). El guardia corre y pasa en cada `pull_request` no borrador, así que el gate se
ejecuta igual que hoy (F85-9).

| Job | Presupuesto | Qué añade P0-4 | Estimado |
| --- | --- | --- | --- |
| `app` | < 360 s, avisa | Dominio (US-08), componentes (US-21, US-13), prueba del comparador puro | ≤ 330 s |
| `db` | < 360 s, avisa (hoy 408–547 s por el ensayo de restauración) | Integración de US-08 en la vista; la del borrado (D2) | ≤ 570 s |
| `e2e` | < 660 s, bloquea | Nada. El `skip` del gesto fuera de Chromium no cuesta | 321 s |
| `a11y-session` | < 660 s, bloquea | Estados de FR-041 en el nivel ligero, hasta 560 s estimados | ≤ 490 s |

- **Regla del encargo:** ninguna prueba nueva lleva un job por encima de ~600 s. Lo que
  no cabe va a `@sweep` o al job `release`.
- **Selectores:** sin cambios de reglas. `tests/evidence/**` ya es neutro para
  `a11y-select`; los archivos nuevos de `scripts/cls-frames/` y `scripts/account-deletion/`
  caen en la regla de `scripts/` (todo), que es lo correcto para el PR que los crea. Si el
  PR A añade un archivo `*.a11y.ts` nuevo (no está previsto: los estados van en
  `route-registry.ts`), entra en el mapa de `a11y-select` en el mismo PR, porque
  `tests/a11y-select.test.ts` lo exige.

## Entradas a mano: qué corre con cada combinación (F85-4)

Hoy, `evidence` corre con `capture_evidence`, y `app`, `db`, `e2e` y `a11y-session` con
cualquier lanzamiento que no sea `capture_evidence`. Con una entrada nueva,
`release_lab`, dos lanzamientos pedidos a la vez se pisarían: por ejemplo,
`release_lab` y `capture_evidence` arrancarían a la vez `release` y `evidence`, cada uno
con su Supabase, y gastarían minutos en dos laboratorios. **Regla: `release_lab` es
exclusiva.** Con ella, no se puede pedir `capture_evidence`, `a11y_sweep` ni
`measure_workers`.

| Lanzamiento | `inputs-guard` | `app` | `db` | `e2e` | `a11y-session` | `evidence` | `release` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pull_request` en borrador | no corre | no | no | no | no | no | no |
| `pull_request` (no borrador) | **corre y pasa** (no valida nada) | **sí** | **sí** | **sí** | **sí** | no | no |
| `workflow_dispatch` sin entradas | pasa | sí | sí | sí (las cinco) | sí | no | no |
| `a11y_sweep` | pasa | barrido | no cambia | no (salvo `measure_workers`, F83-1) | barrido | no | no |
| `capture_evidence` | pasa | no | no | no | no | sí | no |
| **`release_lab`** | pasa | no | no | no | no | no | **sí** |
| **`release_lab` con cualquier otra entrada** | **falla** con `::error` («`release_lab` no se combina con otras entradas») | no | no | no | no | no | no |

- **Un job nuevo, `inputs-guard`**, con un paso que falla cuando `release_lab` llega
  acompañada de otra entrada. Así el lanzamiento acaba en rojo y dice por qué, en lugar
  de no correr nada en silencio.
- **El guardia corre también en `pull_request`** (revisión del PR #85, F85-9). Su
  condición es la unión de las de sus dependientes:
  `github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.event.pull_request.draft == false)`.
  - En `pull_request` termina bien sin validar nada: el paso de validación lleva
    `if: github.event_name == 'workflow_dispatch'`.
  - Por qué hace falta: un job con `needs` y un `if` sin función de estado lleva un
    `success()` implícito, que exige que todas sus dependencias terminen bien. **Si el
    guardia se omitiera en un PR, GitHub omitiría también `app`, `db`, `e2e` y
    `a11y-session`**, y un check omitido puede contar como satisfecho: el gate no
    correría y parecería verde.
- **Alternativa descartada:** que los dependientes acepten un guardia omitido con
  `always()` o `!cancelled()` y comprueben `needs.inputs-guard.result` a mano. Con esa
  opción, cada dependiente tiene que distinguir «omitido en un PR» de «fallido en un
  lanzamiento manual», y una condición mal escrita en uno solo desbloquearía un
  lanzamiento inválido. Con el guardia siempre presente, el `success()` implícito hace
  ese trabajo en todos los jobs y no hay nada que escribir a mano.
- **Coste:**
  - en minutos, un job de segundos por run, que GitHub factura como 1 minuto;
  - en reloj, el gate arranca unos 10–20 s más tarde, lo que tarda el runner del
    guardia;
  - los presupuestos de job no cambian, porque cada job mide desde su propio inicio.
- **Condiciones:**
  - `app`, `db`, `e2e` y `a11y-session` ganan `&& !inputs.release_lab`;
  - `evidence` gana `&& !inputs.release_lab`;
  - `release` exige `inputs.release_lab && !inputs.capture_evidence && !inputs.a11y_sweep && !inputs.measure_workers`;
  - **todos** dependen de `inputs-guard` (`needs`), los del gate incluidos.
- **Prueba:** `tests/ci-workflow.test.ts` no se conforma con buscar textos en el YAML.
  - **Evalúa los `if`:** la expresión de cada job, con un evaluador mínimo de las
    expresiones que usa el workflow (`&&`, `||`, `!`, `==`, `inputs.*`,
    `github.event_name` y `github.event.pull_request.draft`).
  - **Simula `needs`** con las reglas de GitHub: un job cuyo `if` es falso se omite; un
    `if` sin función de estado añade `success()`, así que el job se omite si alguna
    dependencia no terminó bien; y un paso que falla hace fallar su job.
  - **Casos:** las **16 combinaciones** de las cuatro entradas booleanas en
    `workflow_dispatch`, más `pull_request` en borrador y no en borrador. El resultado
    tiene que ser la tabla de arriba.
  - **Lo que exige en un PR no borrador:** que el guardia termina bien y que `app`, `db`,
    `e2e` y `a11y-session` **se ejecutan**, no solo que no fallan.
  - **Lo que exige con una combinación inválida:** que el guardia falla y nada más corre.
  - Si el workflow usa una expresión que el evaluador no conoce, la prueba falla en
    lugar de adivinar. También afirma que `release` nunca corre en `pull_request`.

## Job nuevo: `release` (solo a mano)

```yaml
release:
  needs: inputs-guard
  if: github.event_name == 'workflow_dispatch' && inputs.release_lab && !inputs.capture_evidence && !inputs.a11y_sweep && !inputs.measure_workers
  runs-on: ubuntu-24.04
  timeout-minutes: 20
  strategy:
    fail-fast: false
    matrix:
      leg: [cls-inicio-yo, cls-inicio-nosotros, cls-actividad, cls-balance, cls-plan, cls-analisis, cls-metas,
            cls-controls-chromium, lab-interaction, webkit-e2e-1, webkit-e2e-2,
            webkit-cls-1, webkit-cls-2, webkit-cls-3, firefox-cls-1, firefox-cls-2, firefox-cls-3]
```

- **Entradas nuevas de `workflow_dispatch`:**
  - `release_lab` (booleano): lanza el job;
  - `release_legs` (texto; vacío = todos): nombres o prefijos de tramo separados por
    comas (por ejemplo, `cls-metas,webkit-cls`), para repetir solo los afectados por un
    PR B. Un tramo que no está en la lista termina en segundos con «no pedido», nunca
    como aprobado.
- **Cada tramo:**
  - reloj del job;
  - Supabase con Auth y Mailpit;
  - caché de `.next/cache` con la clave del job `e2e`;
  - `npm ci` y build;
  - el navegador del tramo, con el patrón de Chromium: tope propio, un reintento y matar
    el `apt-get` colgado;
  - **PR B (decisión del gestor del 19 nov 2026):** los `.deb` de `install-deps` en caché
    (`actions/cache`, clave `apt-<SO>-<navegador>-<hash de package-lock.json>`), repuestos en
    el archivo de apt antes de instalar y guardados solo tras una instalación buena; apt con
    `Acquire::Retries 5` y `Acquire::http::Timeout 30`. Motivo: en los runs 44433137464,
    44437546506 y 44439996119, tramos de WebKit cayeron antes de la primera prueba porque
    `install-deps` superó dos veces 240 s bajando ~114 MB del mirror. **Limitación aceptada:**
    el primer lanzamiento después de cambiar `package-lock.json` va en frío (sin caché) y
    puede volver a caer en esa instalación; los tramos que arrancan a la vez no comparten la
    caché hasta que uno la guarda;
  - Arial y Georgia como en `evidence` (los respaldos de fuentes cambian la geometría);
  - el comando del tramo;
  - artefacto `release-<tramo>` con `test-results/` y los `.jsonl`;
  - resumen con tiempos.
- **Presupuesto:** `jobBudget` devuelve **600 s sin bloquear** para `release`: avisa si un
  tramo pasa de 600 s, y entonces el plan lo parte (abajo). El tope duro es el
  `timeout-minutes`.

### Presupuesto por tramo (F85-7)

**Arranque de cada tramo** (lo que cuesta antes de la primera carga), con los pasos de
los runs del #81, #82 y #83:

- preparación ~25 s;
- Supabase 106–123 s;
- `npm ci` y build 58–93 s;
- parada ~10 s.

En total, **~200–250 s** con Chromium (7 s). WebKit y Firefox añaden su descarga y sus
librerías por `apt`, 60–180 s: **~260–430 s**.

**Coste por carga:**

- Chromium con CPU 6× y red lenta, ~4 s (R6);
- WebKit y Firefox, sin emulación pero con el esqueleto retenido 1,5 s en el servidor
  (R5), ~3 s;
- un control del comparador, ~2,5 s.

| Tramo | Navegador | Qué corre | Cargas | Ejecución | Total estimado |
| --- | --- | --- | --- | --- | --- |
| `cls-inicio-yo`, `cls-inicio-nosotros`, `cls-actividad`, `cls-balance`, `cls-plan`, `cls-analisis`, `cls-metas` (7 tramos) | Chromium | `release-cls.capture.ts` con **una ruta por tramo**: 40 cargas en claro y 10 en oscuro, con la API y el grabador a la vez (concordancia, contrato del comparador §5, control 6) | 50 | ~200 s | **~400–450 s** cada uno |
| `cls-controls-chromium` | Chromium | Los controles 1 a 6 del comparador, 10 cargas cada uno, más 10 del movimiento de 0,5 px | 70 | ~175 s | ~375–425 s |
| `lab-interaction` | Chromium | `inp.capture.ts` (tres variantes, 10 interacciones), `release-lcp.capture.ts` (40 cargas), `release-goalstack.capture.ts` (criterio de D3: ≥ 95 % de fotogramas en ≤ 18,2 ms y ninguno > 50 ms, CPU 4×), `release-long-lists.capture.ts`; `--workers 1` | — | ~250–330 s | **~450–580 s** |
| `webkit-e2e-1`, `webkit-e2e-2` | WebKit | `--project e2e-webkit --shard=N/2`: las cinco specs, primero sin `@serial` y después `@serial` con un worker, como el gate | — | ~75–125 s | **~340–560 s** cada uno |
| `webkit-cls-1` | WebKit | Los controles 1 a 6 (70 cargas) | 70 | ~175 s | ~440–610 s |
| `webkit-cls-2` | WebKit | A1, A2 y A4 (sin sesión), Inicio en Yo y en Nosotros, 15 cargas cada una | 75 | ~225 s | **~490–655 s** |
| `webkit-cls-3` | WebKit | Actividad, Balance, Plan, Análisis y Metas, 15 cargas cada una | 75 | ~225 s | **~490–655 s** |
| `firefox-cls-1`, `-2`, `-3` | Firefox | Lo mismo que los tres de WebKit | 70 / 75 / 75 | 175–225 s | ~440–655 s |

**Los tramos de WebKit y Firefox con 75 cargas** pueden pasar de 600 s si la instalación
del navegador va lenta. **Si el punto de control del PR A mide más de 600 s** en un tramo,
ese tramo se parte en dos (por ejemplo, `webkit-cls-3` en `-3a` y `-3b`), en el mismo PR.
**Decisión del plan.** Ningún tramo se acorta quitando cargas: las 40 de FR-050 son de la
spec, y las 15 de fuera de Chromium son la decisión del plan del contrato del comparador
§6.

**Coste por lanzamiento completo:** GitHub cobra cada job redondeado al minuto.

| Grupo | Minutos facturados |
| --- | --- |
| 7 tramos de CLS en Chromium, a ~8 min | ~56 |
| Controles en Chromium | ~6 |
| `lab-interaction` | ~10 |
| `webkit-e2e`, 2 tramos | ~16 |
| `webkit-cls`, 3 tramos | ~29 |
| `firefox-cls`, 3 tramos | ~29 |
| `inputs-guard` | 1 |
| **Total** | **≈ 145–155 min** (con los controles 5 y de 0,5 px de F85-11, unos 3 min más que en `4a820fe`) |

Antes de esta corrección, el plan daba ≈ 55 min, con seis tramos que no cabían.

**Lanzamientos previstos:**

- **Completos, dos:** el punto de control del PR A, que también calibra el comparador, y
  el candidato (paso 4c). El paso 2 no lanza `release` si el último commit del PR A es el
  que llega a `main`.
- **Parciales, con `release_legs`:** solo los tramos afectados por un PR B, ≈ 20–60 min.

## Barrido `@sweep`

- Corre como hoy: `a11y_sweep` en `app` (sin sesión) y `a11y-session` (con sesión), sin
  presupuesto que bloquee y con el tope de 12 min.
- **Casos nuevos del PR A** (en `routes.a11y.ts`, etiqueta `@sweep`):
  - 200 % en hojas, diálogos, A1–A6 e invitación (FR-042);
  - raíz al 200 % a 1440 en Inicio · Yo y Metas (residuo de F13);
  - Anotar con un monto escrito, de 390 a 1024 px y vuelta (R8);
  - el foco vuelve al disparador al llegar por URL y cerrar con Escape (FR-046).
- **Si el barrido medido en el paso 2 pasa de 600 s**, `a11y-session` en modo barrido corre
  como matriz de dos tramos con `--shard`, solo cuando `a11y_sweep` es verdadero; el nivel
  ligero del gate no cambia. **Decisión del plan**, condicionada a la medición.

## Runs a mano sobre el commit candidato (paso 4)

**En serie, nunca dos a la vez:** el grupo de concurrencia `ci-<ref>` cancela el
anterior.

1. **Run completo** (`gh workflow run ci.yml --ref main`, sin entradas). FR-010, FR-020
   (Chromium), SC-001.
   - `app`;
   - `db`, con el ensayo de restauración y N1–N11;
   - `e2e`, con las cinco specs (el selector cae en la regla 6 sin PR);
   - `a11y-session`, con el registro completo.
2. **Barrido:** `-f a11y_sweep=true`. FR-040, SC-004.
3. **Laboratorio:** `-f release_lab=true`, sola. FR-020 (WebKit), FR-050–FR-054, FR-043.

Los lanza el gestor: los agentes no lanzan CI.

- Si uno falla por la infraestructura del runner y no por el código, se relanza solo el
  job o el tramo fallido.
- **No se relanza «para ver si pasa»** (`AGENTS.md` 15a): un fallo se diagnostica con el
  log del run.

## Lo que no cambia

- Specs E2E: 5 de 4–6. Ninguna nueva.
- Presupuestos de `e2e` y `a11y-session` (660 s, bloquean) y sus topes (12 min).
- El job `evidence` y sus entradas, salvo la condición `!inputs.release_lab`.
- El «Nivel 2» de `docs/TESTING.md` §3 sigue sin implementarse; lo enmienda el PR
  documental T085 (fila 17 de la spec). El PR A documenta el job `release` en §3 y §9 sin
  presentarlo como nivel 2.
