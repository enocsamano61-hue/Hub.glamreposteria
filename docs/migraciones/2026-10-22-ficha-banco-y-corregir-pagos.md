# 2026-10-22 · Ficha: el banco va aparte y los pagos se pueden corregir

Permitido por Enoc el 22 oct 2026. Origen: en la ficha de una inscrita (Coatzacoalcos, 7 feb 2027) "no
deja capturar el banco ni la fecha". Se registró un abono de $700 que quedó con banco "Transferencia".

## Qué pasaba
1. Los botones de forma de pago escribían la forma en la misma casilla del banco: al escribir el banco se
   perdía la forma (o quedaban pegadas). En la práctica no se podía capturar el banco.
2. La ficha solo mostraba los pagos "por confirmar"; un pago ya guardado no se veía ni se podía corregir.

## Ahora (`hub/index.html`, sin cambios en la base)
- Forma de pago (botones, `cobroForma`) y **Banco** (casilla propia con sugerencias: BanCoppel, Mercado
  Pago, Hey Banco, Banregio y otros) se guardan por separado en `forma_pago` y `banco`. Si escriben la
  forma en la casilla del banco, cuenta como forma.
- **"Pagos registrados (N)"** en la ficha: fecha, monto, forma · banco y si está por confirmar o anulado.
- **"✏️ Corregir"** (administradores o permiso "Confirmar pagos"): fecha, forma y banco. No toca el monto
  ni el saldo (eso sigue en "Corregir montos"), no acepta fecha futura, sin cambios no guarda. Actividad
  `pago_corregido` con antes → después.
- `descripcionPago` muestra "Transferencia · BanCoppel" sin repetir.
- Glamy: manual actualizado (ficha, banco y "Corregir").

## Pendiente
- El pago de $700 de ese número sigue con banco "Transferencia" y fecha 15 oct: se corrige con el botón
  nuevo (o lo corrijo yo en la base) en cuanto se sepa el banco y la fecha real.

## Pruebas
- `pruebas/prueba_ficha_pagos.js` 16/16; `prueba_ficha.js` actualizada al nuevo comportamiento (51/51).
- Capturas `ficha-pagos-lista.png`, `ficha-pagos-corregir.png`, `ficha-pagos-celular.png`.
