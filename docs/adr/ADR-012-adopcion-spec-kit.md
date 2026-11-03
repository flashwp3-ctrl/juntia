# ADR-012 — Adopción parcial de GitHub Spec Kit

**Estado:** Propuesto · **Origen:** preflight de ingeniería y ensayo en un clon desechable, 3 de noviembre de 2026 · **Alcance:** P0, flujo de especificación de cada slice

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

**Ensayo real**, el 3 de noviembre de 2026, en un clon local desechable fuera
del repositorio (scratchpad), con la versión fijada y sin tocar la instalación
global:

```
uvx --from git+https://github.com/github/spec-kit.git@v1.2.6 specify init --here --integration claude --integration-options="--no-model-invocation --events false"
uvx --from git+https://github.com/github/spec-kit.git@v1.2.6 specify integration install codex --integration-options="--events false"
```

Se tomó el hash de todos los archivos del clon antes y después de cada paso
(incluido `.claude/settings.local.json`, que no se versiona y se copió a mano
para comprobarlo). El clon se borró al terminar.

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
por `.specify/feature.json`, no por la rama.

El ensayo dejó además **cinco hallazgos** que esta decisión resuelve uno a uno
(Decisión §3).

## Decisión

**Se adopta Spec Kit en parte**: sus plantillas y su estructura de carpetas
para escribir la especificación de cada slice, y nada de lo que compite con la
jerarquía del repositorio.

### 1. Qué se adopta y cómo se instala

1. **Versión fijada: v1.2.6.** Nunca `main` ni una build de desarrollo. Se
   ejecuta con `uvx --from git+https://github.com/github/spec-kit.git@v1.2.6`;
   cambiar de versión es un PR propio, no un efecto secundario de otro.
2. **Integraciones:** `--integration claude` en `init` y después
   `specify integration install codex`. Claude queda como integración por
   defecto.
3. **`--events false` en las dos.** Spec Kit no escribe hooks en
   `.claude/settings.json` ni en `.codex/config.toml`. Los únicos hooks del
   repositorio siguen siendo los de Impeccable.
4. **`--no-model-invocation` en Claude.** Las skills `speckit-*` solo se
   ejecutan cuando una persona las invoca.
5. **Sin las extensiones `git` ni `agent-context`.** La primera crearía ramas
   numeradas que compiten con la convención de `CONVENTIONS.md` B.4. La
   segunda inyectaría un bloque gestionado en `CLAUDE.md` y `AGENTS.md`, que
   son contratos revisados a mano.
6. **Variante de scripts: `sh`** (Decisión §3.5).

### 2. Lugar en la jerarquía

Spec Kit **no añade un nivel nuevo**. Los artefactos de `specs/NNN-nombre/`
(`spec.md`, `plan.md`, `tasks.md` y los auxiliares del plan) **son** la
«especificación del slice» que `AGENTS.md` §2 ya coloca por debajo del maestro,
los ADR y el paquete de diseño. Ninguno decide: citan las decisiones que
aplican.

`.specify/memory/constitution.md` **no es autoridad**. Es un puntero
(Decisión §3.4).

**Dónde vive una decisión que surge mientras se escribe una spec:**

| Si lo que aparece es… | Va a… | Y la spec… |
| --- | --- | --- |
| Una decisión significativa o difícil de revertir | Un ADR nuevo en `docs/adr/`, revisado **antes** de seguir | Lo cita y no avanza a la fase siguiente hasta que el ADR se acepte |
| Un `[P]` que afecta al alcance | Aprobación humana antes de cerrar la spec (maestro §15.9) | Registra la resolución y quién la aprobó |
| Un `[P]` que solo requiere aprobación | La revisión del PR del slice, viendo la pantalla (§15.9) | Lo lista como pendiente de esa revisión |
| Un `[V]` | Se ejecuta en el slice y se pega la salida real | Lo lista; nunca lo marca resuelto sin salida |
| Una discrepancia entre documentos de `docs/design/` | «Erratas conocidas» de `docs/design/README.md` | La cita y espera su resolución |

### 3. Los cinco hallazgos del ensayo

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

Un gate en un YAML se puede aprobar desde la terminal de quien ejecuta el
workflow; un merge deja rastro, autor y revisión. El PR de inicialización borra
`.specify/workflows/speckit/` y su entrada de
`.specify/workflows/workflow-registry.json`, y nadie ejecuta ese workflow.
Retirarlo no rompe nada: las skills `speckit-*`
funcionan sin el workflow.

