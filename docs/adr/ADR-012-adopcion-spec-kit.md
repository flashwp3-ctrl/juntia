# ADR-012 — Adopción parcial de GitHub Spec Kit

**Estado:** Aceptado por los fundadores, 3 de noviembre de 2026 (maestro §15.10, decisión 2) · **Origen:** preflight de ingeniería y dos ensayos en clones desechables, 3 de noviembre de 2026 · **Condiciones aplicadas:** segunda revisión del PR #7, 3 de noviembre de 2026 · **Enmienda:** §3.4, decisión de los fundadores tras las dos demostraciones del PR #9, 3 de noviembre de 2026 · **Nota:** §3.1 y `[V]` 4, gates por spec con dos specs en vuelo, 25 de noviembre de 2026 (maestro §15.10, decisión 28) · **Alcance:** P0, flujo de especificación de cada slice

## Contexto

`AGENTS.md` §2 coloca la «especificación del slice» en la jerarquía, por debajo
del maestro, los ADR y el paquete de diseño. Pero **no existe ni formato, ni
ubicación, ni plantilla** para escribirla. La primera especificación de
ingeniería —la 001, Frontend Foundation— es la que va a fijar ese formato por
omisión si nadie lo decide antes.

GitHub Spec Kit ofrece exactamente esa pieza: plantillas de spec, plan y tasks,
un paso `clarify` que busca ambigüedades y un paso `analyze` que revisa la
coherencia entre artefactos. También trae cosas que este repositorio **no
quiere**: una `constitution.md` pensada como fuente normativa, un workflow con
sus propios gates, hooks de eventos para el agente y plantillas con
convenciones que chocan con las nuestras.

El riesgo de fondo ya lo vivimos una vez: dos documentos aprobados que dicen
cosas distintas (las erratas frente al handoff) y que solo se resolvieron con
una regla de jerarquía. Una constitución con contenido propio sería un tercer
documento normativo compitiendo con el maestro y con `AGENTS.md`.

### Lo que se verificó, no se supuso

**Documentación oficial**, versión vigente **v1.2.6** (2 de noviembre de 2026),
consultada el 3 de noviembre de 2026: README de `github/spec-kit`, página de
releases, `CHANGELOG.md` y las páginas `installation`, `upgrade`,
`reference/core`, `integrations/claude` e `integrations/codex` de
`github.github.io/spec-kit`.

**Dos ensayos reales**, el 3 de noviembre de 2026, cada uno en un clon local
desechable fuera del repositorio (scratchpad), con la versión fijada mediante
`uvx` y sin tocar la instalación global. Los dos clones se borraron al
terminar.

**Ensayo 1 — qué toca `init`.** Claude y después Codex, scripts `ps`, con el
hash de todos los archivos antes y después de cada paso (incluido
`.claude/settings.local.json`, que no se versiona y se copió a mano):

| Paso | Creados | Modificados | Borrados |
| --- | --- | --- | --- |
| `init --integration claude` | 30: 10 en `.claude/skills/speckit-*/`, 20 en `.specify/` | 0 | 0 |
| `integration install codex` | 11: 10 en `.agents/skills/speckit-*/`, 1 en `.specify/integrations/` | 1: `.specify/integration.json` | 0 |

**No se tocó nada fuera de `.specify/`, `.claude/skills/speckit-*` y
`.agents/skills/speckit-*`.** El hash es idéntico antes y después en
`CLAUDE.md`, `AGENTS.md`, `.claude/settings.local.json`, `.claude/agents/`,
`.codex/hooks.json` y las skills de Impeccable y Playwright CLI. Con
`--events false` no se crearon `.claude/settings.json` ni `.codex/config.toml`.
No se creó ninguna rama: sin la extensión `git`, Spec Kit resuelve la feature
por `.specify/feature.json` o `SPECIFY_FEATURE_DIRECTORY`, no por la rama.

**Ensayo 2 — verificaciones acotadas.** Solo Claude, scripts `sh`:

```
uvx --from git+https://github.com/github/spec-kit.git@v1.2.6 specify init --here --integration claude --script sh --integration-options="--no-model-invocation --events false"
```

