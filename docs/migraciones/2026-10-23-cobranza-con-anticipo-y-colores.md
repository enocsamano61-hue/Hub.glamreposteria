# 2026-10-23 · Cobranza: grupo verde "Con anticipo · se cobra en el curso" y sin estatus "en blanco"

Permitido por Enoc el 23 oct 2026. Origen: "cuando una clienta paga 700 de 1400 se inscribe y queda en
verde para cobrarle en el curso, pero Estefani está en blanco". Revisión: Estefani estaba igual que las
220 inscritas con anticipo (en el Embudo, 💵 Con anticipo); en Cobranza → Por cobrar todas caían en
"Más adelante" con un círculo blanco ⚪, y ella no tiene la tarjeta verde de lead porque vino del Excel.

## Hub (`hub/index.html`)
- Grupo nuevo **💵 "Con anticipo · se cobra en el curso"**: inscritas que ya dieron anticipo, sin fecha de
  pago y cuyo curso es en más de 7 días. Si el curso es esta semana / hoy / ya pasó, siguen en esos grupos.
- **"Más adelante"** ahora es 🔵 y dice "con fecha de pago después de 7 días" (leads con promesa lejana,
  inscritas con fecha de pago lejana y las inscritas sin ningún pago).
- Cada inscrita dice **"Inscrita · con anticipo"** o **"Inscrita · sin pago"** y **"Pagó $700 de $1,400 ·
  debe $700"** (o "Sin pago · debe …").

## Base (migración `estatus_no_vence_pago_color_visible`)
- Estatus "Aún no vence su pago": color `#FFFFFF` → `#6F9FD8` (las tarjetas y etiquetas ya no se ven en
  blanco). Para regresarlo: `update estatus set color_hex = '#FFFFFF' where clave = 'no_vence_pago'`.

## Pruebas
- `pruebas/prueba_cobranza_grupos.js` 11/11. Capturas `cobranza-grupo-curso.png`, `cobranza-grupo-curso-celular.png`.
