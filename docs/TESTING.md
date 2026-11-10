# TESTING.md — Cómo se prueba Juntia

Documento operativo. La decisión y su justificación están en
[`docs/adr/ADR-011`](adr/ADR-011-estrategia-de-pruebas-y-ci.md), que está en estado
**Aceptado** por los fundadores el 3 de noviembre de 2026 (maestro §15.10). Lo que
describe aquí es un **contrato aprobado, pendiente de implementación**: todavía no hay scaffold ni suite ejecutada, y lo no medido sigue marcado como objetivo.

**Terminología:** «spec E2E *n*» es una spec de Playwright de la tabla de §4. Una
**especificación** (001, 002…) es un slice de producto. No se confunden.

> **Nada de lo que hay aquí se ha ejecutado todavía.** No existe scaffold de
> aplicación (maestro §15.1), no hay `package.json` y no hay suite. Los comandos
> describen el destino. Cada uno lo crea la especificación que trae lo que
> controla: la 001 crea los que no dependen de Supabase ni de auth, y P0-1 el
> resto (§3, «Arranque progresivo de `verify` y del CI»).
>
> Los presupuestos de tiempo son **objetivos razonados y todavía no medidos**.
> **Pasan a bloquear cuando existan tres de las cinco specs E2E y el dominio
> cubra DEC-G04 y balances** — el cierre de P0-2. Hasta ese hito el job mide,
> reporta y avisa, sin fallar; después, superar el presupuesto del humo falla el
> build (§9). La cláusula anticliquet, en cambio, aplica desde hoy.

---

## 1. El principio, en una frase

**Una prueba E2E se justifica cuando valida una integración o recorrido observable
que las capas inferiores no garantizan en conjunto.** No hace falta que ninguna de
sus partes sea detectable por separado: basta con que la costura entre ellas
—navegación, sesión, estado de cliente— no esté garantizada por ninguna.

Lo que no es un E2E: reproducir en el navegador una comprobación que una capa
inferior ya hace entera. La pregunta práctica es **«¿qué se rompería sin que
ninguna capa inferior se entere?»**. Si la respuesta es «nada», bájalo de capa.

Y el corolario, que importa más: **los tests derivan de los criterios de
aceptación, nunca de lo que hace la implementación.** Un test escrito mirando el
código afirma el bug además de la función.

---

## 2. Comandos

**El contenido de los controles es uno solo:** lint + typecheck + unit de dominio
+ **componentes (RTL selectivo)** + tests SQL/RLS. Es el mismo enunciado que usa el
ADR, palabra por palabra. **Dónde corre cada parte** lo fija ADR-011 §9: `verify`
local ejecuta los cuatro primeros y marca SQL/RLS «SOLO EN CI — pendiente de
resultado»; el gate completo del PR los ejecuta todos, sobre el mismo commit.

**Esa definición es el destino, no el primer día.** La especificación 001 no tiene
Supabase, migraciones ni auth, así que su `verify` no puede correr SQL/RLS. Cada
control entra con la especificación que trae lo que controla, y mientras tanto se
declara **no aplicable**: ver «Arranque progresivo de `verify` y del CI» en §3.

**Sin Docker en local** (ADR-011 §9, decisión 17 del maestro). Hay dos conceptos:

- **`verify` local** ejecuta lint, typecheck, dominio y componentes. Los tests
  SQL/RLS, la integración de servidor y las E2E aparecen como «SOLO EN CI —
  pendiente de resultado», nunca como pasados ni como «no aplicable» una vez que
  existen.
- **El gate completo del PR** es `verify` más los jobs 3 y 4 de CI sobre el mismo
  commit. Esos jobs corren en todo PR de código desde que existen, sin filtro de
  rutas.

Para probarlos en una rama sin abrir el PR: `gh workflow run ci.yml --ref <rama>`,
que ejecuta los mismos jobs que un push. Ninguna función, política o migración
está probada sin la salida de ese job en ese commit.

**Iterar contra `juntia-dev` (decisión 18, ADR-011 §9.9).** Mientras se
desarrolla, las capas de base de datos se iteran contra `juntia-dev`, que es
desechable, y no contra el CI: los minutos de GitHub Free no alcanzan para iterar
en CI. El CI corre solo en los puntos de control del `tasks.md` y en el gate
final, y solo su salida cuenta como evidencia. Los correos reales y el ensayo de
restauración siguen solo en CI. Comandos, guardia y límites: «Iterar contra
`juntia-dev`», al final de esta sección.

| Comando | Qué hace | Presupuesto |
| --- | --- | --- |
| `npm run verify` | lint + typecheck + unit de dominio + componentes; los tests SQL/RLS aparecen como «SOLO EN CI — pendiente de resultado» (ADR-011 §9). **El comando por defecto.** | **< 90 s** (comando) |
| `npm run test:unit` | Vitest, proyecto `domain`, suite completa | **< 15 s** (comando) |
| `npm run test:unit -- --changed` | Solo lo afectado por los cambios. Para el bucle local | — |
| `npm run test:components` | Vitest, proyecto `components` (RTL selectivo, §10.1) | sin presupuesto propio; dentro de `verify` |
| `npm run test:db` | `supabase test db` contra Supabase local. **Solo en CI** (ADR-011 §9) | **< 60 s**, medido dentro del job 3 |
| `npm run test:e2e:smoke` | Playwright, specs de humo del PR, solo Chromium | **< 3 min** (job de CI) |
| `npm run test:e2e` | Playwright, las cinco specs, Chromium + WebKit | nivel 2 |
| `npm run test:a11y` | axe sobre las rutas **ya implementadas**, en los dos temas (§3) | PR y nivel 2 |
| `npm run db:dev:reset` | Reinicia `juntia-dev` con las migraciones de la rama y `supabase/seed.sql` (solo de pruebas). Decisión 18 | — (iteración) |
| `npm run test:db:dev` | Reinicia `juntia-dev` y corre pgTAP de `supabase/tests`, como el job `db`. Decisión 18 | — (iteración) |
| `npm run test:integration:dev` | Integración de servidor contra `juntia-dev`, sin las pruebas de correo. Decisión 18 | — (iteración) |
| `npm run e2e:dev` | Build con `juntia-dev`, E2E sin `@mail` y axe con sesión. Decisión 18 | — (iteración) |

**«Comando» y «job de CI» no miden lo mismo** — ver §9. Un presupuesto de comando
mide solo la ejecución, con las dependencias ya instaladas; uno de job incluye
`npm ci`, la instalación del navegador y el arranque de servicios.

Si vas a ejecutar una sola cosa antes de abrir un PR, ejecuta `verify`.

### Iterar contra `juntia-dev` (decisión 18, ADR-011 §9.9)

Mientras desarrollas, las capas de base de datos se iteran contra `juntia-dev`
(`itfrhnadovezpahikuol`), que es desechable y no guarda datos reales. **Nada de lo
que sale de aquí es evidencia**: el gate sigue siendo `verify` más los jobs `db` y
`e2e` del CI sobre el mismo commit, y el CI corre solo en los puntos de control
del `tasks.md` y en el gate final (ADR-011 §9.8).