| # | Qué se comprobó | Resultado |
| --- | --- | --- |
| V1 | Los scripts `sh` se ejecutan en Windows con Git Bash (5.2.15, MINGW64), invocados por ruta tal como los escriben las skills | `resolve-template.sh spec-template --json` (el que usa `speckit-specify`), `setup-plan.sh --json` y `check-prerequisites.sh --json --paths-only` devuelven JSON válido con **exit 0**. Los scripts quedan en git con modo `100644`, sin bit de ejecución |
| V2 | Qué depende de `.specify/workflows/` | El grep de `workflows/`, `workflow.yml`, `workflow-registry` y `workflow run` sobre `.claude/skills/speckit-*`, `.specify/scripts` y `.specify/templates` **no encuentra nada**. Después de borrar `.specify/workflows/`, `resolve-template.sh`, `check-prerequisites.sh` y `setup-tasks.sh` siguen terminando con exit 0 |
| V4 | Plantillas en `.specify/templates/overrides/` | `plan-template.md` y `tasks-template.md` modificados ahí **se resuelven por encima del core**: `resolve-template.sh` devuelve el override, `setup-plan.sh` copia el override a `plan.md` y `setup-tasks.sh` apunta `TASKS_TEMPLATE` al override. Los overrides **no están en los manifiestos** de Spec Kit. Un `specify integration upgrade claude` **sin `--force`** terminó con exit 0 y dejó intactos, con el mismo hash, los overrides y la `SKILL.md`, que conserva `disable-model-invocation: true`. Tampoco creó `.claude/settings.json` |
| V4 | Overrides de **comandos** | Un `specify.md` con marca en `.specify/templates/overrides/` y en `overrides/commands/` **no llega** a `.claude/skills/speckit-specify/SKILL.md`, ni antes ni después del upgrade. Las skills se materializan al instalar y quedan fijas; según el código, solo los *presets* registran overrides de comandos |
| F7-1 | Dónde aparece `[P]` | `speckit-tasks` SKILL.md líneas 159, 171, 172 y 192 (*«[P] marker: Include ONLY if task is parallelizable»*). `speckit-implement` SKILL.md líneas 152, 157 y 172 (*«parallel tasks [P] can run together»*). `tasks-template.md` líneas 18, 54, 67, 68, 87, 88, 92, 93, 111, 112, 116, 133, 134, 138, 154, 157, 190, 191, 193, 194 y 246 |

F7-1 resuelve una duda del primer borrador: **las skills interpretan `[P]` de
forma literal**. Cambiar la marca solo en la plantilla rompería la detección de
paralelismo de `speckit-implement`, y cambiarla en las skills no es posible sin
un preset, porque las `SKILL.md` quedan fijas al instalar.

## Decisión

**Se adopta Spec Kit en parte**: sus plantillas y su estructura de carpetas
para escribir la especificación de cada slice, y nada de lo que compite con la
jerarquía del repositorio.

### 1. Qué se adopta y cómo se instala

1. **Versión fijada: v1.2.6.** Nunca `main` ni una build de desarrollo. Se
   ejecuta con `uvx --from git+https://github.com/github/spec-kit.git@v1.2.6`.
   Cambiar de versión es un PR propio, no un efecto secundario de otro.
2. **Solo la integración Claude**: `--integration claude`. Codex se difiere
   (Decisión §3.3).
3. **`--events false`.** Spec Kit no escribe hooks en `.claude/settings.json`.
   Los únicos hooks del repositorio siguen siendo los de Impeccable.
4. **`--no-model-invocation`.** Las skills `speckit-*` solo se ejecutan cuando
   una persona las invoca.
5. **Sin las extensiones `git` ni `agent-context`.** La primera crearía ramas
   numeradas que compiten con la convención de `CONVENTIONS.md` B.4. La
   segunda inyectaría un bloque gestionado en `CLAUDE.md` y `AGENTS.md`, que
   son contratos revisados a mano.
