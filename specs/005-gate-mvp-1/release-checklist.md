# Checklist de release · MVP-1

**Qué es:** la evidencia de la fila P0-4 del backlog («Checklist de release + exportación»)
y de FR-069. La crea el plan **sin marcar**; las casillas se marcan durante los pasos 5 a 7
del [plan](plan.md) y se firman en el PR C. Cada casilla lleva su evidencia (enlace a
`evidence.md`, a `evidence/` o la salida resumida), **sin secretos ni datos personales**.
Protocolos: [contracts/human-verifications.md](contracts/human-verifications.md).

**Commit candidato:** `________` · **Etiqueta:** `mvp-1-____-__-__` · **Despliegue de Vercel:** `________`

## 1. Antes de etiquetar (paso 4)

- [ ] Run completo sobre el candidato: `app`, `db` (con el ensayo de restauración y
      N1–N11), `e2e` (las cinco specs) y `a11y-session`, todo verde. Run: `________` (FR-010, FR-020)
- [ ] Barrido `@sweep` verde sobre el candidato. Run: `________` (FR-040)
- [ ] Job `release` completo sobre el candidato, con `webkit-e2e` verde. Run: `________` (FR-020, FR-050–FR-054)

## 2. Despliegue y sondas (paso 5)

- [ ] Etiqueta `mvp-1-*` anotada en el commit candidato; Vercel muestra a la dueña como
      autora del HEAD de `main` (FR-022)
- [ ] Superficie interna: `/interno/primitivos` en producción devuelve 404 con el host
      propio y con uno no autorizado, sin el título interno en HTML ni RSC (FR-014)
- [ ] Variables de producción: ninguna clave secreta con prefijo `NEXT_PUBLIC_` (solo
      nombres revisados) (FR-015)
- [ ] Migraciones de producción = repositorio: la comprobación de `backup.sh` contra la
      última `db-prod-*` pasa (FR-015)

## 3. Exportación y acceso (paso 6)

- [ ] Fundador 1: JSON y CSV descargan, abren, contienen lo suyo autorizado y nada
      privado del otro (FR-060)
- [ ] Fundador 2: ídem (FR-060)
- [ ] Recuperación de acceso por enlace en producción, fundador 1 (FR-063)
- [ ] Recuperación de acceso por enlace en producción, fundador 2 (FR-063)
- [ ] Límite de envío de correos de Auth copiado del panel: `____`; qué hacer si se
      alcanza: esperar la ventana o restablecer desde el panel (la dueña) (FR-063)
- [ ] Humo de release en producción, fundador 1 (entrar, anotar, Inicio y Actividad,
      balance, meta, exportar, salir y entrar), sin peticiones a terceros (FR-021, FR-013)
- [ ] Humo de release en producción, fundador 2 (FR-021, FR-013)

## 4. Despliegue y recuperación (paso 6)

- [ ] **Vuelta atrás ensayada:** Instant Rollback al despliegue anterior y vuelta al
      candidato, sin tocar la base de datos. Identificadores: `____` → `____` → `____` (FR-064)
- [ ] **Regla escrita:** la vuelta atrás sin tocar la base solo vale entre despliegues sin
      migraciones intermedias; si hubo una, se decide antes (FR-064)

## 5. Copias, restauración y migraciones (pasos 6–7)

- [ ] 002-T097: hubo copia antes del primer movimiento real, o se registró que no y se
      hizo de inmediato, informando a los fundadores (FR-004)
- [ ] **Cadencia escrita:** copia semanal los `________` y una antes de cada migración de
      producción. **Pérdida máxima aceptada: 7 días** (decisión de los fundadores, Q9).
      Dueño: `________`. Recordatorio: evento semanal en su calendario (FR-062)
- [ ] **Restauración real** de la copia del final del periodo de uso, con el esquema de
      P0-3, en un PostgreSQL 17 limpio: invariantes verdes y manifiesto coincidente,
      incluidas las seis tablas de P0-3 (FR-061)
- [ ] **Antes de cada migración de producción:** una copia y el «sí» de un fundador antes
      de cada paso de escritura (regla vigente, FR-065)

## 6. Plan Free de Supabase (FR-066)

- [ ] **Cómo se detecta una pausa:** el panel de Supabase marca el proyecto como pausado
      y la app no puede leer; la dueña recibe el aviso por correo
- [ ] **Cómo se reactiva:** la dueña, desde el panel («Restore project»); se comprueba la
      app al terminar
- [ ] **No se usa un «ping»** como garantía de que no se pause

## 7. Eliminación de cuenta y pendientes de lanzamiento (FR-067, Q8)

- [ ] Procedimiento manual de [contracts/account-deletion.md](contracts/account-deletion.md)
      ensayado en `juntia-dev`, con recuentos antes y después, en los dos casos de D2
      (opción a: sin pareja y con pareja)
- [ ] Mi cuenta → Privacidad dice en producción que la eliminación no está disponible y
      cómo pedirla
- [ ] **Al lanzamiento público, no a MVP-1:** eliminación en la interfaz, términos legales
      definitivos, correo propio, apertura del registro y cierre de la enumeración por la
      API de Auth. **Revisión legal antes de abrir la app a terceros**

## 8. Datos y registros (paso 7)

- [ ] Tabla de idempotencia sin purga en MVP-1; tamaño medido: `____` filas, `____` MB; su
      revisión, en la lista de MVP-2 (FR-068, Q12)
- [ ] Registros de ejecución de Vercel de una semana: cero coincidencias de importes,
      comercios, notas o tokens (se registran las búsquedas, no las líneas) (FR-013)

## Firmas

| Rol | Nombre | Fecha |
| --- | --- | --- |
| Gestor | | |
| Fundador | | |