**Preparación, una vez por equipo.** Un fundador copia `.env.test.example` como
`.env.test` en la raíz del clon principal (los worktrees lo encuentran allí) y lo
rellena desde el panel de `juntia-dev`: URL, clave publicable, una clave secreta
propia para pruebas y la conexión del pooler de sesión. `.env.test` está en
`.gitignore` y el runner se niega a usarlo si `git check-ignore` no lo confirma.
Hace falta `psql` (el cliente de PostgreSQL 17; en Windows se encuentra solo en
`C:Program FilesPostgreSQL<versión>in`). Sin Docker (decisión 17).

| Comando | Qué corre | Qué se salta, declarado en su resumen |
| --- | --- | --- |
| `npm run db:dev:reset` | `supabase db reset --db-url` (CLI 2.121.0, la del CI) con las migraciones de la rama y `supabase/seed.sql`; después comprueba el número de migraciones y el esquema `tests` | No hay semilla de producción: `seed.sql` es solo de pruebas (esquema `tests` y correos `@seed.test`) |
| `npm run test:db:dev` | Primero `db:dev:reset` (como el job `db`, pgTAP supone la base recién reiniciada); después, cada archivo de `supabase/tests` con `psql`, con las reglas de `pg_prove` (ningún `not ok`, plan exacto, `psql` sin error). `supabase test db` necesita Docker | `db:types:check` (`gen types --local` necesita Docker), el ensayo de restauración y los nueve controles negativos (§9.6), y los artefactos del job `db` |
| `npm run test:integration:dev` | `vitest --project integration`, con timeouts de 60 s por la latencia hasta East US | Las pruebas que envían o leen un correo (`it.skipIf(sendsMailOnDev)`) y el 40P01 real de `money.test.ts`, cuya carrera de interbloqueo no se reproduce de forma fiable con la latencia de dev; el resumen las lista por nombre |
| `npm run e2e:dev` | `next build` con la URL y la clave publicable de dev, `--project e2e --grep-invert @mail` y `--project a11y` con `A11Y_JOB=e2e` | Las E2E etiquetadas `@mail` (registro, recuperación, Mailpit), listadas por nombre, y el proyecto `evidence` |
| `npm run e2e:dev -- <args>` | El mismo `next build` y solo lo que digan los argumentos, reenviados a Playwright: un `.e2e.ts`, `--grep` u `--only-changed` corren en `--project e2e`; un `.a11y.ts`, en `--project a11y` con `A11Y_JOB=e2e`; `--project e2e|a11y` elige el proyecto. Siempre con `--grep-invert @mail` | Todo lo que los argumentos no piden. Solo se admite una lista blanca (F55-1): archivos de `tests/` terminados en `.e2e.ts` o `.a11y.ts`, `--grep`/`-g` con un patrón que no empieza por `-`, `--only-changed [ref]` y `--project e2e|a11y`. Cualquier otro argumento se rechaza antes del guardia y del bloqueo |

**Qué correr mientras iteras (regla de los fundadores, 7 de noviembre de 2026).** Contra `juntia-dev`, solo las pruebas afectadas por el cambio: las de componentes de los archivos que tocas y, si hace falta, `npm run e2e:dev -- <archivo>.e2e.ts` (o `<archivo>.a11y.ts`, `--grep`, `--only-changed`). El `e2e:dev` completo, sin argumentos, **una vez justo antes de cada push**. El CI sigue corriendo la suite completa una sola vez, cuando el PR pasa a listo.

**Diferencia del stack alojado, resuelta el 6 de noviembre de 2026.** En `juntia-dev`, las funciones de
`pgcrypto`, `uuid-ossp` y `pg_stat_statements` son de `postgres`; en el runner, de `supabase_admin`. Los fundadores
eligieron excluir del inventario F40-2 solo las funciones que pertenecen a una extensión (`pg_depend`, `deptype = 'e'`),
igual en CI y en dev, y probar que la API de datos no expone `extensions` (ADR-013 §5.4, nota de esa fecha).

Lo que no cubre dev, en una línea: **correos, ensayo de restauración, tipos
generados y cualquier evidencia**. Dev no tiene Mailpit, y su correo integrado
admite 2 envíos por hora y solo a miembros de la organización.

**El guardia de destino** (`scripts/dev-target/guard.mjs`, con su prueba de unidad
en `tests/dev-target-guard.test.ts`) corre antes de cualquier conexión y se repite
dentro del proceso de pruebas antes de cada escritura (`tests/support/dev-target.ts`).
Se niega, con un mensaje que nombra la variable y nunca su valor, si:

- el ref de producción `enwaxmwgldqohfawxhdm` aparece en cualquier variable de
  `.env.test` o del entorno, también dentro del payload de una clave JWT heredada;
- la URL no es exactamente `https://itfrhnadovezpahikuol.supabase.co`;
- la conexión no es la directa de dev ni el pooler de sesión con el usuario
  `postgres.itfrhnadovezpahikuol` (el pooler de transacción, 6543, se rechaza), o lleva
  parámetros, fragmento o varios hosts: libpq deja que `?host=`, `?hostaddr=`, `?user=`,
  `?port=` o `?service=` anulen la cabecera, así que la URL tiene que ser exactamente
  `postgresql://usuario:contraseña@host:5432/postgres`;
- una clave no es de Supabase o es una clave JWT de otro proyecto o rol;
- `supabase/.temp/project-ref` existe y no es dev, en el worktree **o** en el checkout
  principal (quickstart §3 de la 002).

**Entorno de libpq limpio.** psql (el runner y `tests/integration/support/sql.ts`) y la
CLI de Supabase no heredan ninguna variable `PG*` (`PGHOSTADDR`, `PGSERVICE`,
`PGSERVICEFILE`, `PGPASSFILE`, `PGSSLMODE`…): se quitan todas y se ponen solo las que
salen de la URL validada, con TLS obligatorio (`cleanPgEnv` en el guardia).

**La contraseña de la base no va en la línea de órdenes.** `db:dev:reset` pasa a la
CLI la URL **sin** contraseña en `--db-url` y la contraseña en `PGPASSWORD`, dentro de ese
entorno limpio; el lanzador de la CLI 2.121.0 corre con `node` directamente desde la
caché de npx, sin npm de por medio, así que tampoco hay log de npm con la orden. psql
nunca recibe la URL como argumento. Riesgo que queda: la contraseña está en el
entorno de esos procesos hijos, que en Windows y Linux solo puede leer el mismo usuario
del equipo.