6. **Variante de scripts: `sh`** (Decisión §3.5).
7. **`specify init --here --force` queda prohibido en uso normal.** La
   documentación avisa de que ese camino *«does not use the same
   per-integration manifest checks before overwriting files»*. Solo se admite
   para una **recuperación controlada**: en un PR propio, con el árbol limpio,
   y revisando el diff completo antes de hacer commit. Las actualizaciones de
   versión usan `specify integration upgrade claude` sin `--force` (V4).

### 2. Lugar en la jerarquía

Spec Kit **no añade un nivel nuevo**. Los artefactos de `specs/NNN-nombre/`
(`spec.md`, `plan.md`, `tasks.md` y los auxiliares del plan) **son** la
«especificación del slice» que `AGENTS.md` §2 ya coloca por debajo del maestro,
los ADR y el paquete de diseño. Ninguno decide: citan las decisiones que
aplican.

`.specify/memory/constitution.md` **no es autoridad**. Es un puntero
(Decisión §3.4).

**Dónde vive lo que aparece mientras se escribe una spec.** La tabla aplica
reglas que ya existen (`AGENTS.md` 17, maestro §15.9, `docs/design/README.md`);
no crea un procedimiento nuevo.

| Si lo que aparece es… | Va a… | Y la spec… |
| --- | --- | --- |
| Un cambio local, reversible y no significativo que respeta los contratos aprobados (nombre de un archivo interno, orden de tareas, una utilidad privada) | `plan.md`, como decisión del plan | Lo registra y sigue |
| Una decisión significativa o difícil de revertir | Un ADR nuevo en `docs/adr/`, revisado **antes** de seguir | Lo cita y no avanza a la fase siguiente hasta que el ADR se acepte |
| Un conflicto entre maestro, ADR, paquete de diseño o convenciones | **Se detiene**, aplica la jerarquía de `AGENTS.md` §2 y la reconciliación se hace por PR documental | No avanza hasta que el PR de reconciliación se mergee |
| Un `[P]` que afecta al alcance | Aprobación humana antes de cerrar la spec (maestro §15.9) | Registra la resolución y quién la aprobó |
| Un `[P]` que solo requiere aprobación | La revisión del PR del slice, viendo la pantalla (§15.9) | Lo lista como pendiente de esa revisión |
| Un `[V]` **que decide cómo se construye** (por ejemplo, si el script de tema bloqueante funciona con App Router) | Se ejecuta **antes de cerrar el plan** y se pega la salida | El plan no se cierra sin esa salida |
| Un `[V]` **que comprueba lo construido** (contraste, rendimiento, axe) | Se ejecuta durante la implementación y la salida va al PR del slice | Lo lista; nunca lo marca resuelto sin salida |
| Una discrepancia entre documentos de `docs/design/` | «Erratas conocidas» de `docs/design/README.md` | La cita y espera su resolución |

### 3. Hallazgos de los ensayos

#### 3.1 El workflow incluido solo tiene dos gates — **se retira**

`init` instala `.specify/workflows/speckit/workflow.yml`, «Full SDD Cycle»:
specify → gate → plan → gate → tasks → implement. **Entre tasks e implement no
hay gate.** Eso incumple la regla de gate humano en las cuatro transiciones.

No se ajusta a cuatro gates: **se retira**. Los gates de Juntia no viven en un
YAML que una herramienta interpreta, sino en **el merge de un PR de
documentación** revisado por una persona:

1. PR con `spec.md` (después de `clarify`) → merge = gate Specify → Plan.
2. PR con `plan.md` y sus auxiliares → merge = gate Plan → Tasks.
3. PR con `tasks.md` → merge = gate Tasks → Implement.
4. PRs de implementación, uno por slice (`AGENTS.md` 15).

El PR de inicialización borra `.specify/workflows/` entero y nadie ejecuta ese
workflow. **Retirarlo es seguro con la condición verificada en V2:** ninguna
skill `speckit-*`, ningún script y ninguna plantilla lo referencian, y los
scripts siguen funcionando sin él. Si una versión futura de Spec Kit
introdujera una referencia, el grep de V2 se repite en el PR que suba la
versión.