#### 3.2 Colisión de `[P]` — **la plantilla usa `[par]`**

En `.specify/templates/tasks-template.md`, `[P]` significa «se puede ejecutar
en paralelo (archivos distintos, sin dependencias)». En Juntia, `[P]` significa
**propuesta pendiente de aprobación** (maestro §15.9), y aparece en los mismos
documentos que una tarea citaría. Una tarea marcada `[P]` se leería como «esto
no está aprobado».

La plantilla de tasks sustituye la marca por **`[par]`**. Se elige porque:

- no colisiona con `[A]`, `[P]` ni `[V]`, ni con ninguna otra marca del
  repositorio;
- es una abreviatura legible sin leyenda;
- tiene más de una letra, así que no invita a pensar que pertenece a la misma
  familia que las marcas del paquete de diseño.

La leyenda de la plantilla se reescribe para decir que `[par]` es
paralelizable y que `[A]`, `[P]` y `[V]` conservan el significado de §15.9.

#### 3.3 Autoinvocación en Codex — **regla escrita, más débil que en Claude**

En el ensayo, las 10 skills de `.claude/skills/speckit-*` llevan
`disable-model-invocation: true`. Las 10 de `.agents/skills/speckit-*` **no lo
llevan**: `--no-model-invocation` es una opción exclusiva de la integración de
Claude. Codex puede, en principio, decidir por su cuenta ejecutar
`speckit-implement` o cualquier otra.

No hay mecanismo de configuración que lo impida. Lo sustituye **una regla
escrita en `AGENTS.md`**, que es el contrato que Codex lee:

> Las skills `speckit-*` solo se ejecutan cuando una persona lo pide
> explícitamente, nombrando la skill. Un agente nunca encadena una fase con la
> siguiente por iniciativa propia, ni ejecuta `speckit-implement` sin que el PR
> de `tasks.md` esté mergeado. `speckit-constitution` y `speckit-taskstoissues`
> no se ejecutan nunca.

**Esta protección es más débil que la de Claude** y se dice así: en Claude es
una propiedad de la configuración; en Codex es una instrucción que el modelo
puede incumplir. La red de seguridad real es la misma para los dos: ninguna
fase avanza sin el merge del PR anterior (Decisión §3.1), y un `speckit-implement`
ejecutado antes de tiempo produce un diff que la revisión del PR rechaza.

La regla se añade a `AGENTS.md` en el PR de inicialización, no en este.

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
   seguir.
4. **Marcas del paquete de diseño:** `[A]`, `[P]` y `[V]` se interpretan según
   el maestro §15.9. En las tasks, `[par]` significa paralelizable.
5. **Pruebas:** `docs/TESTING.md` y ADR-011.
6. **Gates:** ninguna fase avanza sin el merge del PR de la anterior (ADR-012).

