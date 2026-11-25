# Comps de diseño · 006 Planes

**Estado: aprobados** el 25 de noviembre de 2026 por los dos fundadores
(Alejandro: «aprobamos», en nombre de los dos; maestro §15.10, decisión 27.5).
Los tres ajustes obligatorios están hechos y la decisión visual sobre Yo está
tomada. Salen del prompt de `design-prompt.md` y no deciden el alcance, que está
en `spec.md`: si un comp y la spec no coinciden, manda la spec. La aprobación
visual **no verifica** las `[V]` de abajo, que pasan a la implementación.

## Dónde están

Están en el proyecto de Claude Design `caabf357-a0df-4048-886f-8c46c8979c5a`
(«Juntia: Responsive design y design system»), repartidos en dos archivos:

| Archivo | Pantallas |
| --- | --- |
| «Juntia DS v1 - 10a Planes 06-1-06-4» | 06·1 Lista e histórico · 06·2 Crear y editar · 06·3 Detalle (con 06·3h, «Quién pagó» con meta) · 06·4 Añadir gastos |
| «10b Planes 06-5-06-9» | 06·5 Selector en Anotar · 06·6 Vacíos y límites · 06·7 Foto de portada · 06·8 Confirmaciones · 06·9 Plan cerrado |

Los comps viven en Claude Design y no se copian al repositorio. Las cifras de
los comps son hipotéticas, como las de la spec, y pueden no coincidir con las de
sus escenarios: por ejemplo, el regalo de 06·3h es de $420.000 y el del
escenario 6 de US-2, de $400.000. Las pruebas usan las de la spec.

## Ajustes obligatorios: hechos

Los hicieron los fundadores en Claude Design antes de aprobar:

1. ~~**06·7, texto de la foto:** decía «hasta 10 MB».~~ **Hecho:** dice «hasta
   15 MB», el límite de origen de Q17 y ADR-014 §3.
2. ~~**06·8, confirmación de eliminar:** solo tenía «Los 12 gastos».~~ **Hecho:**
   tiene las dos variantes, 13 gastos para quien tiene un privado en el plan y 12
   para la otra persona (Q14; US-3, escenario 4).
3. ~~**06·3, «Quién pagó» con un gasto pagado con una meta (Q24, decisión 27.4;
   F95-4).**~~ **Hecho en 06·3h**, a 390 y a 1440, en claro y en oscuro, con el
   enlace «Ver el balance de la pareja»:
   - **Caso completo:** el regalo de $420.000, pagado por completo con la meta.
   - **Caso parcial:** «Hotel en Guatapé», de $400.000. La meta cubre $150.000 y
     Sara pagó $250.000; a cada uno le corresponden $125.000, y la diferencia
     informativa dice «Sara pagó $125.000 más que su parte».

**Copy:** «puso» se unificó a «pagó» en todas las pantallas. «Debe» no aparece en
ninguna pantalla, solo en las notas de diseño (Q10; GLOSSARY §9).

## Decisión visual sobre Yo: tomada

~~**¿En Yo, la tarjeta de un plan de la pareja muestra su total compartido?**
(06·1, `[P]`).~~ **Sí** (fundadores, 25 de noviembre de 2026; decisión 27.5). La
tarjeta muestra el **total compartido**, el mismo que ven los dos. Nunca suma los
privados de quien mira, que siguen aparte en el detalle, en la línea «Tus gastos
privados en este plan» (Q6 y Q9). Tampoco se suma con los planes personales: en
Yo las dos listas van aparte, sin un total común (decisión 22.11).

## Verificaciones `[V]` abiertas para la implementación

No se dan por hechas, y la aprobación de los comps no las cierra:

- **Contraste del scrim con la foto clara de la boda** (06·7, foto vertical en
  tonos claros): hay que medir que el texto sobre la portada cumple el contraste
  en claro y en oscuro (BRAND §5; ADR-014).
- **Licencia de las fotos de muestra:** vienen de Unsplash y solo sirven para los
  comps. No se publican ni entran al repositorio sin revisar la licencia.