**La clave secreta** solo la leen `scripts/dev-target` y el soporte de pruebas, con
nombres que la app no usa (`JUNTIA_DEV_*`, nunca `NEXT_PUBLIC_`). El lint prohíbe
esos nombres, `SECRET_KEY`, `sb_secret_` y `.env.test` en `src/`, y que `src/` importe
nada de `scripts/` (por ruta, alias, `export … from`, `import()` o `require()`). El build de
`e2e:dev` y el servidor de la app arrancan sin la clave secreta ni la conexión, y
Playwright nunca reutiliza un servidor abierto: si el puerto de la app está ocupado,
`e2e:dev` se niega. La salida de cada paso pasa por un filtro que oculta la
clave y la contraseña de la base.

**Puerto de la app: 3400** (7 de noviembre de 2026). El 3000 y el 3100 son de otro
proyecto del mismo equipo. Una sola fuente, `scripts/app-port.mjs`: la variable `PORT`
del shell (no la de `.env.local`), 3400 por defecto; un segundo servidor usa `PORT=3500`.
La leen `npm run dev` y `npm run start` (por `scripts/next.mjs`), `playwright.config.ts`
(`baseURL` y `webServer`) y `e2e:dev` (`SITE_URL`). El `SITE_URL` del CI y el `site_url`
de `supabase/config.toml` no pueden leerla y fijan 3400; `tests/app-port.test.ts` falla si
se separan. Playwright **nunca** reutiliza un servidor (`reuseExistingServer: false`): uno
abierto podría ser de otro proyecto o de otra rama de Juntia. Antes de arrancar,
`next.mjs`, la configuración de Playwright y `e2e:dev` comprueban que el puerto esté
libre; si no lo está, se niegan con el PID y el nombre del proceso que lo tiene y no
cierran nada: ciérralo tú si es tuyo o espera. En `juntia-dev`, Authentication › URL
Configuration necesita `http://localhost:3400` como Site URL y `http://localhost:3400/**`
en las Redirect URLs solo para los enlaces de correo de una prueba manual con
`npm run dev`; `e2e:dev` no lo necesita, porque salta las pruebas `@mail`. Un segundo
servidor en `PORT=3500` necesita su propia redirección permitida en Auth
(`http://localhost:3500/**`) para las pruebas manuales de correo. `npm run dev` y
`npm run start` rechazan `-p`/`--port` en los argumentos: el puerto se fija solo con `PORT`.

**Un agente a la vez.** Cada comando crea el directorio `juntia-dev.lock` en la
carpeta común de git (`.git/` del clon principal). `mkdir` es atómico: de dos agentes
que lo intentan a la vez, solo uno lo crea. Dentro deja `owner.json` con la rama, el
comando, la hora, el equipo, el PID y un identificador único de la ejecución, escrito
con un rename para que nunca se lea a medias. Si el dueño está vivo, el comando se
niega y dice quién. **El bloqueo nunca se recupera solo**: si su dueño murió de golpe
(SIGKILL, cierre de la terminal, apagón) o los metadatos no se pueden leer, el comando
se niega igual, porque un descendiente podría seguir escribiendo en dev o el PID pudo
reutilizarse. Se libera a mano: `npm run dev:unlock` enseña a quién pertenece y no toca
nada; `npm run dev:unlock -- --force` lo borra, después de comprobar que no queda
ningún proceso de ese comando. Con Ctrl+C o SIGTERM se termina el **árbol entero** del
hijo en curso (Windows: `taskkill /PID <pid> /T /F`; POSIX: el hijo corre en su propio
grupo y se señala el grupo, con SIGKILL a los 5 s; si 10 s después del SIGKILL el
árbol sigue vivo, el comando falla de forma explícita y el bloqueo se queda huérfano para
`dev:unlock --force`, nunca se suelta ni se espera para siempre), no empieza ningún paso nuevo, y el
bloqueo se suelta solo cuando ya no queda ningún proceso. Un único punto lo suelta
(`scripts/dev-target/session.mjs`, con el flujo `runInSession` que comparten `run.mjs` y
su prueba): el final normal del comando espera la misma cancelación en curso, y la
sesión conserva el grupo de cada paso hasta comprobar que ya no existe, aunque su
proceso principal haya terminado antes que sus descendientes. **Limitación en Windows:**
`taskkill /T` necesita la raíz viva para encontrar a sus descendientes; si la raíz de un
paso ya terminó, un nieto huérfano no se ve. En POSIX el grupo sí se sigue viendo. Si el comando muere sin pasar por ahí (error fatal, SIGKILL), no se
sabe en qué estado quedó el árbol y el bloqueo se queda huérfano hasta `dev:unlock --force`. **Entre
equipos no hay mecanismo**: los dos fundadores no usan `juntia-dev` a la vez y se
avisan antes de un `db:dev:reset`, que además borra los perfiles y movimientos de las
cuentas que se usen a mano en dev (las cuentas de Auth no se borran).

**Antes de `e2e:dev`, una vez**: en `juntia-dev`, Authentication › Rate Limits,
subir el límite de inicios de sesión. Cada estado de axe con sesión entra con su
propia cuenta sembrada, y el límite por defecto del Auth alojado se queda corto.

---

## 3. Qué corre dónde

### Nivel 1 — cada push a un PR de código

Los controles 1, 2 y 5 van **en un solo job (`app`), en serie y por orden de coste**; 3 y 4 serán jobs propios cuando entren. No corre en PR que solo tocan archivos documentales (`**/*.md`, `docs/**/*.png`, `specs/**/*.png` y `specs/**/*.txt`), salvo los que alimentan herramientas o agentes: `.specify/**`, `.claude/**`, `.agents/**`, `AGENTS.md` y `CLAUDE.md` siempre lo disparan. Tampoco corre en borradores. En un borrador se lanza a mano con «Run workflow», que solo aparece cuando el workflow ya está en `main`; un push nuevo cancela el run anterior; tope de 10 min por job. Es la enmienda del 4 de noviembre de ADR-011 §5. Controles:

1. lint + typecheck + build
2. **Vitest: dominio completo y componentes (RTL selectivo)** — el mismo contenido
   que `verify` ejecuta en local, menos los tests SQL/RLS, que van en el job 3
3. Supabase local en contenedor **dentro del runner**, migraciones aplicadas, tests SQL de RLS e integración de servidor. Es la única ejecución de esas capas: no corren en los equipos (ADR-011 §9)
4. E2E de humo: **las specs E2E 1, 2 y 3, más la spec E2E del área que el PR toca**, solo
   Chromium
5. **axe en los dos temas** — ver la regla justo debajo