> **Nota del 25 de noviembre de 2026** (maestro §15.10, decisiones 28.18 y
> 28.19). Los cuatro gates de arriba son **por spec**. Dos specs pueden estar
> en etapas distintas a la vez, solo dentro de la regla de la decisión 28.18:
> como máximo una en implementación y una en documentación activa. El merge de
> un PR documental de una spec **nunca** es el gate de otra, y pausar la
> documentación de una spec no deshace ni salta ninguno de sus gates ya
> mergeados. Cada spec en vuelo tiene su rama y su worktree (`AGENTS.md` 14b).
> **La regla no se ejerce todavía:** antes hay que verificar cómo eligen la
> spec activa los scripts de Spec Kit y que dos worktrees no escriben en la
> spec equivocada (`[V]` 4 de este ADR; prerrequisito 3 de la decisión 28.19).
> Esta nota no cambia el estado del ADR ni ningún otro punto de la decisión.

#### 3.2 `[P]` — **se conserva como «paralelizable», solo dentro de `specs/*/tasks.md`**

En la plantilla y en las skills de tasks, `[P]` significa «se puede ejecutar en
paralelo». En Juntia, `[P]` significa **propuesta pendiente de aprobación**
(maestro §15.9). F7-1 demuestra que `speckit-tasks` y `speckit-implement`
buscan `[P]` literal, y que sus `SKILL.md` no se pueden cambiar sin un preset.
Sustituir la marca rompería el paralelismo; conservarla obliga a acotarla.

**Regla:**

- **Dentro de `specs/*/tasks.md`**, y solo ahí, `[P]` significa paralelizable.
  El override de `tasks-template.md` (Decisión §4) abre el archivo con esta
  leyenda:

  > En este archivo, `[P]` significa **paralelizable** (archivos distintos, sin
  > dependencias). **No** es la marca de propuesta del paquete de diseño. Una
  > tarea que implementa algo propuesto lo dice en palabras —«propuesta
  > §15.9»— y nunca con la etiqueta suelta.

- **En cualquier otro archivo** —`spec.md`, `plan.md`, el maestro, el paquete
  de diseño, ADR, PRs— `[P]` sigue significando **propuesta** (§15.9).
- **Una tarea que implementa algo propuesto** lo nombra en palabras:
  «implementa la sección Cuenta (propuesta §15.9, aprobada en …)». Nunca escribe
  `[P]` para eso, porque dentro de `tasks.md` esa etiqueta ya significa otra
  cosa.

#### 3.3 Autoinvocación en Codex — **Codex se difiere**

En el ensayo 1, las 10 skills de `.claude/skills/speckit-*` llevan
`disable-model-invocation: true`. Las 10 de `.agents/skills/speckit-*` **no lo
llevan**: `--no-model-invocation` es una opción exclusiva de la integración de
Claude, y no hay configuración que lo bloquee en Codex. Una regla escrita en
`AGENTS.md` sería más débil, porque el modelo puede incumplirla.

**La primera instalación es solo Claude.** Eso no excluye a Codex del proyecto:

- **Codex puede implementar** a partir de un `tasks.md` mergeado, como
  implementa a partir de cualquier especificación del repositorio. `specs/`
  son Markdown y Codex los lee como cualquier otro documento.
- **Lo que Codex no hace es generar artefactos de Spec Kit**: no escribe
  `spec.md`, `plan.md` ni `tasks.md` con las skills `speckit-*`, porque no las
  tiene instaladas.

Codex se incorpora más adelante, **con un ADR nuevo o una enmienda a este**,
que aporte una **protección de fases verificable** —algo que se pueda
comprobar ejecutándolo, no solo una instrucción escrita—.

#### 3.4 Constitución por defecto — **se sustituye entera por un puntero**

La `constitution.md` que genera `init` es la plantilla sin rellenar: marcadores
`[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`…`[PRINCIPLE_5_NAME]`, secciones y
gobernanza vacías. Sus comentarios de ejemplo proponen «Test-First
(NON-NEGOTIABLE)» y, en gobernanza, *«Constitution supersedes all other
practices»*. Esa frase, aplicada aquí, invertiría la jerarquía del repositorio.

