# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check — comprobación de jerarquía

*GATE: debe pasar antes de la investigación de la Fase 0 y se repite después
del diseño de la Fase 1.* En Juntia esta sección **no** comprueba principios
de la constitución, que es solo un puntero (ADR-012 §3.4): comprueba la
jerarquía de `AGENTS.md` §2. **Si cualquier fila de las tablas siguientes
bloquea, el plan no se cierra**: se detiene, se dice qué falta y quién lo
resuelve, y no se avanza a la fase siguiente.

### Propuestas `[P]` que toca el slice

Del inventario del maestro §15.9. Cada una con sus **dos ejes**, que son
distintos: «No» en alcance no significa aprobación automática.

| Elemento `[P]` | ¿Afecta al alcance? | ¿Requiere aprobación antes de implementar? | Resolución (quién, cuándo, dónde) | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| [elemento, con su archivo de `docs/design/`] | [Sí — slice / No] | [Sí / No, y por qué] | [aprobado por … el … / pendiente de revisión del PR del slice] | [Sí si afecta al alcance y no está aprobado] |

Un `[P]` que afecta al alcance y no está aprobado **bloquea**: se resuelve
con aprobación humana antes de cerrar la spec (maestro §15.9). Un `[P]` que
solo requiere aprobación se lista como pendiente de la revisión del PR del
slice, viendo la pantalla construida.

### Verificaciones `[V]` que toca el slice

Separadas según la tabla de ADR-012 §2.

| Elemento `[V]` | Tipo | Salida real | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| [elemento, con su archivo] | [Decide cómo se construye / Comprueba lo construido] | [salida pegada, o «pendiente»] | [Sí si decide cómo se construye y no hay salida] |

- Un `[V]` **que decide cómo se construye** se ejecuta **antes de cerrar el
  plan** y se pega su salida. Sin esa salida el plan no se cierra.
- Un `[V]` **que comprueba lo construido** se ejecuta durante la
  implementación y su salida va al PR del slice. Nunca se marca resuelto sin
  salida.

### ADR que necesita el slice

| ADR | Qué decide para este slice | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| [ADR-NNN o «nuevo: …»] | [decisión] | [Aceptado / Propuesto / por escribir] | [Sí si no está Aceptado] |

Una decisión nueva, significativa o difícil de revertir va a un ADR en
`docs/adr/` **antes** de seguir (`AGENTS.md` 17); el plan la cita y no la
toma.

### Erratas que afectan al slice

De «Erratas conocidas» en `docs/design/README.md`.

| Errata | Qué afecta | Estado | ¿Bloquea el plan? |
| --- | --- | --- | --- |
| [errata] | [pantalla, componente o dato] | [resuelta en … / pendiente] | [Sí si está pendiente y afecta a lo que se construye] |

### Conflictos entre documentos superiores

| Conflicto | Documentos | Qué dice la jerarquía (`AGENTS.md` §2) | PR de reconciliación | ¿Bloquea el plan? |
| --- | --- | --- | --- | --- |
| [conflicto, o «ninguno encontrado»] | [maestro / ADR / `docs/design/` / `docs/CONVENTIONS.md`] | [qué prevalece] | [PR, o «por abrir»] | [Sí hasta que se mergee la reconciliación] |

**Resultado del gate**: [PASA / BLOQUEADO — lista de filas que bloquean y qué
las desbloquea]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if the plan adds complexity that must be justified.** Esta tabla
> no sirve para justificar una fila bloqueante de la comprobación de
> jerarquía: esas no se justifican, se resuelven.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