**La pasada final de un PR es la de marcarlo listo (regla del gestor, 7 de
noviembre de 2026).** El workflow corre en `pull_request` con los tipos
`opened`, `synchronize`, `reopened` y `ready_for_review`, así que lanzar «Run
workflow» a mano y luego marcar el PR como listo cuesta **dos pasadas
completas** (pasó en los PR #52 y #51). El orden es: iterar contra `juntia-dev`
con las pruebas afectadas, `e2e:dev` completo una vez antes de cada push, revisión
de ChatGPT con el PR en borrador y, al aprobarse, **marcarlo listo: esa es la
única pasada**. «Run workflow» queda solo para los puntos de control intermedios
que pida `tasks.md` en un PR largo (como T012 y T016 del PR A de la 003). Si la
pasada falla por la infraestructura del runner y no por el código, se relanza
solo el job fallido.

**Gate de PR completo: < 6 min, medido como job de CI. Superar el presupuesto del
humo falla el build** (a partir del hito de §9).

#### Arranque progresivo de `verify` y del CI

Igual que las specs E2E, los controles de `verify` y los jobs del CI **entran con
la especificación que trae lo que controlan**. Ninguna especificación construye
infraestructura antes de tiempo para que `verify` «pase completo».

| Control | Entra con | Antes de eso |
| --- | --- | --- |
| lint + typecheck + build (control 1, job `app`) | 001 | — |
| Vitest, proyectos `domain` y `components` (control 2, job `app`) | 001, que crea los dos proyectos y corre lo que haya | — |
| axe sobre las rutas implementadas, en los dos temas (control 5, job `app`) | 001 | — |
| Reduced motion por defecto en Playwright | 001 | — |
| Supabase local, migraciones y tests SQL/RLS (control 3, job propio; `test:db`) | **P0-1, obligatoriamente** | **No aplicable** |
| E2E de humo (control 4, job propio) | La primera spec E2E, que nace en P0-1 | **No aplicable** |
| Siembra por base de datos (`seedCouple()`, `storageState` por worker y rol) | P0-1 | **No aplicable** |

Tres reglas, sin excepción:

1. **Un control no aplicable se declara como tal**, en la salida de `verify` y en
   el resumen del CI, con la especificación que lo incorpora. **Nunca aparece
   como pasado y nunca se omite en silencio.** «Verde» con un control que no corrió
   es exactamente afirmar una seguridad que no existe.
2. **No se adelanta infraestructura.** La 001 no levanta Supabase, no escribe
   migraciones vacías ni tests SQL de relleno para completar `verify`.
3. **El contrapositivo, como en las specs E2E:** P0-1 **no mergea** sin incorporar
   el job 3, las migraciones y la siembra. Si existe una tabla con datos de
   usuario y no hay tests de RLS que la cubran, no es que el arranque siga en
   curso: es que un PR mergeó sin cumplir la regla.

#### Qué rutas pasa axe en un PR

**Dos niveles desde el 7 de noviembre de 2026 (maestro §15.10, decisión 21).**

- **En cada PR de código, nivel ligero:** cada pantalla y cada estado registrado,
  **una vez**, a 390 px, en los dos temas. Sin sesión en el job `app` y con sesión
  en el job `e2e`. Una violación seria o crítica rompe el PR.
- **Barrido completo, a mano:** los siete anchos, el texto al 200 %, el teclado
  completo y los objetivos de 44 px. Corre con «Run workflow» al cerrar cada etapa
  (fin de P0-2, fin de P0-3, antes de MVP-1) y en todo PR que cambie el diseño de
  una pantalla existente o añada una. Lo lanza el gestor, y sus fallos bloquean el
  cierre de la etapa. Los archivos `*.a11y.ts` separan los dos niveles (por
  ejemplo, con una etiqueta `@sweep` excluida de la pasada del PR).

La intención es correr axe **sobre las rutas que el PR toca**. Eso necesita un
mapa de ruta tocada —qué rutas afecta un cambio— y **ese mapa todavía no existe**.

> **Mientras no exista: axe corre sobre todas las rutas ya implementadas**, en los
> dos temas. Si todavía no hay ninguna implementada, no corre nada y no hay nada
> que declarar.

**Dónde corre** (ADR-011 §5, enmienda «Axe en dos jobs»): según si el estado real
necesita sesión, no según el grupo de rutas. Los estados sin sesión, en el job
`app`; los que la necesitan (incluidas la primera entrada y la contraseña nueva
con sesión de recuperación), en el job `e2e`, con sesión sembrada. Una prueba de
cobertura comprueba que entre los dos el control está completo en cada PR de
código.

Y la parte que no se puede malinterpretar: **una ruta futura nunca cuenta como
verificada**. El fallback no es «damos por buenas las cinco»; es «corremos las que
hay». De las cinco rutas de la matriz, el PR solo puede afirmar las que existen, y
cada ruta nueva entra en la comprobación con el PR que la crea. El nocturno corre
la matriz completa de las rutas implementadas, por la misma razón.

### Nivel 2 — al mergear a `main` y de noche

1. E2E completo: **las cinco specs**, Chromium + WebKit
2. axe en la matriz completa: 5 rutas × 2 temas
3. Snapshots visuales de **las 5 rutas** — no de cada componente
4. Rendimiento contra los umbrales del maestro §15.7

### Fuera de CI — el gate visual humano

El maestro §10.1 marca **«Visual y motion»** como bloqueante para cada flujo
insignia, y **sigue siéndolo**. Se cumple con **capturas adjuntas al PR, revisadas
por los dos fundadores** (§10.3, §10.4). No se automatiza: automatizar un criterio
subjetivo produce falsos positivos que la gente aprende a ignorar, y un gate que se
ignora es peor que ninguno.

Las partes objetivas de esa fila sí están en CI: axe, `prefers-reduced-motion`,
snapshots de ruta y los umbrales de §15.7.

Esto **no releva de nada más**. Ninguna verificación de seguridad, autorización o
atomicidad se pospone al lanzamiento (maestro §15.6, advertencia de jerarquía).

---

## 4. Dónde va cada test

La tabla completa, criterio por criterio, está en el ADR-011 §2. El resumen
utilizable:

| Si lo que pruebas es… | Va en | Dura |
| --- | --- | --- |
| Aritmética de dinero, agregados, saldos, DEC-G04, clasificación de movimientos | **Vitest, dominio puro** | ms |
| Quién puede leer o escribir qué | **SQL / RLS sobre Supabase local** | s |
| Atomicidad, idempotencia, concurrencia, auditoría | **Integración de servidor, sin navegador** | s |
| Cómo **se presenta** un dato: signo, forma de la ficha, etiqueta, color | **Vitest + RTL**, proyecto `components` | ms |
| Un artefacto que **sale** del sistema: exportación JSON/CSV | **Integración de servidor** | s |
| El recorrido completo de una persona por rutas reales con sesión real | **E2E** | min |
| Que una ruta no tiene violaciones de accesibilidad | **E2E barato por ruta** (visitar + axe) | s por ruta |

Tres preguntas que resuelven casi todos los casos dudosos:

1. **¿Qué se rompería sin que ninguna capa inferior se entere?** Si la respuesta es
   «nada», no es un E2E. Si es un recorrido, una redirección, una sesión o una
   vista que no se refresca, lo es.
2. **¿El ataque usa el botón?** Si no, es un test de RLS, no de UI. Un test que
   comprueba que el botón está escondido no comprueba que la escritura está
   prohibida.
3. **¿El criterio dice «se presenta» o «se renderiza»?** Entonces no basta con el
   dominio, por mucho que el dominio acierte: hace falta afirmar lo que se pinta.

**Un criterio puede necesitar dos capas**, y tres las necesitan (ADR-011 §2, filas
2, 5 y 10). Cuando eso pasa, **las dos mitades son bloqueantes**; ninguna
«refuerza» a la otra. La fila 16 (axe) no cuenta aquí: es una sola técnica en dos
momentos de CI, no en dos capas.

### Tope de specs E2E

**4 a 6 para TODO P0.** No por slice: en total. Y ya están nombradas:

| # | Spec | Área que cubre |
| --- | --- | --- |
| 1 | Acceso y Mi cuenta | auth, cuenta, pareja, invitaciones |
| 2 | Anotar gasto, cronometrado (US-12) | gastos, anotar |
| 3 | Pareja 50/50 y liquidación | repartos, balance, liquidaciones, contexto |
| 4 | Meta con aportes y uso | metas |
| 5 | Presupuesto activado/desactivado | presupuestos |

Las cuatro familias de smoke de §10.1 más US-12 y Mi cuenta caben en esas cinco.
Queda **una sexta plaza libre** dentro del tope.

**Cada especificación de slice declara cuántas añade, con un máximo de 2.** Si
crees necesitar más, **detente y plantéalo**. No las añadas y lo menciones después.

### Qué specs corre tu PR

**Las specs E2E 1, 2 y 3, más la spec E2E del área que tu PR toca.**

- PR de metas → 1, 2, 3 y **4**
- PR de presupuestos → 1, 2, 3 y **5**
- PR que no toca ninguna de esas dos áreas → 1, 2 y 3
- ¿Dudas de qué área tocas? → corre las cinco

El nocturno corre siempre las cinco. Esta regla existe por un motivo concreto: sin
ella se puede mergear un slice de metas sin haber ejecutado nunca el recorrido de
aportes y uso, y §10.1 marca ese smoke como **bloqueante**. Que el nocturno lo
ejecute después no sirve: después ya está en `main`.

#### Mientras las specs todavía no existen

Al principio no están las cinco. Cuando la 001 construye el AppShell no hay
recorrido de pareja ni de liquidación, así que la spec E2E 3 no puede existir.

> **Corre todas las specs aplicables que ya existan. Y no mergees una
> funcionalidad sin añadir y ejecutar su E2E obligatoria.**

**Lo que arranca progresivamente es qué specs existen, no la obligación.** No hay
«todavía no», ni «la añado en el siguiente PR», ni «de momento corro las que hay»
para una funcionalidad que estás entregando. El PR que trae el recorrido de pareja
es el PR que trae la spec E2E 3.

No es una excepción temporal: **la spec nace con la funcionalidad que prueba**, y
por eso la lista se completa sola según avanza P0. Si existe una funcionalidad de
P0 sin su spec, no es que el arranque siga en curso: es que un PR mergeó sin
cumplir la regla.

### Matriz de recorridos

Cinco nombres de archivo no son cobertura. Los cinco recorridos que cruzan límites
de seguridad o de navegación viven **como casos dentro de esas cinco specs** — no
se crean specs nuevas para ellos:

| Recorrido | Qué no cubren las capas inferiores en conjunto | Dónde vive |
| --- | --- | --- |
| Invitación → login → volver → aceptar | Que la intención sobreviva al rodeo por el login; redirección y sesión | Caso en la **spec E2E 1** |
| Cambiar Yo/Nosotros | Caché de cliente o render obsoleto que sigue mostrando lo privado | Caso en la **spec E2E 3** |
| Mover a Pareja | Que la vista cambie y los balances se actualicen tras la operación | Caso en la **spec E2E 3** |
| Financiación ajena → aprobar/rechazar | Coordinación entre **dos sesiones** y actualización de estados en ambas | Caso en la **spec E2E 4**, con dos contextos |
| Exportar datos | Autorización + archivo realmente descargado | Contenido y autorización en **integración**; la descarga, caso en la **spec E2E 1** (Exportar vive en «Privacidad y datos») |

Los cinco tienen spec asignada; ninguno queda «en algún sitio donde haya sesión».

Dos cosas que se siguen de la tabla. La spec E2E 4 necesita dos contextos autenticados
a la vez: de ahí la regla 2, estados **por worker y por rol**. Y el caso de
exportación de la spec E2E 1 comprueba que **el archivo llega**, no lo que lleva
dentro: el contenido es la fila 2 de la tabla de ubicación, y un E2E que abra el
CSV es un test de serialización disfrazado.

### Y la capa de componentes

La fila «Componentes · RTL selectivo» de §10.1 sigue vigente y corre como proyecto
aparte dentro del job de Vitest. **No tiene presupuesto de tiempo propio: cabe
dentro de los < 90 s de `verify`.** Las dos palabras del maestro son el límite:
*selectivo* y *en flujos críticos*. Si esa capa empieza a necesitar su propio
presupuesto, el problema no es el presupuesto: es que hay un test por componente.

---

## 5. Las siete reglas duras

1. **Sembrar estado por base de datos o API, nunca por la interfaz.** Un helper
   tipo `seedCouple()` inserta directo y devuelve el `storageState`. Ningún test
   crea su pareja haciendo clic en el formulario de invitación.
   **Cada worker siembra su propia pareja aislada.** De ahí sale la respuesta al
   paralelismo: `workers: 1` es el scaffold por defecto de Playwright, no un
   mandato, y lo que de verdad rompe al paralelizar no es el navegador sino que dos
   workers se pisen los datos. Eso se arregla en la siembra, no bajando los
   workers. Con parejas aisladas, varios workers son seguros; cuántos caben lo mide
   la primera especificación con autenticación (P0-1), que es la que construye la
   siembra. La 001 no tiene auth ni base de datos.
2. **Un `storageState` por worker y por rol**, nunca uno solo para toda la suite.
   Cada worker autentica a **Sara y a Tomás sobre su propia pareja**, reutiliza
   esos dos estados dentro del worker y no los comparte con ningún otro. El
   mecanismo documentado por Playwright es un fixture de **scope `worker`** que
   sobreescribe `storageState`, diferenciado con `test.info().parallelIndex`.
   `playwright/.auth` va en `.gitignore`.
   **Por qué no una sesión compartida:** la documentación de Playwright separa los
   dos casos exactamente por esto. Cuenta compartida es «the recommended approach
   for tests **without server-side state**», y su «When not to use» dice «Your
   tests modify server-side state … tests must use different accounts». Cuenta por
   worker es «the recommended approach for tests that **modify server-side
   state**». Los tests de Juntia mutan estado de servidor casi siempre: anotan
   gastos, liquidan, aportan a metas, aceptan invitaciones. Una sesión única
   contradiría además la regla 1, que exige una pareja aislada por worker.
   Dos roles, y no uno, porque la pareja es de exactamente dos y hay recorridos que
   necesitan ambas sesiones a la vez — la confirmación de fondos ajenos de la spec
   4 no se puede montar con una sola.
3. **`reducedMotion: 'reduce'` por defecto** en el contexto de Playwright. Es más
   rápido, es mucho menos frágil frente a los springs y las View Transitions, y
   ejercita de continuo un criterio de aceptación. **Un** test corre con motion
   activo, para los dos momentos L2.
4. **Cero `waitForTimeout`.** Solo aserciones web-first (`await expect(...)`), que
   reintentan solas. Se impone con una **regla de ESLint**, no con buena voluntad.
5. **Retries 0 en local, 1 en CI.** Un test que necesita el segundo intento **dos
   veces** se saca a cuarentena y se arregla (§8).
6. **Un solo navegador en los PRs:** Chromium, instalado con
   `npx playwright install --with-deps chromium`. WebKit solo en el nocturno.
7. **Nada de colores hex crudos** fuera de `styles/tokens.css`. Regla de lint.

---

## 6. Cómo se escribe un test desde un criterio de aceptación

El orden importa y no es negociable: **primero el criterio, después el test,
después el código.** Si abres el archivo de la función para saber qué comprobar,
ya perdiste: vas a escribir un test que afirma el bug.

### Ejemplo trabajado: DEC-G04

**Paso 1 — localizar el criterio, literal.**
`docs/design/HANDOFF_CLAUDE_CODE.md`, «Criterios de aceptación (solo P0)»:

> DEC-G04: `total_destinado_neto` reproduce cada fila de la tabla anterior y nunca
> se rotula «Total gastado» ni ocupa el número héroe.

**Paso 2 — localizar la fórmula aprobada.** Maestro §15.4:

```
total_destinado_neto = gasto_consumo + aporte_a_metas − retiro_de_metas − gasto_financiado_con_meta
```

**Paso 3 — darse cuenta de que la tabla ya es el test.** La tabla de DEC-G04 del
handoff tiene siete filas con entradas y salida esperada. Eso es un
`test.each`, no siete tests escritos a mano:

| Caso · vista | consumo | aportes | retiros | financiado | **esperado** |
| --- | ---: | ---: | ---: | ---: | ---: |
| Octubre · Nosotros | 2.840.000 | 900.000 | 0 | 0 | **3.740.000** |
| Octubre · Yo, Sara | 1.912.900 | 500.000 | 0 | 0 | **2.412.900** |
| Octubre · Yo, Tomás | No disponible | 400.000 | 0 | 0 | **No disponible** |
| Retiro · Yo, Sara libera 200.000 | 0 | 0 | 200.000 | 0 | **−200.000** |
| Tiquetes Japón · Nosotros | 3.000.000 | 0 | 0 | 3.000.000 | **0** |
| Tiquetes · Yo, Sara | 1.500.000 | 0 | 0 | 1.620.000 | **−120.000** |
| Tiquetes · Yo, Tomás | 1.500.000 | 0 | 0 | 1.380.000 | **+120.000** |

**Paso 4 — escribirlo.** `test.each` con las siete filas, en el proyecto `domain`,
sin tocar React, Supabase ni la red. Importes en unidades menores (ADR-002); la
tabla está en pesos por legibilidad del diseño.

Tres cosas que la tabla obliga a modelar y que un test escrito desde el código no
habría descubierto:

- **La fila «No disponible» no es cero.** Es ausencia de dato (el fixture no define
  los privados de Tomás, y en la app Sara nunca los vería). La función tiene que
  distinguir «no disponible» de `0`, igual que DEC-R01 distingue `null` de cero en
  los presupuestos. Un test que convierta eso en `0` está mal.
- **El resultado puede ser negativo y eso es correcto.** −200.000 y −120.000 son
  valores válidos. No hay `Math.max(0, …)` en ninguna parte.
- **Las vistas no se suman.** Sara −120.000 + Tomás +120.000 = Nosotros 0 es una
  propiedad que merece su propia aserción, derivada de la nota del handoff.

**Paso 5 — lo que NO se automatiza.** «Nunca se rotula “Total gastado” ni ocupa el
número héroe» es jerarquía visual. Va a la **revisión humana del PR**, no a un
selector. Un test que busca la cadena «Total gastado» se satisface con un sinónimo
igual de malo.

### El mismo procedimiento, en seco

1. Copia el criterio literal del handoff o del maestro al principio del test, como
   comentario, con la referencia (`§15.4`, «Criterios de aceptación»).
2. Localiza la decisión aprobada que lo respalda (DEC, ADR o §15).
3. Pregúntate en qué capa vive (§4 de este documento).
4. Si hay una tabla, es `test.each`. Si hay un dataset, es el fixture dorado.
5. Escribe el test. **Míralo fallar.** En RLS, la documentación de Supabase
   recomienda explícitamente romper la política a propósito («Break each policy and
   watch the suite fail») para comprobar que el test realmente detecta algo.
6. Después escribe el código.

### El fixture de octubre es un activo, no una maqueta

Los datos de `docs/design/COMPONENT_SPECIFICATIONS.md` tienen totales verificados a
mano: consumo 2.840.000, aportes 900.000, saldo Sara +429.900 / Tomás −429.900,
arriendo 55/45. Son **el dataset dorado de la suite**, no decoración de las
pantallas. Viven en un único módulo tipado del dominio que **crece por slice**:
P0-1 aporta los tipos y los privados de Sara, P0-2 los gastos compartidos, el saldo
y la liquidación parcial, y P0-3 los aportes, la meta Japón y las filas de
DEC-G04. La 001 no aporta ninguna parte. Responsables, fases y reglas: maestro
§15.10, «Dataset dorado».

Si un cálculo no reproduce esos números **exactos**, el cálculo está mal. No el
fixture.

---

## 7. Quién responde de qué

Tres responsables, tres cosas distintas. Confundirlas es cómo una suite verde deja
pasar un bug.

### El agente que implementa — **hechos**

Lo que se puede comprobar y pegar. En el PR:

- Que `verify` pasa, **con la salida real pegada**. No «todo en verde».
- Que los números del fixture de octubre salen **exactos**.
- **Cuántos tests añadió y cuáles**, por nombre.
- Cuántas specs E2E añadió (recuerda: máximo 2 por especificación) y por qué cada
  una no podía vivir en una capa inferior.
- Los tiempos medidos de cada suite contra su presupuesto.

`AGENTS.md` 12 y 18: no se afirma «verificado» sin haber ejecutado, y no se
inventan salidas, capturas ni URLs. Un `[V]` no se marca resuelto por haber escrito
el test; se marca resuelto pegando su salida.

### CI — **lo que el agente no puede**

- Instalación limpia desde cero.
- Migraciones aplicadas desde cero sobre una base vacía.
- Que no rompió otro slice.
- Los presupuestos de tiempo en una máquina que no es la de nadie.

### La revisión humana — **juicio**

Nada de esto lo puede decidir una máquina:

- **¿El test afirma la especificación o la implementación?** Si se escribió mirando
  el código, es un test que confirma lo que hay, no lo que debe haber.
- **¿Se marcó un `[V]` como resuelto sin ejecutarlo?**
- **¿Hay dependencias fuera del stack congelado** de §7.1 que el slice no
  necesitaba?
- **¿Algo privado se filtra al contexto Nosotros?** En totales, en búsquedas, en
  exportaciones.
- **¿`total_destinado_neto` está mal rotulado** o ocupa el número héroe?
- **¿El número de tests es proporcional al riesgo**, o hay un test por componente?
- Y el gate visual de §10.1: capturas a 390 y 1440, en los dos temas.

---

## 8. Cuarentena de flakes

Un test que necesita el segundo intento **dos veces** está roto, aunque pase.

1. **Marcarlo.** `test.fixme()` o `test.skip()` con un comentario que diga la fecha
   y el síntoma. No se borra.
2. **Abrir el issue en el mismo PR** que lo pone en cuarentena, con el trace de
   Playwright adjunto.
3. **No se queda ahí.** Un test en cuarentena es deuda visible: se arregla o se
   elimina razonadamente en el siguiente slice. Si se elimina, el PR dice qué
   criterio de aceptación queda sin cubrir y dónde se cubre ahora.
4. **Causas típicas, en orden de frecuencia:** una espera fija que la regla 4
   prohíbe; estado sembrado por la interfaz en vez de por la base, contra la regla
   1; animación no cubierta por `reducedMotion`; dos tests que comparten datos
   porque no se aisló la siembra.
5. **Si tres tests entran en cuarentena en un mismo mes**, el problema no son los
   tests: es la infraestructura de siembra o el diseño de la suite. Se para y se
   revisa, no se sigue poniendo tiritas.

Y lo que **no** es cuarentena: subir `retries`. Retries es 0 en local y 1 en CI, y
no se toca.

---

## 9. Los presupuestos son un contrato

Son **dos magnitudes distintas** y no se comparan entre sí.

### Presupuestos de comando — ejecución local pura

Con las dependencias ya instaladas y, si hace falta, Supabase ya arrancado. **No
incluyen `npm ci`.**

| Comando | Presupuesto |
| --- | --- |
| `verify` local (lint + typecheck + dominio + componentes; SQL/RLS solo en CI, ADR-011 §9) | **< 90 s** |
| Unit de dominio, suite completa | **< 15 s** |
| Tests SQL / RLS (comando medido dentro del job 3 en CI, ADR-011 §9) | **< 60 s** |

### Presupuestos de job de CI

Incluyen **todo**: checkout, `npm ci`, instalación del navegador, arranque de
servicios y ejecución. Es lo que tarda el check en ponerse verde.

| Job | Presupuesto |
| --- | --- |
| E2E de humo en PR | **< 3 min** |
| **Gate de PR completo** (el job más lento; hoy, `app`) | **< 6 min** |
| Job `e2e` (specs E2E y axe con sesión en su nivel ligero; maestro §15.10, decisiones 19.5 y 21, 6–7 nov 2026, y decisión de los fundadores del 10 nov 2026, abajo) | **< 11 min (660 s)**; hasta el 10 nov 2026, < 8 min (480 s) |
| Barrido completo de accesibilidad (a mano, en cada hito; decisión 21.2) | sin tope de PR; tope duro del job 12 min (10 min hasta el 10 nov 2026; corre en el job `e2e`) |
| Nocturno / post-merge | **< 15 min** |

> **Decisión de los fundadores del 10 de noviembre de 2026:** el tope del job `e2e` sube de 480 s a 660 s. Medición del
> gate del PR #67 (run 42849936048): 517 s con las specs 1, 2, 3 y 5 (Supabase 139 s, build 89 s, E2E 69 s, axe con sesión
> 194 s); la mitigación (a) no fue segura (medición del PR A) y la (b) no basta, porque la mayor parte es preparación fija; se
> aplicó la (c) de `specs/004-presupuestos-y-metas/contracts/ci.md`. Con ella, el tope duro del job `e2e` (`timeout-minutes`
> en `.github/workflows/ci.yml`) pasa de 10 a 12 minutos, para que el presupuesto avise antes de que GitHub cancele el job;
> los demás jobs no cambian.

