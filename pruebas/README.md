# Pruebas del Hub

Pruebas con Playwright (Chromium) que abren `hub/index.html` **sin tocar Supabase**:
`sb.from` se cambia por una base en memoria y cualquier petición a `supabase.co` se bloquea.

## Correrlas

```bash
NODE_PATH=$(npm root -g) node pruebas/correr_todas.js      # todas
NODE_PATH=$(npm root -g) node pruebas/prueba_ficha.js      # una sola
```

- Chromium se busca en `/opt/pw-browsers/chromium` (o en la variable `CHROMIUM`).
- Cada prueba imprime `nombre: ok/total` y sale con error si algo falla.
- Las capturas quedan en `pruebas/capturas/` y no se suben al repo.
- `prueba.html` se genera en cada corrida y tampoco se sube.

## Archivos

| Archivo | Qué es |
|---|---|
| `arnes.js` | Arma la página de prueba (CDN → `vendor/`), instala la base en memoria, entra como un usuario de ejemplo y da ayudas (`check`, `ops`, `fallar`, `captura`). |
| `vendor/` | Copias locales de supabase-js 2 y Chart.js 4.4.4. |
| `correr_todas.js` | Corre cada `prueba_*.js` y dice cuáles fallaron. |
| `prueba_humo.js` | Todas las secciones del menú abren sin errores de JS (admin y Logística). |
| `prueba_ficha.js` | Ficha de la inscrita: cobro primero, guardado automático, modo Cobranza. |
| `prueba_precios.js` | Sección Precios. |
| `prueba_recepcion.js` | Recepción del día del curso: buscar, cobrar, extras, llegada, cerrar/reabrir, leads, teclado. |

## Escribir una prueba nueva

```js
const { abrirHub } = require('./arnes');
(async () => {
  const h = await abrirHub({ tablas: { precios: [ /* filas de ejemplo */ ] } });
  h.paso('1. Qué se prueba');
  await h.p.click('#algo');
  h.check((await h.ops('precios', 'update')).length === 1, 'guardó una vez');
  await h.terminar();
})();
```

- `tablas`: filas por tabla. `select` filtra con `eq`, `in` y `not(…, 'in', …)` (también con
  columnas anidadas como `eventos.curso_id`); `insert`, `update` y `delete` cambian las filas.
  Los demás filtros (`order`, `gte`, `ilike`…) se aceptan pero no filtran, y no hay joins:
  lo anidado se escribe ya dentro de la fila de ejemplo.
- `h.ops(tabla, tipo)`: lo que el Hub mandó (`insert`, `update`, `select`, `delete`).
- `h.fallar(op => ...)`: simula un error de la base en las operaciones que cumplan la condición.
- Usa solo datos inventados: nada de nombres, teléfonos ni direcciones reales.

## Lo que estas pruebas NO detectan

La base en memoria no sabe de llaves foráneas, RLS ni del caché de esquema de la API.
Toda consulta nueva o cambio de esquema se prueba además **contra la API real**
(ver la lección del PGRST201 en `docs/migraciones/2026-09-23-flujo-de-pago-y-permisos.md`).

Las suites de sesiones anteriores (vendedor, ui, sync, inscribir, ciudades, pagos, cobranza,
contacto, ladas, mensajes) se perdieron al cerrar esas sesiones. Conviene rehacerlas aquí
conforme se toquen esas partes.
