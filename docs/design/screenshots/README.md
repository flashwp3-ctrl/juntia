# docs/design/screenshots — Referencia visual del AppShell

> **Esto es referencia visual, no fuente de medidas.**
> Ninguna cifra se mide sobre un PNG. Los números —anchos, altos, radios,
> espaciados, colores, tipografía— viven en
> [`COMPONENT_SPECIFICATIONS.md`](../COMPONENT_SPECIFICATIONS.md) §AppShell /
> Navigation, en [`RESPONSIVE_SPECIFICATIONS.md`](../RESPONSIVE_SPECIFICATIONS.md)
> y en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). Si una captura y un documento
> no coinciden, manda el documento. Si la discrepancia es real, se registra
> como errata en [`../README.md`](../README.md), no se resuelve midiendo el PNG.

## Procedencia

Todas las capturas salen del mismo comp del proyecto de Claude Design
«Juntia: Responsive design y design system»:

- **Archivo:** `Juntia DS v1 - 04 Pantallas.dc.html`
- **Enlace:** <https://claude.ai/design/p/caabf357-a0df-4048-886f-8c46c8979c5a?file=Juntia+DS+v1+-+04+Pantallas.dc.html>
- **Fecha de captura:** 3 de noviembre de 2026

El comp no está en el repositorio y no se puede importar: carga un runtime
propio (`support.js`, elementos `<x-dc>`) de unos 2,5 MB. El motivo completo
está en [`../README.md`](../README.md) §«Referencias visuales originales».

## Qué hay aquí

Las ocho capturas cubren lo que la **especificación 001 · Frontend Foundation**
necesita: AppShell y navegación. Nada más.

| Archivo | Qué muestra | Sección del comp | Tamaño |
| --- | --- | --- | --- |
| `appshell-390-light.png` | Tabbar móvil completo en claro: Inicio · Actividad · `+` · Metas · Plan, con etiquetas, sobre el fondo de la pantalla. | **04·1 · Inicio y movimientos**, primera pantalla de 390 | 390×132 @3× |
| `appshell-390-dark.png` | El mismo tabbar en tema oscuro. | **04·5 · Oscuro**, primera pantalla de 390 | 390×132 @3× |
| `appshell-1024-rail-light.png` | Pantalla completa de 1024 con el rail lateral de 76 px: wordmark, los destinos, el botón de Anotar en bosque y el avatar de Mi cuenta al pie. Muestra el quinto destino de escritorio, **Balance** (icono de balanza, entre Plan y el `+`), **aprobado por los fundadores el 3 de noviembre** (maestro §15.10, decisión 4). El primer ítem del rail es el wordmark: a 1024 el selector Yo/Nosotros no va en el rail sino arriba a la derecha del contenido (decisión 5), y eso esta captura no lo muestra. | **04·9 · Responsive · de 360 a 1280**, bloque «1024 · LG · RAIL DE 76 PX» | 1024×982 @1× |
| `appshell-1440-sidebar-light.png` | Pantalla completa de 1440 con el sidebar de 248 px: wordmark, segmentado de contexto, destinos, bloque Anotar gasto con el atajo `N`, perfil al pie. Muestra el quinto destino **Balance**, aprobado por los fundadores el 3 de noviembre (maestro §15.10, decisión 4). Al pie, solo el perfil: el tema vive en Mi cuenta › Apariencia (decisión 6). | **04·7 · Escritorio · 1440**, primer marco | 1440×1040 @1× |
| `appshell-1440-sidebar-dark.png` | El mismo sidebar de 1440 en tema oscuro, con el mismo quinto destino «Balance», aprobado (ver la fila anterior). | **04·8 · Escritorio · Oscuro**, primer marco | 1440×1040 @1× |
| `appshell-tab-activa.png` | Recorte del tabbar móvil con Inicio activo (icono Fill sobre ficha) junto a Actividad inactivo (icono Regular, sin ficha). | **04·1**, mismo tabbar que `appshell-390-light` | 174×82 @4× |
| `appshell-contexto-yo-nosotros-390.png` | El segmentado Yo/Nosotros en el encabezado móvil, con **Yo** activo. | **04·1**, encabezado de la primera pantalla de 390 | 390×74 @4× |
| `appshell-contexto-yo-nosotros-1440.png` | El segmentado Yo/Nosotros dentro del sidebar de escritorio, con **Nosotros** activo, bajo el wordmark. | **04·7**, cabecera del sidebar del primer marco | 248×136 @4× |

«@N×» es el factor de escala del render: a 2× o 4× el PNG tiene el doble o el
cuádruple de píxeles por lado que la composición. **Eso no cambia ninguna
medida del diseño**; solo hace legible un recorte pequeño. Los tres marcos
grandes van a 1×, es decir, píxel a píxel del comp.

## El segmentado de contexto va en dos archivos

Móvil y escritorio lo colocan en sitios muy distantes del comp —encabezado de
la pantalla de 390 y cabecera del sidebar de 1440—, así que no caben en un
recorte continuo. Están en dos archivos, `-390` y `-1440`, en lugar de en una
composición montada: un montaje sería una imagen que el comp nunca dibujó.

## Método

El comp dibuja cada breakpoint a su ancho real dentro de una misma página.
Las capturas se tomaron **ensanchando el viewport a 1920×1200 y recortando la
región ya renderizada**, sin emular dispositivos de 390 ni de 1440. Emular el
dispositivo habría reflowado el comp a ese ancho y producido una composición
que el diseño no aprobó.

## Qué NO hay aquí

El objetivo global del paquete son **24 capturas** (Inicio —en Yo y en
Nosotros—, Actividad, Anotar, Balance y Meta, cada una a 390 y 1440 px, en
claro y oscuro). Siguen pendientes. **La regla de exigibilidad no cambia: se
exigen por slice, antes de implementar la pantalla o el patrón, no las 24 por
adelantado.** El inventario y la regla están en
[`../README.md`](../README.md) §«Capturas de referencia visual».

En particular, aquí no hay nada de Balance ni de Meta, porque la 001 no las
implementa.

## Lo que el comp no tiene y por eso no está capturado

- **Rail de 1024 en oscuro.** El comp no dibuja ese breakpoint en tema oscuro:
  04·9 es claro de extremo a extremo y los bloques oscuros (04·5, 04·8) solo
  cubren 390 y 1440. La 001 no lo pedía.
- **Popover del segmentado en el rail de 1024.**
  `RESPONSIVE_SPECIFICATIONS.md` decía, hasta el 3 de noviembre, que en `lg` el primer ítem del rail abría
  un popover con el segmentado; en el comp ese primer ítem es el wordmark «J» y
  el popover no está dibujado en ningún estado. **Ya no se implementa:** los
  fundadores decidieron que a 1024 el selector va arriba a la derecha del
  contenido, como en móvil y tablet (maestro §15.10, decisión 5), y la línea 16
  de la especificación se corrigió en consecuencia.
