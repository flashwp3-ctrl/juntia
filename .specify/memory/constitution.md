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
