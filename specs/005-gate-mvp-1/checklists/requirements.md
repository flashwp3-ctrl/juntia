# Specification Quality Checklist: 005 · Gate privado conjunto (P0-4)

**Purpose**: Validar la completitud y la calidad de la spec antes de pasar a Plan
**Created**: 2026-11-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sin decisiones nuevas: lo no decidido va a los fundadores como `[NECESITA DECISIÓN]` (Q1–Q12), con opciones y recomendación
- [x] Centrada en lo que hay que comprobar para declarar MVP-1 y con qué evidencia
- [x] Legible por los fundadores: cada pregunta trae contexto y consecuencias
- [x] Todas las secciones obligatorias completas

## Requirement Completeness

- [ ] Aclaraciones resueltas: **pendiente**, las doce preguntas esperan a los fundadores
- [x] Cada requisito dice su tipo de evidencia (CI, laboratorio, dispositivo o revisión humana)
- [x] Los criterios de éxito son medibles (SC-001 a SC-012)
- [x] Escenarios de aceptación en las siete historias
- [x] Casos límite identificados (fallo de una verificación, falta de dispositivo, defecto en pantalla aceptada, petición de funcionalidad, suspensión del plan Free, presupuesto de CI)
- [x] Alcance delimitado («Fuera de alcance de MVP-1» y «Lo que ya estaba decidido»)
- [x] Supuestos y dependencias identificados (P0-3 aceptada; partición del job `e2e`)

## Feature Readiness

- [x] Inventario de cobertura de dinero y privacidad, sin duplicar pruebas
- [x] Inventario de verificaciones heredadas, de `[V]` y de `[P]`
- [x] Specs E2E declaradas: ninguna nueva (según Q3)
- [x] Contradicciones listadas para el PR documental T085, sin corregirlas aquí

## Notes

- Los `[V]` de fotos y scrim salen del gate por la decisión de los fundadores del 17 de noviembre de 2026 (metas sin foto en MVP-1).
- Las `[V]` ya cerradas en la 004 se repiten sobre el commit candidato (FR-010), no se vuelven a abrir.
