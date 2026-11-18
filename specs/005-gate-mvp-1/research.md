# Research — 005 · Gate privado conjunto (P0-4)

Fase 0 del plan. Cada punto dice qué se decidió, por qué y qué se descartó. **Nada aquí
reabre Q1–Q12.** Las decisiones de este archivo son **decisiones del plan**: locales y
reversibles; las que no lo son están en `plan.md`, D1–D4. Ninguna ejecución de este
archivo es evidencia del gate: el gate es CI sobre el commit candidato y las
verificaciones humanas con su salida (`AGENTS.md` 12 y 15a).

Estado de partida comprobado en `main` (`94675ca`, 17 nov 2026):

- **CI partido** (PR #83): jobs `app`, `db`, `e2e` y `a11y-session` en paralelo, más
  `evidence` a mano. Gate del #83 (run 44230682314): `app` 280 s, `db` 408 s, `e2e`
  321 s, `a11y-session` 398 s.
- **`workflow_dispatch`** con `measure_workers`, `capture_evidence`, `evidence_filter` y
  `a11y_sweep`. Un dispatch sin PR corre las cinco specs (el selector cae en la regla 6,
  «evento sin PR»). Dos dispatches sobre la misma rama se cancelan (grupo `ci-<ref>`).
- **Proyectos de Playwright:** `a11y`, `e2e` y `evidence`, todos `Desktop Chrome`.
- **Arneses de evidencia:** `theme-cls.capture.ts` (CLS y tema con CPU 6× y red lenta,
  screencast de CDP), `home-states.capture.ts` (esqueleto forzado con `lock table`, CLS,
  error, 44 px y 200 % en Inicio y Actividad, 5 cargas), `inp.capture.ts` (INP con CPU
  4×, 5 interacciones), `screens.capture.ts`.
- **Specs E2E:** cinco archivos, 35 casos; uno (`goals.e2e.ts`, el gesto del frente de la
  pila) usa `Input.dispatchTouchEvent` de CDP.
- **Etiquetas de producción:** `db-prod-2026-11-05` a `db-prod-2026-11-10`.
- **Esquema:** 12 migraciones; ninguna clave foránea hacia `auth.users` tiene `on delete`.

## R1 · Orden de trabajo y condición de entrada

**Decisión:** el orden del plan (pasos 0 a 9). Dos cosas no obvias:

- **Las mediciones en producción que alimentan el PR B van antes del PR A (paso 0b).**
  F02 se mide «primero» (Q4) y decide si B corrige algo; la primera pasada de S1–S5 y las
  verificaciones de VoiceOver, contraste y teclado encuentran defectos que B debe
  corregir. Si se hicieran solo con el candidato, cada hallazgo obligaría a otro B y a
  repetir el paso 4. Con el candidato se repiten como **confirmación** (paso 6).
- **El candidato es `main` tras el último PR de código.** El PR C solo toca documentos,
  así que la etiqueta va en el commit de código, no en el merge del C.

**Pendiente:** si el PR A puede adelantarse a FR-001 → D1.

## R2 · Dónde va cada prueba nueva y cuánto cuesta

**Método de estimación:**

- **axe con sesión, nivel ligero:** el tramo de axe del job valía 203–246 s con 94–100
  casos (runs de #81 y #82; evidencia de la 004). Son **~2,5 s por caso** y ~4–5 s por
  estado nuevo con sus dos temas en el mismo contexto (como agrupa la 003).
- **Componentes y dominio:** milisegundos a pocos segundos por archivo; no mueven `app`.
- **Integración:** 1–3 s por prueba de una sentencia contra el Supabase del runner.

**Reglas que aplica el plan** (encargo de la sesión gestora: ninguna prueba nueva lleva un
job por encima de ~600 s):

1. Lo que se puede afirmar sin navegador va a dominio, componentes o integración
   (`docs/TESTING.md` §4).
2. Un estado nuevo de FR-041 entra en el **nivel ligero** mientras `a11y-session` quede
   por debajo de **560 s estimados**; desde ahí, solo en `@sweep`. Margen: 40 s sobre
   600 s para la variación entre runs (la de `db` llegó a 139 s entre #82 y #83).
3. Lo que necesita CPU emulada, muchas cargas u otro motor va al job `release`, a mano.
4. Ninguna prueba nueva entra en el job `e2e`.

**Descartado:** subir el presupuesto (cláusula anticliquet); meter los arneses en
`evidence`, cuyo tope es 20 min y ya llena su tiempo con las capturas de P0-1 a P0-3.

## R3 · Las cinco specs en WebKit, una vez (Q3, FR-020)

**Decisión:**

- Un proyecto `e2e-webkit` en `playwright.config.ts` con `devices["Desktop Safari"]`,
  el mismo `testDir` que `e2e` y el mismo `reducedMotion: "reduce"`. No entra en
  `test:e2e:smoke`, que sigue fijando `--project e2e`.
- Corre en el tramo `webkit-e2e` del job `release`, con Supabase, Auth y Mailpit como el
  job `e2e` (las specs `@mail` también corren), y las dos pasadas de `@serial` que ya usa
  el gate.
- **El caso del gesto con CDP** se salta fuera de Chromium con
  `test.skip(browserName !== "chromium", …)` y un motivo que nombra la verificación que
  lo cubre (el gesto en el iPhone de los fundadores, FR-070). No se reescribe con otro
  mecanismo: `Input.dispatchTouchEvent` no tiene equivalente en WebKit de Playwright y
  un gesto sintético distinto no probaría lo mismo.
- **Un fallo solo de WebKit es un defecto del gate** (spec, US-2). Si es del arnés (por
  ejemplo, un cronómetro calibrado en Chromium), se documenta con su salida y lo decide
  la revisión de B; no se marca «superado».

**Estimación del tramo:** preparación y Supabase ~150 s, build ~60–90 s, WebKit con sus
librerías 60–180 s (descarga y `apt`), cinco specs 150–250 s → **420–670 s**. Si la
medición del PR A pasa de 600 s, el tramo se parte en dos con `--shard`.

**Descartado:** correr WebKit en el gate (Q3 dice «una vez»); WebKit en Windows en local
como evidencia (la memoria del gestor registra que el WebKit de Playwright se cae en
Windows y que es un problema del port, no de la app).

## R4 · Comparador de CLS por fotogramas (Q7, FR-051)

**Decisión:** un grabador en la página y un comparador puro, separados.

- **Grabador** (`scripts/cls-frames/recorder.js`, inyectado con `addInitScript`): en cada
  `requestAnimationFrame` desde el primer fotograma, registra la caja
  (`getBoundingClientRect` más el desplazamiento de la página) de cada elemento visible
  **identificado por su nodo**, y marca el primer fotograma con esqueleto y el primero
  con el contenido final.
- **Comparador** (`scripts/cls-frames/compare.mjs`): entre esos dos fotogramas, un
  desplazamiento es un nodo presente en dos fotogramas seguidos cuya esquina superior
  izquierda cambió. Los nodos que aparecen o desaparecen no cuentan (como en la API
  Layout Instability).
- **Fiabilidad:** controles positivos y negativos en los tres motores y concordancia con
  la API en Chromium, con un criterio objetivo; si no se cumple, vuelve a los
  fundadores con «solo WebKit».

Contrato completo en [contracts/cls-comparator.md](contracts/cls-comparator.md). La
grabación en vídeo de Playwright (`recordVideo`) se guarda solo en los fallos, para la
revisión humana; no es la medida.

**Descartado:** comparar píxeles de un vídeo (no distingue un desplazamiento de un
cambio de contenido en el mismo sitio); `ResizeObserver` (no ve cambios de posición);
medir solo al final de la carga (no ve un salto que vuelve a su sitio).

## R5 · Forzar el esqueleto fuera de Chromium

**Problema:** el arnés de Chromium hace visible el esqueleto con CPU 6× y red lenta por
CDP. Playwright no ofrece emulación de CPU ni de red en WebKit ni en Firefox, y contra el
Supabase local del runner la respuesta llega antes de que el esqueleto se pinte, así que
el comparador no tendría nada que comparar.

**Decisión:** retener la lectura **en el servidor**, con el método que ya usa
`home-states.capture.ts`: una sesión de `psql` toma `lock table … in access exclusive
mode` sobre la tabla que lee la ruta, la ruta enseña `loading.tsx` hasta que se suelta y
el grabador ve el paso del esqueleto al contenido. El tiempo de retención es fijo (1,5 s,
como la latencia que midió F02 contra `juntia-dev`) y se suelta desde el proceso de
pruebas. Funciona igual en los tres motores porque no depende del navegador.

- **Consecuencia:** el arnés corre en serie (`--workers 1`), porque el bloqueo afecta a
  la base del runner. Ya es así en `home-states.capture.ts`.
- **Cada ruta nombra su tabla:** Inicio y Actividad, `transactions`; Balance, las de
  liquidaciones; Plan y Análisis, `budget_versions`; Metas, `goal_ledger_entries`. La
  lista exacta se fija en el PR A leyendo qué vista consulta cada `page.tsx`.
- **Sin sesión** (acceso, A1–A4): no hay esqueleto con datos; el comparador mide la carga
  completa y cualquier desplazamiento cuenta.

**Descartado:** retrasar la respuesta con `page.route` (cambia el orden de llegada del
HTML y del RSC y no prueba el streaming real de React); un `pg_sleep` en una vista (exige
cambiar el esquema).

## R6 · CLS de 40 cargas en Chromium (FR-050)

**Decisión:** un arnés `release-cls.capture.ts` que generaliza el observador de
`theme-cls.capture.ts` y `home-states.capture.ts` a las siete rutas de FR-050 (Inicio en
Yo y en Nosotros, Actividad, Balance, Plan, Análisis y Metas), con:

- **40 cargas por ruta** en el tema claro y **10 en el oscuro** (el script de tema fue la
  causa del CLS intermitente de la 001, D21-1, y el oscuro lo ejercita), a 390 y a 1440
  alternos;
- CPU 6× y red lenta por CDP, como R2 de la 001;
- CLS **sin redondear** por carga y las fuentes de cada desplazamiento;
- una línea JSON por carga en `test-results/evidence/release-cls.jsonl`.

Consolida 003-T054 y T068 y 004-T040, T054 (CLS de Metas) y T079 (spec, FR-050).

**Tiempo:** 7 rutas × 50 cargas × ~4 s ≈ 23 min: no cabe en un tramo. Se reparte en dos
tramos (`lab-cls-a`: Inicio Yo, Inicio Nosotros, Actividad y Balance; `lab-cls-b`: Plan,
Análisis, Metas y la calibración del comparador en Chromium), de ~10–12 min de ejecución
cada uno. **Si un tramo pasa de 600 s medido, se parte otra vez** (decisión del plan; la
regla de ~600 s aplica también a lo que se lanza a mano). Ver
[contracts/ci.md](contracts/ci.md).

## R7 · LCP, INP, GoalStack con 6 metas y listas largas

- **LCP (FR-054):** `PerformanceObserver` de `largest-contentful-paint` en Chromium, en
  Inicio y Actividad, a 390 con red 4G emulada (150 ms de latencia, 1,6 Mbps de bajada,
  750 kbps de subida) y CPU 4×, y a 1440 sin emulación de red. **10 cargas** por ruta y
  ancho. Se reportan **mediana y máximo** con el rótulo «laboratorio»; **nunca «p75»**
  (SC-012). Si la mediana supera 2,5 s, es un hallazgo para los fundadores, no un
  bloqueo (Q5).
- **INP (FR-052):** `inp.capture.ts` ya mide abrir Anotar y guardar con CPU 4× a 390 y
  1440. Se amplía a las tres variantes (privado, compartido y con meta) y a 10
  interacciones por variante. Consolida 003-T054 y 004-T067.
- **GoalStack con 6 metas (FR-053):** seis metas sembradas en el runner; se recorre el
  abanico a 1440 (hover y foco de cada carta) y la pila a 390 (deslizamiento por teclado
  y por puntero) con CPU 4×. La medida son los intervalos entre `requestAnimationFrame`
  durante cada animación y las tareas largas (`longtask`). El criterio de «falla» es D3.
- **Listas largas (FR-043):** dos partes:
  - en el runner, `release-long-lists.capture.ts` siembra una cuenta con 600
    movimientos en un mes, 120 aportes y 40 versiones de presupuesto, y comprueba a 390
    y 1440 que «cargar más» no mueve el total, que no hay solapes (cajas de filas
    disjuntas) y que no hay scroll horizontal, con capturas PNG;
  - en `juntia-dev`, `scripts/dev-target/seed-long-lists.mjs` crea la misma cuenta con el
    guardia de destino, para que los fundadores la recorran con su teléfono.

  El paginador ya tiene su integración de más de 500 filas (004, F64-4); no se duplica.

Los cuatro arneses de interacción van en el tramo `lab-interaction`, en serie (con varios
workers la CPU del runner no es la de una sola pestaña, como ya dice `inp.capture.ts`).

## R8 · Lo que de verdad queda abierto de Q11

La spec (Q11) lista tres puntos. Comprobado en `main`:

| Punto | Estado en `main` | Qué hace P0-4 |
| --- | --- | --- |
| Residuo de F13 (Inicio · Yo a 1440 con la raíz al 200 % mide 1.447 px) | **Abierto** (`docs/audits/2026-11-impeccable/f13/README.md` §3) | Se corrige en B (R9) |
| Cruzar 768 px con Anotar abierto pierde el monto | **Corregido** en `829c420` (PR #74, 11 nov 2026): `BottomSheet` con `adaptive` en el mismo árbol; prueba `src/features/expenses/annotate-presentation.test.tsx` | Se confirma en navegador real (caso `@sweep` del PR A, de 390 a 1024 px y vuelta, con un monto escrito) y en el iPhone al girarlo, porque en horizontal un iPhone grande pasa de 768 px. Si no se reproduce, el PR C lo cierra con esas salidas, sin código |
| Marco de foco del monto | **Corregido** en `829c420`: sin anillo con el foco que pone la hoja al abrir; con anillo en cualquier foco posterior | Se confirma en la revisión de S2 (FR-030) y en el nivel ligero de axe, que ya exige el foco visible |

La spec se escribió con la lista del registro del gestor, que no se había actualizado
tras el PR #74. **No es una decisión nueva:** el requisito (que no se pierda lo escrito y
que el foco cumpla el handoff) sigue igual y se verifica; solo cambia que no hay código
que escribir. El PR C lo anota en la tabla de FR-002.

## R9 · El residuo de F13

**Causa** (`f13/README.md` §3): el abanico de GoalStack desde `lg` tiene geometría fija
en px (cartas de 280 px desplazadas 224 y 448). Con la raíz inyectada al 200 %, el texto
crece pero el abanico no, y la pantalla mide 1.447 px. Con la letra real del sistema al
200 % no pasa, porque las consultas de medios en `rem` también se doblan y a 1440 se
presenta la pila.

**Decisión:** el abanico se activa con una **consulta de contenedor en `rem`** sobre el
bloque de metas (el ancho mínimo que el abanico necesita, en `rem`) y su geometría pasa a
`rem`. Con la raíz al 200 %, el contenedor no llega al mínimo y se presenta la pila, igual
que con la letra del sistema. A la escala normal no cambia nada (mismo umbral en px).

**Prueba:** el caso `@sweep` del PR A con la raíz al 200 % a 1440 en Inicio · Yo y Metas
(sin scroll horizontal). No hay capa inferior que vea la geometría (jsdom no calcula
diseño).

**Descartado:** escalar el abanico en `rem` sin consulta de contenedor (cartas de 560 px
desplazadas 896: desborda más); ocultar el desbordamiento (corta las cartas).

## R10 · F02: cómo se mide y, si hace falta, cómo se corrige

**Medición (paso 0b):** cada fundador, en su iPhone, en producción, con la grabación de
pantalla de iOS (60 fps):

- **S1:** 10 cambios Yo ↔ Nosotros en Inicio, alternos, con los datos reales.
- **S5:** 10 aperturas de una meta desde Metas, alternando dos metas.
- **Tiempo hasta el contenido:** del fotograma del toque (el resaltado del control) al
  primer fotograma sin ningún bloque de esqueleto, contado fotograma a fotograma en la
  app Fotos. El gestor calcula la mediana por fundador y por experiencia. Protocolo en
  [contracts/human-verifications.md](contracts/human-verifications.md).

**Corrección, solo si Q4 la pide** (mediana > 1 s o un fundador lo juzga defecto). La
técnica la elige el plan dentro de MOTION_SYSTEM §1 (animar solo con datos del contexto
correcto, US-14):

- **S5 (abrir una meta):** precargar la meta del frente y la siguiente **del mismo
  contexto** (`<Link prefetch>` en las cartas visibles). No cruza ámbitos: son datos que
  la pantalla ya está enseñando.
- **S1 (Yo ↔ Nosotros):** **no se precarga el otro contexto.** FR-085 de la 004 y FR-037
  a FR-039 de la 003 prohíben que un ámbito esté en el HTML, el RSC, el prefetch o la
  caché del otro, y precargar Yo desde Nosotros pondría datos personales en la caché del
  cliente mientras se ve Nosotros. En su lugar, la coreografía arranca con lo que **no**
  es dato (título, color de contexto, la forma de los bloques) en cuanto se toca el
  selector, y los números se quedan en su sitio, en esqueleto, hasta que llegan los del
  contexto correcto, que entonces cuentan. Ningún número del contexto anterior se ve con
  el título nuevo.
- **Si S1 sigue por encima de 1 s** con eso, la causa es la latencia del servidor (la
  región de las funciones ya es `gru1`, junto a la base de São Paulo). Se mide qué
  consulta tarda y se trae a los fundadores antes de cambiar cómo se cargan los datos.

**Prueba si se corrige:** componentes de la transición (el número del contexto anterior
no aparece con el título nuevo; con movimiento reducido no hay animación); las
comprobaciones de HTML, RSC y prefetch de las specs 1, 3, 4 y 5, que ya corren; nueva
medición en iPhone.

## R11 · Mediciones en iPhone, con y sin Mac

- **Cronometrar sin Mac (US-12, F02):** la grabación de pantalla de iOS y el recuento de
  fotogramas en Fotos dan una resolución de ~17 ms, de sobra para umbrales de 1 s y
  10 s. Para US-12, el tiempo va del toque en Anotar al «Guardado» (E5), con al menos 10
  gastos habituales (002-T087).
- **CLS en iPhone con el Mac (002-T094, Q6 opción a):** Safari no expone `layout-shift`
  ni en el inspector. Se usa **el mismo grabador del comparador** (R4) como «Inspector
  Bootstrap Script» del inspector web de Safari (se ejecuta antes que los scripts de la
  página en cada carga), contra producción y con las cuentas reales, en las rutas de
  FR-050 con la red real del teléfono: 10 cargas por ruta. El comparador se ejecuta sobre
  la salida (copiada de la consola, sin datos: solo cajas y marcas de tiempo) en el
  equipo del gestor. Se adjunta además una captura de Timelines («Layout & Rendering»).
  - **Antes de pedir el Mac**, el PR A comprueba que el grabador corre como script
    independiente en Safari de escritorio contra `juntia-dev`, en el equipo de un
    fundador si alguno tiene acceso a un Mac, o en el propio Mac el día del préstamo,
    contra `juntia-dev`, antes de producción.
- **Nada personal sale del teléfono:** el grabador registra cajas y nombres de nodo, no
  texto. El comparador del PR A tiene una prueba que lo afirma.

## R12 · Copias, restauración real y su cadencia (Q9)

**Decisión:** los scripts que ya existen, sin cambios:

- `scripts/backup.sh` (quickstart de la 002 §4.1, modo producción): copia cifrada con
  gpg, manifiesto de recuentos y huellas, y comprobación bloqueante de que las
  migraciones de producción coinciden con la última etiqueta `db-prod-*`. Esa
  comprobación **cubre la segunda mitad de FR-015** (migraciones aplicadas = repositorio).
- `scripts/restore-plain.sh` (§4.3): restauración en un PostgreSQL 17 limpio del equipo
  de un fundador, con `check-invariants.sql` y el manifiesto. El protocolo de P0-3
  (`docs/TESTING.md`, «Restauración P0-3») ya incluye las seis tablas nuevas y lo prueba
  el ensayo de CI con N1–N11.

**Cadencia escrita en la checklist (FR-062):** copia semanal (un día fijo que eligen los
fundadores) y una antes de cada migración de producción; pérdida máxima aceptada, 7 días.
**Dueño:** el fundador que tiene gpg y la copia. **Recordatorio:** un evento semanal en el
calendario de ese fundador. **Decisión del plan:** sin automatización, porque la
contraseña de producción no puede salir de su equipo (decisión 19.3).

**FR-004 (002-T097):** el gestor comprueba en el paso 0b si existe una copia anterior al
primer movimiento real (fecha del manifiesto frente a la fecha del primer movimiento,
consultada como recuento por fecha, sin datos). Si no existe, se registra tal cual y se
hace la copia de inmediato.

**Restauración real (FR-061):** en el paso 7, sobre la copia semanal del final del periodo
de uso, para que incluya una semana de datos reales con el esquema completo de P0-3. Si
un fundador usa Windows, la restauración corre en Git Bash con el PostgreSQL 17 de PGDG o
de EDB; si no hay PostgreSQL 17 en ningún equipo, se instala ese día, antes de descifrar
nada.

## R13 · Candidato, etiqueta, despliegue y vuelta atrás

- **Etiqueta (FR-022):** `mvp-1-YYYY-MM-DD` sobre el commit candidato, anotada, la crea la
  dueña o el gestor con su «sí». Es distinta de las `db-prod-*`, que marcan migraciones:
  P0-4 no tiene migraciones y `backup.sh` sigue tomando la última `db-prod-*`. Vercel
  reconoce a la dueña como autora del HEAD de `main` porque los merges los hace su cuenta
  (decisión 13, regla 2). **Decisión del plan.**
- **Vuelta atrás (FR-064):** «Instant Rollback» de Vercel al despliegue de producción
  anterior, y después volver a promover el actual. Solo es seguro **entre despliegues sin
  migraciones intermedias**: la checklist lo dice y, si hubo una migración, la vuelta
  atrás exige una decisión. El ensayo se hace una vez, a una hora sin uso, con el «sí» de
  la dueña, porque cambia producción unos minutos. Evidencia: identificadores de
  despliegue antes, durante y después.

## R14 · Sondas de producción (FR-013, FR-014, FR-015, FR-068)

- **Superficie interna (FR-014; 001-T072 partes 1 y 2):** `curl` de solo lectura a
  `/interno/primitivos` en el dominio de producción, con el host propio y con un host no
  autorizado; esperado: 404 sin el título interno en el HTML ni en el RSC. Lo hace el
  gestor; la salida (código, longitud y si aparece el título) va a la checklist.
- **Claves en `NEXT_PUBLIC_*` (FR-015):** lista de **nombres** de variables del entorno
  de producción de Vercel (sin valores), por la dueña en el panel o por el gestor con el
  conector de Vercel en solo lectura y su «sí». Esperado: ninguna clave secreta de
  Supabase con prefijo `NEXT_PUBLIC_`.
- **Registros de Vercel (FR-013):** una semana de registros de ejecución, buscando
  patrones de importes (`\$\s?\d`, `amount`, `_minor`), notas, correos y tokens
  (`eyJ`, `sb_secret`, `Bearer`). Se registran las búsquedas y su número de
  coincidencias, **nunca las líneas**. Si hay coincidencias, es un defecto de privacidad
  y va a B.
- **Analítica y errores (FR-013):** revisión de código de que no hay SDK de analítica
  (el `package.json` no tiene ninguno) y, en la checklist de humo, la pestaña de red de
  Safari no muestra peticiones a terceros. Las respuestas de error ya las cubren los
  contratos de errores de las specs 002–004.
- **Tabla de idempotencia (FR-068):** un `select count(*)` y
  `pg_total_relation_size` de solo lectura en producción, con el gestor y el proyecto
  enlazado según el procedimiento de migraciones (lectura: sin confirmación por paso).
  Se registran el recuento y el tamaño.

## R15 · Borrado manual de cuenta (Q8)

**Hechos que condicionan el procedimiento:**

- Ninguna clave foránea hacia `auth.users` tiene `on delete`: borrar el usuario de Auth
  falla mientras queden filas suyas.
- Movimientos, ledger de metas, versiones de presupuesto y auditoría son de **solo
  inserción**: sus triggers rechazan `delete` para cualquier rol (004 research R1).
- Gastos compartidos, asignaciones, liquidaciones, metas compartidas y solicitudes
  mezclan a las dos personas.

Por eso el alcance con pareja no se puede elegir en el plan → **D2**. El procedimiento,
sus precondiciones y su verificación están en
[contracts/account-deletion.md](contracts/account-deletion.md) para la opción recomendada;
se ajusta a la que elijan los fundadores.