«Mide el job» aplica **solo a esta segunda tabla**.

### Cuándo empiezan a bloquear

Hoy son **objetivos razonados y todavía no medidos**, porque no hay suite.

> **Bloquean cuando existan tres de las cinco specs E2E y el dominio cubra
> DEC-G04 y balances.** Coincide con el cierre de P0-2. Hasta entonces el job
> **mide, reporta y avisa** su duración, sin fallar.

El hito es un número y no una descripción a propósito. «Cuando la 001 entregue la
suite» fijaría los techos contra una suite pequeña por construcción, rápida solo
porque está casi vacía. «Cuando la suite sea representativa» no llega nunca, y el
presupuesto deja de ser contrato sin que nadie lo decida. Tres specs y el dominio
con DEC-G04 y balances se comprueba mirando el repositorio.

Pasado el hito, **superar el presupuesto del humo falla el build**, sin periodo de
gracia.

### Cláusula anticliquet

> **Si la línea base medida supera el techo, el hallazgo es la suite, no el
> techo.** El techo solo se mueve por decisión documentada de los fundadores, nunca
> automáticamente por una medición.

**Aplica desde hoy, no desde el hito de bloqueo.** Que el job todavía no falle no
autoriza a subir un techo.

Sin esta cláusula, «ya ajustaremos el umbral cuando tengamos la línea base» es
permiso para que el número siga a la deriva en vez de contenerla. Una medición es
un dato sobre lo que la suite tarda; no es un argumento sobre lo que debería
tardar.

