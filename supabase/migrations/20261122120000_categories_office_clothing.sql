-- P0-4 · decisión de los fundadores del 22 de noviembre de 2026 (comp «06b · 4 × 3», spec 005): entran las categorías de
-- gasto «Oficina» (`office`) y «Ropa» (`clothing`). La rejilla de Anotar pasa a 4 columnas × 3 filas con el mismo alto.
-- Orden: las ocho de siempre, luego Oficina y Ropa, y «Otra» al final. Ninguna clave existente cambia: «Ocio» es solo el
-- texto de `entertainment` (src/lib/copy/es.ts). `income` conserva su 9; `other` pasa del 10 al 13 para quedar la última.
-- Ninguna migración aplicada se edita. La validación de categoría de las funciones de dinero y de presupuestos lee esta
-- tabla (JT005, JT221) y las FK (id, kind) de transactions y budgets apuntan a ella: no hay nada más que tocar en la base.
insert into juntia_data.categories(id,kind,sort_order) values('office','expense',11),('clothing','expense',12);
update juntia_data.categories set sort_order=13 where id='other';
