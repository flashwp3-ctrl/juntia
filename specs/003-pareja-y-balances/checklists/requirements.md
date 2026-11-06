# Specification Quality Checklist: 003 · Pareja y balances (P0-2)

**Purpose**: Validar la completitud y la calidad de la spec antes de pasar a Plan
**Created**: 2026-11-06
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sin decisiones de implementación nuevas: los mecanismos se citan de ADR-013 y del maestro; lo no decidido va a «Preguntas abiertas» o al plan (FR-002, FR-012)
- [x] Centrada en el valor para las dos personas y en las reglas de dinero y privacidad
- [x] Legible por los fundadores: cada pregunta trae recomendación y consecuencias
- [x] Todas las secciones obligatorias completas

## Requirement Completeness

- [ ] No quedan aclaraciones pendientes — **18 preguntas abiertas (Q1–Q18) a propósito**: el encargo pide llevarlas a los fundadores y no resolverlas en la spec. Se cierran en «Clarifications» antes del plan
- [x] Los requisitos son comprobables y no ambiguos, salvo los que citan una Q, que dicen qué no cambia sea cual sea la respuesta
- [x] Los criterios de éxito son medibles (SC-001 a SC-013)
- [x] Los criterios de éxito no dependen de una tecnología concreta, salvo los nombres de capa que fija ADR-011
- [x] Escenarios de aceptación en las diez historias
- [x] Casos límite identificados (invitaciones, concurrencia, tercer integrante, cookies de contexto, fallos ambiguos, paginación)
- [x] Alcance delimitado («Fuera de alcance» y «Lo que ya está decidido»)
- [x] Dependencias y supuestos identificados

## Feature Readiness

- [x] Cada requisito funcional tiene criterio de aceptación o éxito asociado
- [x] Las historias cubren los flujos principales (P0-2a, P0-2b, P0-2c)
- [x] Specs E2E declaradas: una nueva (spec 3) y un caso en la spec 1
- [x] Inventarios de `[P]` y `[V]` hechos según el maestro §15.9

## Notes

- Tres `[P]` que afectan al alcance (SharedBalance, ChangePreview, Anotar compartido) siguen abiertos como Q2–Q4: según el maestro §15.9 se resuelven antes de escribir el plan.
- Q18 toca el dataset dorado y también se resuelve antes del plan.