### Dos consecuencias prácticas

- **Instala solo Chromium** en el humo: `npx playwright install --with-deps
  chromium`. Nunca los tres navegadores.
- **No cachees los binarios del navegador.** No es un olvido nuestro: **la
  documentación oficial de Playwright lo desaconseja** — «Caching browser binaries
  is not recommended, since the amount of time it takes to restore the cache is
  comparable to the time it takes to download the binaries». El mecanismo existe y
  la misma página explica cómo hacerlo si aun así se decide (cachear esos
  directorios contra un hash de la versión de Playwright); lo que no hay es una
  recomendación a favor. Añadir un `actions/cache` cambia una descarga por una
  restauración de coste comparable: no quita trabajo.

Y la regla de fondo: si una herramienta impide cumplir un presupuesto, **se dice**.
No se ajusta el presupuesto a la herramienta en silencio.

---

## 10. Referencias

- [`docs/adr/ADR-011`](adr/ADR-011-estrategia-de-pruebas-y-ci.md) — la decisión, su
  justificación, la tabla completa de ubicación por criterio, la documentación
  oficial consultada con versiones, y sus dos preguntas abiertas, que ya tienen
  dueño: **el mecanismo de los tests de RLS** lo cerraron los fundadores con
  pgTAP en SQL plano y sus dos condiciones (maestro §15.10, decisión 1), y **la
  herramienta para la regla de hex crudos** la resuelve la especificación 001 al
  crear el scaffold, como dice el propio ADR. Todo lo demás está cerrado.