Si este archivo y cualquiera de esos documentos dicen cosas distintas, este
archivo está mal.
```

`speckit-constitution` no se ejecuta nunca (Decisión §3.3): reescribiría este
puntero con principios generados.

#### 3.5 Scripts en PowerShell — **se usa `sh`**

En Windows, `init` elige `ps` por defecto. Las tres plataformas donde corren
los scripts son distintas:

| Entorno | `ps` | `sh` | `py` |
| --- | --- | --- | --- |
| Windows local (Claude Code) | Nativo | Git Bash, que Claude Code en Windows ya usa como shell | Requiere `python` en el `PATH`. uv gestiona su propio Python y no lo garantiza; en Windows `python` puede ser el alias de la tienda |
| Codex (Linux o macOS) | Requiere `pwsh`, que no suele estar | Nativo | Requiere Python en la imagen |
| CI en Linux | Requiere instalar `pwsh` | Nativo | Requiere un paso `setup-python` |

**Se elige `sh`:** es la única variante nativa en dos de los tres entornos y
disponible en el tercero sin instalar nada, porque Git para Windows ya trae
Bash. `py` parece neutral, pero añade una dependencia de `PATH` que falla
justo en Windows.

### 4. Ajustes a las plantillas

| Plantilla | Cambio |
| --- | --- |
| `plan-template.md` | La sección «Constitution Check» (*«GATE: Must pass before Phase 0 research»*) pasa a ser una **comprobación de jerarquía**: los `[P]` que el slice toca, con su clasificación en los dos ejes de §15.9; los `[V]` que toca; los ADR que necesita y su estado; las erratas pendientes que lo afectan. Si alguno bloquea, el plan no se cierra |
| `tasks-template.md` | La marca `[P]` pasa a `[par]` (Decisión §3.2). Los ejemplos de «contract test por endpoint» se sustituyen por la ubicación por capas de `docs/TESTING.md` §4: cada criterio va en la capa más baja que puede detectar su fallo, y la plantilla pide declarar cuántas specs E2E añade el slice (máximo 2) |

**Coste, dicho con claridad.** Según la documentación de upgrade,
`specify integration upgrade <key>` *«blocks when manifest-tracked integration
files were modified locally, unless you pass `--force`»*, y las plantillas
compartidas solo se refrescan *«when they are unchanged from the previous
managed copy»*. Es decir: una vez modificadas, **cada actualización de Spec
Kit exige `--force` y vuelve a pisar los ajustes**, que hay que reaplicar a
mano y revisar en el diff. Se acepta porque actualizar es un PR deliberado
(Decisión §1.1), no algo que ocurra solo. Los *presets* de Spec Kit podrían
evitar ese coste; no se verificaron y quedan como pendiente.

## Consecuencias

- La especificación 001 se escribe ya con este formato, en `specs/001-…/`, y es
  la primera prueba real de la decisión.
- El PR de inicialización —separado de este y posterior a su aceptación—
  contiene: el resultado de `init` y de `integration install codex` con las
  opciones de la Decisión §1; el borrado del workflow; el puntero de la
  Decisión §3.4; los ajustes de plantillas de la Decisión §4; dos filas nuevas
  en `AGENTS.md` §2b (`specs/` y `.specify/memory/constitution.md`) y la regla
  de la Decisión §3.3. Ese PR toca `AGENTS.md`; este no.
- Hay una regla que en Codex depende de que el modelo la obedezca. Si se
  incumple, lo detecta la revisión del PR, no la configuración.
- Cada actualización de Spec Kit cuesta un `--force` y una reaplicación de los
  ajustes revisada en el diff.
- Si Spec Kit deja de mantenerse o cambia de forma incompatible, la salida es
  barata: `specs/` son Markdown y siguen siendo legibles sin la herramienta;
  se borran `.specify/` y las carpetas `speckit-*` y se conserva el resto.
- **Ningún hallazgo invierte la recomendación.** El más débil es el 3.3, y lo
  compensa que el gate real está en los merges, no en la herramienta.

## Verificación pendiente [V]

1. **Que la variante `sh` se ejecuta bien desde las skills** en Claude Code
   sobre Windows (Git Bash) y en Codex. El ensayo solo generó `ps`.
2. **Que borrar `.specify/workflows/speckit/` no rompe** ninguna skill ni
   `specify integration upgrade`.
3. **Que `[par]` sobrevive** a la lógica de `speckit-tasks` e
   `speckit-implement`, que podrían buscar la cadena `[P]` literal para decidir
   el paralelismo.
4. **Si los presets** (`--preset`, `.presetignore`) permiten llevar los ajustes
   de plantillas sin que `integration upgrade` exija `--force`.
5. **El comportamiento de `init --here --force`** sobre un repositorio que ya
   tenga Spec Kit: la documentación avisa de que ese camino *«does not use the
   same per-integration manifest checks before overwriting files»*. El ensayo
   no usó `--force`.

## Dependencias

- **ADR-011 sigue en estado Propuesto**, y su enmienda está en revisión en el
  PR #6. La Decisión §4 remite a `docs/TESTING.md` §4 y al tope de specs E2E de
  ADR-011; si ADR-011 cambia, la plantilla de tasks se ajusta en consecuencia.

## Referencias

- `AGENTS.md` §2, §2b, 15 y 17
- `docs/JUNTIA_MASTER.md` §15.1 y §15.9
- `docs/CONVENTIONS.md` B.4
- `docs/TESTING.md` §4
- `docs/adr/ADR-011-estrategia-de-pruebas-y-ci.md`
- Spec Kit v1.2.6: https://github.com/github/spec-kit ·
  https://github.github.io/spec-kit/upgrade.html ·
  https://github.github.io/spec-kit/reference/core.html ·
  https://github.github.io/spec-kit/integrations/claude.html ·
  https://github.github.io/spec-kit/integrations/codex.html
