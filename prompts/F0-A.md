# Prompt de inicio — F0-a (Claude Code o Codex)

Lee antes de actuar, **en este orden**, `AGENTS.md`, `CLAUDE.md` (si estás en Claude Code), `docs/JUNTIA_MASTER.md` completo y `docs/research/competidores.md` solo como inspiración no normativa. Inspecciona el estado de la carpeta y del repositorio (`git status`) antes de modificar archivos.

## Objetivo de este único trabajo
Construir una **exploración visual implementada y verificable en navegador** de tres direcciones originales para **la misma pantalla Inicio** de Juntia. La app futura debe sentirse diseñada con ambición de premios, mobile-first y extraordinaria también en escritorio; en esta fase **NO** se implementa el producto financiero ni las animaciones insignia.

## Alcance exacto
- Proponer A — **Warm Editorial**, B — **Quiet Precision** y C — **Bold Utility**. Deben ser conceptualmente diferentes en composición, jerarquía, tipografía, iconografía, densidad y uso del espacio, pero respetar la claridad de cifras y la privacidad.
- **Mismos datos ficticios tipados** en A/B/C; mismos importes, categorías, contexto (Yo/Nosotros), período y textos. Primera captura de cada dirección en estado **sin presupuesto** (`budget: null`) **y con una meta de ahorro ficticia idéntica en las tres variantes**, mostrando objetivo, aportes y progreso sin tratarlos como gastos. Nunca inventar «presupuesto restante = 0», exceso o «te alcanza».
- Construir una implementación ligera de esas tres propuestas accesible localmente por rutas de exploración (o equivalente), suficiente para generar **capturas reales en navegador**; NO crear tres aplicaciones ni un design system completo.
- Producir exactamente **seis capturas comparables**: A/B/C × **390 px de ancho móvil y 1440 px escritorio**, viewport-height explícito y consistente entre variantes. Guardar en `docs/design/f0-a/screenshots/` con nombres claros y anotar el tamaño usado.
- Mostrar iconos visibles, coherentes y semánticos en navegación, categorías, metas y acciones. Comparar tratamientos iconográficos; no emojis ni placeholders. Si incorporas un paquete de SVG, verifica su licencia y evita instalar múltiples familias como dependencias finales.
- Crear `docs/design/f0-a/COMPARISON.md` con tabla breve de fortalezas, riesgos, legibilidad y estrategia desktop para A/B/C; preparar `docs/DESIGN.md` como **borrador de opciones no aprobadas**. No elegir ganadora ni fingir que las personas ya aprobaron una.
- Probar resultados mediante navegador real usando Playwright CLI si está disponible; revisar desbordamientos, contraste visible, títulos/tablas/labels y que desktop sea **composición propia**, no solo tarjetas móviles ampliadas.
- Impeccable puede criticar propuestas; registrar críticas relevantes y qué se corrigió. Usa la skill únicamente si está disponible, y explica si no lo está.

## Fuera de alcance (prohibido en este PR)
Supabase, auth, bases de datos, RLS, gastos persistidos, Gemini/Jev, scrapers, promociones, landing pública, demo pública, sistemas de billing, clips de motion, GSAP, comparativa formal con Tricount y diseño definitivo de logo/marca. No implementar F0-b ni operaciones reales de metas. Usar **Juntia** como nombre de interfaz y placeholder de wordmark, sin inventar disponibilidad de marca ni dominio.

## Reglas de ejecución
- Si el repositorio está vacío, inicializa el mínimo de Next.js + React + TypeScript/Tailwind necesario para renderizar los conceptos en local. Sigue las preferencias de stack del maestro sin fijar versiones de memoria; consulta las herramientas disponibles y elige una configuración reproducible.
- Crea una rama `design/f0-a-direcciones` si hay repositorio git. No sobrescribas archivos ajenos. Mantén dependencias mínimas y lockfile.
- Ejecuta los checks que apliquen (`lint`, `typecheck`, `build`) **solo si están configurados**, y registra salidas reales; no afirmar nada que no se haya medido.
- Si no puedes abrir un navegador o generar capturas, reporta claramente el bloqueo y entrega el código y los pasos verificables restantes. No simules las capturas con IA ni afirmes que existen.
- No hagas deploy ni abras PR remoto si no hay remote o permisos configurados; entrega una rama/commit local y una descripción lista para PR.
- Termina **al cerrar F0-a**. Presenta las seis capturas y la comparación para que ambos usuarios escojan una dirección antes de F0-b.

## Formato de respuesta al cerrar
1. Qué se construyó y dónde verlo localmente.
2. Seis capturas con ubicación exacta y viewport.
3. Tabla A/B/C: ventajas, debilidades y diferencias desktop.
4. Checks efectivamente ejecutados y resultados.
5. Archivos cambiados y decisiones abiertas **solo para elegir dirección**.
6. Confirmación expresa: F0-b NO iniciado.