- `docs/JUNTIA_MASTER.md` §7.1, §7.2, §10.1, §10.2, §10.3, §10.4, §15.4, §15.6.3,
  §15.7
- `docs/design/HANDOFF_CLAUDE_CODE.md` — criterios de aceptación de P0, tabla de
  DEC-G04, reglas de negocio de la UI, rendimiento
- `docs/design/COMPONENT_SPECIFICATIONS.md` — el fixture de octubre
- `AGENTS.md` 12, 16, 18

## Restauración P0-3 · protocolo autorizado (AGENTS §17)

En la revisión del PR A de la 004, el gestor autorizó este **cambio del protocolo de restauración**, para revisión de ChatGPT y del gestor antes del merge. No cambia ninguna migración ni las capacidades de la app. El fallo de T024, run 42458621877, fue la lista de tablas del ordenador, no los mensajes esperados de los controles negativos RESTORE_INVARIANTS.

La copia ordenada incluye las seis tablas nuevas. Los asientos no void preceden a sus voids (FK autorreferente inmediata); las asignaciones siguen a los asientos. Del ciclo solicitud ↔ uso solo se difiere temporalmente goal_ledger_entries_confirmation_id_fkey. Se conserva la copia original y su hash.

Dentro de la **misma transacción** (psql -1 en ambos caminos), planning-load-start.sql suspende por nombre solo goal_ledger_guard, goal_allocation_guard, goal_confirmation_guard y goal_void_reactivate. No se suspenden los triggers de P0-1/P0-2, los de solo inserción ni los internos de FK; no se cambia session_replication_role. El estado inicial se comprueba y se rechaza si no coincide con las propiedades esperadas.

