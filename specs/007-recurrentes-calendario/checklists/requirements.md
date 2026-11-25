# Specification Quality Checklist: 007 · Recurrentes y calendario

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-25
**Updated**: 2026-11-25, tras Clarify y la revisión F101
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [ ] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Clarify hecho el 25 de noviembre de 2026.** Los fundadores respondieron
  Q1–Q19; las respuestas y sus precisiones están en «Session 2026-11-25 ·
  Clarify» de la spec. No queda ningún `[NEEDS CLARIFICATION]` ni ninguna
  pregunta sin respuesta.
- **Queda un ítem sin marcar, a propósito.** Q15 no está cerrada: FR-045 a
  FR-047 dicen qué se explora y con qué condiciones, pero si hay total de gastos
  previstos se decide viendo los comps, y su tratamiento de estimados, rangos,
  estados y privacidad lo fija ADR-b. También quedan para ADR-a la identidad
  estable de las instancias (FR-005), la regla quincenal (FR-009b, propuesta
  `[P]`) y si las ocurrencias de un periodo pausado existen como canceladas.
- **Revisión F101 aplicada.** F101-1 a F101-12 se corrigieron en la spec. Las
  siete decisiones de los fundadores (D1 a D7: F101-4, F101-5, el disparador de
  F101-7, F101-8 i, ii y iv, y F101-9) se confirmaron el 25 de noviembre de 2026,
  con precisiones en D3, D4 y D5; ya no queda ninguna pendiente. El ítem de
  criterios de aceptación sigue sin marcar solo por Q15. La tabla «Compatibilidad de vínculos» y la
  tabla de estados dan criterio verificable a FR-014a, FR-017, FR-018 y FR-018a.
- **Detalles de implementación.** La spec nombra `transactions`, el ledger de
  metas, `America/Bogota`, pgTAP y `src/lib/copy/es.ts` porque son contratos ya
  decididos del maestro, de ADR-011 y de CONVENTIONS, no elecciones nuevas
  (mismo criterio que la 006). La forma de los datos la fijan ADR-a, ADR-d y el
  Plan.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