Las skills `speckit-specify`, `speckit-plan` y `speckit-implement` leen la
constitución, así que no basta con ignorarla: hay que darle un contenido que
remita a donde está la autoridad. Se sustituye entera por este texto, exacto:

```markdown
# Constitución de Juntia — puntero, no autoridad

Este archivo **no contiene principios propios** y **no prevalece sobre nada**.
Existe porque las skills de Spec Kit lo leen; su único contenido es decir dónde
está la autoridad.

1. **Jerarquía:** la de `AGENTS.md` §2. Ante cualquier conflicto manda
   `docs/JUNTIA_MASTER.md` (su §15 prevalece sobre el cuerpo v1.2).
2. **Qué documento resuelve qué:** `AGENTS.md` §2b.
3. **Una spec, un plan o unas tasks no deciden.** Una decisión nueva,
   significativa o difícil de revertir va a un ADR en `docs/adr/` antes de
   seguir. Un conflicto entre documentos superiores detiene el trabajo hasta
   reconciliarlo por PR.
4. **Marcas del paquete de diseño:** `[A]`, `[P]` y `[V]` se interpretan según
   el maestro §15.9. **Única excepción:** dentro de `specs/*/tasks.md`, `[P]`
   significa paralelizable.
5. **Pruebas:** `docs/TESTING.md` y ADR-011.
6. **Gates:** ninguna fase avanza sin el merge del PR de la anterior (ADR-012).

Si este archivo y cualquiera de esos documentos dicen cosas distintas, este
archivo está mal.
```

**Cómo se protege:**

- La constitución **solo se modifica en un PR documental dedicado** a ella. No
  cambia como efecto secundario de un PR de spec, de plan ni de código.
- `speckit-constitution` no se ejecuta nunca: reescribiría el puntero con
  principios generados.
- **El PR de inicialización comprueba** que `constitution.md` contiene
  exactamente el texto aprobado aquí, y lo demuestra en su descripción.

**Condición adicional del PR de inicialización.** Debe **demostrar**, con una
ejecución real pegada en el PR y no por lectura de las skills, que
`speckit-specify` y `speckit-plan`:

1. leen las fuentes superiores a las que remite el puntero, y
2. **se detienen** ante un `[P]` que afecta al alcance sin aprobar o ante una
   decisión pendiente, en lugar de resolverlos ellas mismas.

Si no se puede demostrar, el PR de inicialización no se mergea y esta decisión
se revisa.

**Enmienda del 3 de noviembre de 2026** (decisión de los fundadores, tomada
después de las dos demostraciones del PR de inicialización, PR #9). **Esta
enmienda relaja la condición de merge original**, que exigía demostrar
`speckit-specify` y `speckit-plan` antes de mergear el PR de inicialización:

- **`speckit-specify`: cumplida.** Se ejecutó en dos sesiones limpias, cada
  una con un escenario distinto y sin saber qué resultado se esperaba. El
  primer escenario pedía la anatomía de `AccountButton`, que es `[P]` en
  §15.9 y está diferida por §15.10, decisión 8. El segundo pedía persistir en
  el servidor el contexto Yo/Nosotros, algo sin alcance asignado, que depende
  del `[P][V]` de persistencia de preferencias y del ADR de acceso a datos
  pendiente. Las dos sesiones leyeron la constitución y las fuentes a las que
  apunta, **se detuvieron antes de escribir la spec**, citaron las fuentes
  correctas y no crearon ningún archivo.
- **`speckit-plan`: se traslada a la fase de plan de la especificación 001.**
  No se puede demostrar con un escenario inventado. Para llegar al plan,
  `specify` tiene que escribir la spec, y solo lo hace cuando el alcance está
  aprobado. El primer alcance aprobado es la 001 real. **Condición:** el
  `plan.md` de la 001 tiene que mostrar ejecutada su comprobación de jerarquía,
  con los `[P]`, `[V]`, ADR y erratas que toca y el estado de cada uno. Si no
  la ejecuta, esta decisión se revisa **antes** de pasar a tasks.

#### 3.5 Scripts — **se usa `sh`**

En Windows, `init` elige `ps` por defecto. Los entornos donde corren los
scripts son distintos:

| Entorno | `ps` | `sh` | `py` |
| --- | --- | --- | --- |
| Windows local (Claude Code) | Nativo | Git Bash, que Claude Code en Windows ya usa como shell. **Verificado en V1** | Requiere `python` en el `PATH`. uv gestiona su propio Python y no lo garantiza; en Windows `python` puede ser el alias de la tienda |
| Codex (Linux o macOS), cuando se incorpore | Requiere `pwsh`, que no suele estar | Nativo | Requiere Python en la imagen |
| CI en Linux | Requiere instalar `pwsh` | Nativo | Requiere un paso `setup-python` |

**Se elige `sh`:** es la única variante nativa en Linux y macOS y disponible en
Windows sin instalar nada, porque Git para Windows ya trae Bash. `py` parece
neutral, pero añade una dependencia de `PATH` que falla justo en Windows.

**Bit de ejecución.** V1 muestra que los scripts entran en git con modo
`100644`. Las skills los invocan por ruta (`.specify/scripts/bash/…sh`), y eso
funciona en Git Bash, pero en Linux daría *permission denied*. El PR de
inicialización los registra como ejecutables
(`git update-index --chmod=+x .specify/scripts/bash/*.sh`).

### 4. Ajustes a las plantillas — **como overrides, sin coste de `--force`**

Los ajustes viven en `.specify/templates/overrides/`, **no** editando las
plantillas core. V4 confirmó que se resuelven por encima del core, que no están
en los manifiestos y que sobreviven a `specify integration upgrade` sin
`--force`.

| Override | Cambio respecto al core |
| --- | --- |
| `overrides/plan-template.md` | La sección «Constitution Check» (*«GATE: Must pass before Phase 0 research»*) pasa a ser una **comprobación de jerarquía**: los `[P]` que el slice toca, con su clasificación en los dos ejes de §15.9; los `[V]` que toca, separados según la tabla de §2 (los que bloquean el plan y los que se verifican al implementar); los ADR que necesita y su estado; las erratas pendientes que lo afectan; los conflictos entre documentos superiores. Si alguno bloquea, el plan no se cierra |
| `overrides/tasks-template.md` | La leyenda de `[P]` de la Decisión §3.2. Los ejemplos de «contract test por endpoint» se sustituyen por la ubicación por capas de `docs/TESTING.md` §4: cada criterio va en la capa más baja que puede detectar su fallo, y la plantilla pide declarar cuántas specs E2E añade el slice (máximo 2) |

**Desaparece el coste de `--force`** que tenía el primer borrador de este ADR:
las plantillas core no se tocan y `integration upgrade` no se bloquea.

**Queda un coste distinto, y se dice:** un override es una copia completa de la
plantilla. Si una versión nueva de Spec Kit mejora el core, el override **no lo
hereda**. El PR que sube la versión compara el core nuevo con el anterior y
decide si traslada el cambio a los overrides.

**Lo que los overrides no cubren:** el texto de las skills. V4 confirmó que las
`SKILL.md` se materializan al instalar y que un override de comando en
`overrides/` no llega a ellas.

**Y eso deja una discrepancia conocida, que se registra en vez de negarla**
(F7-4, tercera revisión del PR #7). `speckit-tasks/SKILL.md` conserva la
heurística genérica de Spec Kit: **cuando se piden pruebas, cada contrato de
interfaz genera una tarea de contract testing antes de la implementación**
(línea 192 en v1.2.6, igual que `templates/commands/tasks.md` del core). En
Juntia las pruebas son parte obligatoria de casi todos los slices, así que esa
condición se cumplirá casi siempre. El override de `tasks-template.md` pide lo
contrario —cada criterio en la capa más baja que puede detectar su fallo, según
`docs/TESTING.md` §4— y no modifica la skill. El generador recibirá **dos
instrucciones opuestas** sobre los tests.

El tratamiento, sin presets ni skills modificadas en este ADR:

1. **Prevalecen ADR-011 y `docs/TESTING.md`** sobre la heurística genérica de
   generación de tests de Spec Kit. Una tarea de test que contradiga la matriz
   de capas está mal, aunque la haya generado la skill.
2. **El primer `tasks.md` generado se audita** contra los criterios de
   aceptación del slice y contra la matriz de capas de `docs/TESTING.md` §4
   **antes de aprobar su PR**: cada tarea de test se justifica por su capa, y
   las redundantes —un contract test por endpoint donde basta un test de
   dominio, o una prueba duplicada en dos capas sin que la segunda detecte nada
   nuevo— se eliminan antes del merge. Los `tasks.md` siguientes pasan la misma
   comprobación en su gate.
3. **Si el generador produce sistemáticamente tareas de test incompatibles**,
   se detiene la fase de tasks y se evalúa un preset o un mecanismo equivalente,
   **verificado con un ensayo** antes de adoptarlo. «Sistemáticamente» quiere
   decir que la auditoría tiene que retirar tareas de test en dos `tasks.md`
   seguidos.

Este ADR **no** implementa presets ni modifica ninguna skill: el mecanismo es la
auditoría en el gate, no una personalización prematura.

### 5. Los gates dependen hoy de la disciplina

**`main` no tiene protección de rama.** El 3 de noviembre de 2026,
`gh api repos/juntia-labs/juntia/branches/main/protection` y
`…/rulesets` devuelven **HTTP 403**: *«Upgrade to GitHub Pro or make this
repository public to enable this feature»*. El plan actual de la organización
no lo permite.

Consecuencia: **«gate = merge» depende hoy de la disciplina**, para Claude y
para cualquier agente o persona. Nada en el servidor impide un `git push` a
`main` que salte la revisión de un PR de spec, de plan o de tasks.

**Mitigación local, que se propone para el PR de inicialización:**

1. **Regla de denegación en `.claude/settings.json`** (versionado) para
   `git push` a `main`: Claude Code rechaza el comando antes de ejecutarlo.
2. **Un hook `pre-push` de git** que rechaza empujar a `main`, para cualquier
   agente o persona que use el repositorio con los hooks instalados.

**Las dos son más débiles que una protección de servidor**, y se dice así: la
regla de Claude solo protege las sesiones de Claude Code que usan ese archivo;
el hook se instala por clon, se puede desactivar con `--no-verify` y no existe
en un clon nuevo hasta que alguien lo instala. Reducen el error accidental; no
impiden una omisión deliberada.

**Activar GitHub Team** —que daría protección de rama real— **es una decisión
de los fundadores**, no de este ADR, porque tiene coste económico. **Decisión original del 3 de noviembre de 2026** (maestro §15.10, decisión 3): protección local temporal y plan de pago antes del primer dato financiero real. **Revisión de los dos fundadores del 4 de noviembre de 2026:** se descarta el plan de pago, y la protección local pasa a ser definitiva, incluso con datos reales. Se acepta de forma explícita que no hay protección de servidor y que las dos barreras locales se pueden saltar. Véanse en el maestro §15.10 la decisión 3, revisada, y la regla 4 de la decisión 13.

## Consecuencias

- La especificación 001 se escribe ya con este formato, en `specs/001-…/`, y es
  la primera prueba real de la decisión.
- El PR de inicialización —separado de este y posterior a su aceptación—
  contiene:
  - el resultado de `init` con las opciones de la Decisión §1;
  - el borrado de `.specify/workflows/`;
  - el puntero de la Decisión §3.4, con la comprobación de que coincide con el
    texto aprobado;
  - los dos overrides de la Decisión §4;
  - los scripts `sh` marcados como ejecutables;
  - la regla de denegación y el hook `pre-push` de la Decisión §5;
  - dos filas nuevas en `AGENTS.md` §2b (`specs/` y
    `.specify/memory/constitution.md`);
  - la demostración de la Decisión §3.4: `speckit-specify` y `speckit-plan`
    leen las fuentes superiores y se detienen ante un `[P]` bloqueante o una
    decisión pendiente. Tras la enmienda del 3 de noviembre de 2026 (§3.4),
    ese PR solo contiene la demostración de `speckit-specify`; la de
    `speckit-plan` pasa al plan de la 001.

  Ese PR toca `AGENTS.md`; este no.
- Codex sigue pudiendo implementar desde un `tasks.md` mergeado, pero no
  genera artefactos de Spec Kit hasta que un ADR aporte una protección de fases
  verificable.
- Los gates descansan en la disciplina mientras `main` no tenga protección de
  servidor; la mitigación local reduce el error accidental, no lo impide.
- Cada actualización de Spec Kit es un PR propio: `integration upgrade` sin
  `--force`, repetir el grep de V2 y comparar el core nuevo con los overrides.
- Si Spec Kit deja de mantenerse o cambia de forma incompatible, la salida es
  barata: `specs/` son Markdown y siguen siendo legibles sin la herramienta; se
  borran `.specify/` y `.claude/skills/speckit-*` y se conserva el resto.
- **Ningún hallazgo invierte la recomendación.** F7-1 invirtió una decisión
  concreta del primer borrador —sustituir `[P]` por `[par]`—, no la adopción.

## Verificación pendiente [V]

Del primer borrador, **V1, V2 y V4 se ejecutaron** (resultados en
«Contexto»), **V3 desaparece** porque `[P]` se conserva, y **V5 no se ensaya**:
`init --here --force` queda prohibido en uso normal (Decisión §1.7).

Queda pendiente:

1. **La demostración de `speckit-plan`** (Decisión §3.4): que lee las fuentes
   superiores y se detiene ante un `[P]` bloqueante o una decisión pendiente.
   La de `speckit-specify` **está cumplida**: dos sesiones limpias y dos
   escenarios en el PR de inicialización (enmienda del 3 de noviembre de 2026,
   §3.4). La de `speckit-plan` se traslada a la fase de plan de la
   especificación 001: su `plan.md` tiene que mostrar ejecutada la
   comprobación de jerarquía. Si no, esta decisión se revisa antes de pasar a
   tasks. **Esto relaja la condición original**, que la exigía antes de
   mergear el PR de inicialización.
2. **Los scripts `sh` en Linux** con el bit de ejecución fijado. V1 se ejecutó
   solo en Windows; hace falta cuando Codex o un job de CI los usen.
3. **La auditoría del primer `tasks.md`** contra la matriz de capas (Decisión
   §4, F7-4). No es del PR de inicialización: es condición del PR que entregue
   el primer `tasks.md`, y su resultado decide si hace falta un preset.
4. **La selección de la spec activa con dos specs en vuelo** (nota del 25 de
   noviembre de 2026 en §3.1; maestro §15.10, decisión 28.19, prerrequisito
   3). Antes de documentar una spec en paralelo con otra hay que comprobar,
   ejecutándolo, cómo eligen los scripts de `.specify/scripts/` la spec activa
   (por la rama, por `SPECIFY_FEATURE` o por cualquier otro mecanismo que
   usen) y que dos worktrees, cada uno con su rama, no escriben en la spec del
   otro. La salida se pega en el PR que la registre. **No está verificado.**

## Dependencias

- **El PR #6 está mergeado.** Las referencias a specs E2E de este ADR usan la
  nomenclatura «spec E2E n» que ese PR introdujo.
- **ADR-011 está Aceptado** (fundadores, 3 de noviembre de 2026).
  La Decisión §4 remite a `docs/TESTING.md` §4 y al tope de specs E2E de
  ADR-011; si ADR-011 cambia, el override de tasks se ajusta en consecuencia.

## Referencias

- `AGENTS.md` §2, §2b, 15 y 17
- `docs/JUNTIA_MASTER.md` §15.1 y §15.9
- `docs/CONVENTIONS.md` B.4
- `docs/TESTING.md` §4
- `docs/design/README.md` — «Erratas conocidas»
- `docs/adr/ADR-011-estrategia-de-pruebas-y-ci.md`
- Spec Kit v1.2.6: https://github.com/github/spec-kit ·
  https://github.github.io/spec-kit/upgrade.html ·
  https://github.github.io/spec-kit/reference/core.html ·
  https://github.github.io/spec-kit/integrations/claude.html ·
  https://github.github.io/spec-kit/integrations/codex.html