planning-load-end.sql drena primero los eventos diferidos con SET CONSTRAINTS ALL IMMEDIATE: PostgreSQL rechaza ALTER TABLE ENABLE TRIGGER si quedan eventos pendientes. Luego reactiva los cuatro triggers con ENABLE TRIGGER, comprueba nuevamente todas las restricciones y devuelve la FK a NOT DEFERRABLE. Después se ejecuta check-invariants.sql, y solo entonces termina el COMMIT exterior. Cualquier fallo revierte también el DDL.

Las invariantes comprueban saldos vivos por meta y aportante, atribución, tipos y contexto, suma de asignaciones, tope del gasto, una meta por gasto, fechas, solicitudes y consentimiento, XOR de ámbito, presupuestos y límites. Los intervalos archivados usan archived_at y la auditoría de archivo; un void de uso cierra el intervalo y exige reactivación auditada y devolución conciliada. Una meta puede haberse archivado otra vez después de la devolución: no se altera su estado final al cargar su historia. La tabla trigger → invariantes y los controles concretos están en specs/004-presupuestos-y-metas/evidence.md.

La integración de restauración carga fixtures sintéticas y hace rollback contra juntia-dev, comprobando current_user=postgres, rolsuper=false, datos intactos y propiedades restauradas. Para no interferir con las carreras de otras specs, adquiere conjuntamente los tres bloqueos DDL con NOWAIT antes de cargar y agrupa el SQL en un viaje a dev; solo espera la disponibilidad de esos bloqueos, no reintenta una restauración fallida. El drill completo, cifrado, A/B, manifiesto, login y controles N11 por cada regla, sigue **solo en CI**, lanzado por el gestor. El manifiesto descubre automáticamente todas las tablas de juntia_data; la prueba y el drill exigen recuento y huella de las seis nuevas.

### Diagnóstico del drill y rechazo anticipado de N10

Cada etapa del drill/restaurador lleva un marcador RESTORE step; los comandos con salida privada publican su código de salida y conservan el log crudo fuera de stdout. El trap ERR informa también los fallos de test/grep sin salida, con etapa, línea y código; no imprime comandos ni argumentos. Los errores SQL usan VERBOSITY=verbose y ON_ERROR_STOP=1 para extraer solo SQLSTATE, categoría y marcadores constantes permitidos, nunca DETAIL, CONTEXT, SQL ni datos. La lista N11 se genera en un paso comprobado, sin ocultar su exit en una sustitución de proceso.

El run 42501082729 completó A y B. Se detenía en la comprobación del motivo de N10: al quitar al segundo integrante del grupo, las asignaciones P0-3 provocan JT111 (notCoupleMember) antes de check-invariants.sql. N10 acepta únicamente su invariante de pareja o JT111/JT119 (transición de pareja inválida), nunca un fallo genérico de permisos/FK. La integración reproduce N10 con y sin P0-3.

A usa DB_URL del stack Supabase local; B usa PG, configurado como postgres en el workflow. Antes de cargar, ambos imprimen solo metadatos: current_user, session_user, superuser y propietario/capacidad de actuar como propietario de las seis tablas. No se modifica el rol, la propiedad ni los privilegios: A/B ya cargaban correctamente en ese run. El checkpoint 42508573805 confirma por la sonda que A usa postgres no superusuario y B postgres superusuario, ambos propietarios de las seis tablas; no se infiere del nombre de la variable DB_URL. En juntia-dev se comprueba postgres no superusuario y capacidad de dueño sobre las seis tablas, además de ejecutar el protocolo completo dentro de rollback.

### Medición opt-in de workers (004 PR A, T022–T023)

JUNTIA_PLAYWRIGHT_MEASURE admite solo W:true o W:false, con W igual a 1, 2 o 4. Ejemplo en PowerShell: $env:JUNTIA_PLAYWRIGHT_MEASURE='2:true'; npm run e2e:dev -- tests/e2e/annotate.e2e.ts. Se elimina la variable al terminar la medición. Sin ella, playwright.config.ts y el plan de e2e:dev conservan exactamente sus valores por defecto anteriores. La variable se hereda al hijo de pruebas, sin ampliar la lista blanca de argumentos: --workers, --grep-invert y --config siguen rechazados como entradas del usuario.

Con la variable, cada proyecto seleccionado se ejecuta en dos pasadas sin reintentos: primero excluye @mail y @serial con los workers medidos; después selecciona @serial, sigue excluyendo @mail y fuerza un worker. Los filtros dirigidos se conservan; una pasada serial vacía se declara como tal y no es un fallo. Los dos casos de motion activo de las specs 2 y 3 llevan @serial. El resultado local no sustituye los tiempos del runner de CI ni prueba los flujos @mail. La tabla y la comprobación RLS de cuatro parejas están en evidence.md; la combinación del job e2e y su mecanismo de dos pasadas se fijan en PR B (T036), tras comprobar aislamiento.
