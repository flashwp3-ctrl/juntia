# Quickstart — validar la 001

Guía para quien implementa y para quien revisa el PR de implementación. Dice qué
ejecutar y qué debe verse; no contiene el código. Requisitos: Node 24 y npm 11.

## 1. Instalación limpia

```bash
npm ci
```

Esperado: sin errores de resolución de peers. El único aviso conocido es el de
ESLint 9 sin soporte (research R1.3).

## 2. `verify`

```bash
npm run verify
```

Esperado: lint, typecheck y `components` pasan; `domain` dice «0 pruebas — la
001 no tiene dominio financiero»; SQL/RLS dice «NO APLICABLE — lo incorpora
P0-1»; cada fila con su duración contra el presupuesto ([contracts/ci.md](contracts/ci.md)).
Pegar la salida real en el PR.

## 3. Build y axe

```bash
npm run build
```

```bash
npx playwright install --with-deps chromium
```

```bash
npm run test:a11y
```

`test:a11y` compila y sirve con `JUNTIA_INTERNAL_SURFACE=1`. Esperado: cada ruta
de [contracts/routes.md](contracts/routes.md), la URL inexistente y
`/interno/primitivos`, en claro y oscuro, con cero violaciones serias o críticas,
y la comprobación de que la superficie interna se encontró (FR-052).

## 4. La superficie interna no sale en producción (FR-053)

La prueba de Vitest de la página interna con `VERCEL_ENV=production` corre dentro
de `verify`. Comprobación adicional en bash, para pegar en el PR:

```bash
VERCEL=1 VERCEL_ENV=production npm run build && npx next start -p 3100
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3100/interno/primitivos
```

Esperado: `404`. Con `VERCEL_ENV=preview`, `200`.

## 5. Recorrido manual (revisión humana del PR)

Con `npm run dev` y el navegador:

1. **Anchos** 360, 390, 430, 768, 1024, 1280 y 1440, en los dos temas (emulando
   `prefers-color-scheme`): barra inferior, rail de 76, sidebar de 248; sin scroll
   horizontal ni solapes (US-1, SC-001).
2. **Teclado**: «Ir al contenido» es lo primero; destinos con `aria-current`;
   foco visible siempre (FR-022, FR-038).
3. **Anotar** con toque, clic, Enter y `N` (no dentro de un campo): hoja por
   debajo de 768, diálogo de 520 desde 768; Escape y «Cerrar» devuelven el foco;
   cruzar 768 con el aviso abierto lo mantiene abierto (US-3).
4. **Selector**: cambiar a Nosotros, recargar y navegar: se conserva; la perilla
   se desliza y, con movimiento reducido, salta; el contenido no cambia (US-4).
5. **Tema**: cambiar el tema del sistema con la app abierta; recargar en oscuro con
   la red lenta de DevTools: ningún cuadro claro (US-5, SC-006).
6. **Sin cifras**: ninguna ruta de producto muestra «$», importes, porcentajes,
   «Al día» ni «le debe»; el aviso de versión base está siempre (US-2).
7. **Texto al 200 %** y **safe areas** en un iPhone o su emulación.
8. **Superficie interna** en `/interno/primitivos`: cada primitivo en sus estados
   y los dos temas, identificada como interna y con valores de prueba.

## 6. Evidencia que lleva el PR

- Salidas reales de `verify`, `build` y `test:a11y`, y la del paso 4.
- Capturas a 390 y 1440 en claro y oscuro de cada ruta y de la superficie
  interna, para aprobar viendo la pantalla los `[P]` de paleta (plan, comprobación
  de jerarquía).
- La salida de cada `[V]` que comprueba lo construido (plan), o «pendiente» con el
  motivo. Ninguno se marca resuelto sin salida.
- Declaración: specs E2E añadidas, **0**.
