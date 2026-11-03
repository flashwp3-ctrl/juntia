# ADR-003 — Salida, expulsión y transferencia de miembros

**Estado:** Aceptado · **Origen:** documento maestro v1.0 §12.2 · **Detalle acordado:** fase de diseño, 2 de noviembre de 2026 · **Alcance:** P0

## Contexto

Cuando alguien deja un espacio compartido, su acceso a los datos del grupo se
revoca. Pero sus gastos, sus partes y sus liquidaciones siguen siendo necesarios
para que los balances históricos del grupo cuadren, y la otra persona sigue
teniendo derecho a ver su propio historial.

Resolver esto bien exige decidir qué se conserva, con qué granularidad y bajo
qué autorización: un «snapshot» mínimo de la membresía que permita seguir
mostrando «Tomás pagó» en octubre sin dar acceso vivo a los datos de Tomás.

Ese diseño no está hecho. Implementar «salir del grupo» sin él produce una de
dos salidas malas: balances que se rompen al perder a un participante, o un
acceso residual que nadie revisó.

## Decisión

**En P0 no se implementan salir de la pareja, expulsar al otro integrante ni
transferir la propiedad del espacio.** La acción se bloquea hasta que exista el
snapshot privado mínimo y su revisión.

- La interfaz **no oculta** la limitación ni la disfraza de botón deshabilitado:
  la explica con texto (`LimitNote`), sin control alguno.
- No se presenta como «próximamente» con fecha: se dice qué no hace la
  aplicación hoy.
- La propietaria **sí** puede anular una invitación pendiente. Eso no toca
  membresías activas ni historial.
- Un usuario tiene **una pareja activa**, de dos integrantes, validada en el
  servidor y sin condiciones de carrera.

## Consecuencias

- El modelo de datos trata la membresía como autoridad y debe quedar preparado
  para un snapshot histórico, aunque P0 no lo use todavía.
- La eliminación de cuenta queda en la misma situación y es, además, un
  **bloqueo de lanzamiento** (maestro §15.6): no basta con bloquearla en la
  interfaz, hace falta un procedimiento real, verificable y revisado
  legalmente antes de declarar el lanzamiento privado.
- Deshacer esta decisión más adelante exige un ADR nuevo que resuelva el
  snapshot, no un PR que añada el botón.

## Referencias

- `docs/JUNTIA_MASTER.md` §12.2, §15.5 y §15.6
- `docs/design/HANDOFF_CLAUDE_CODE.md` — Mi cuenta, pareja e invitaciones
- `docs/design/COMPONENT_SPECIFICATIONS.md` — LimitNote, CoupleStatus
