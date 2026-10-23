# 2026-10-23 · Corregir pago: también el estado (confirmado ↔ por confirmar)

Permitido por Enoc el 23 oct 2026. Origen: el pago de $700 de una inscrita estaba "confirmado" y pidieron
pasarlo a "por confirmar"; solo se podía con los pagos del mismo día.

## Ahora (`hub/index.html`, sin cambios en la base)
- En "✏️ Corregir" de "Pagos registrados": **Fecha · Forma · Banco · Estado** (✅ Confirmado / 🏦 Por confirmar),
  para cualquier fecha. Mismo permiso (administradores o "Confirmar pagos").
- No mueve el saldo (un pago por confirmar sigue contando como pagado). Al pasarlo a por confirmar aparece
  arriba en la ficha y en 🏦 Pagos por confirmar de Cobranza con "✓ Ya llegó / ✗ No llegó"; al regresarlo a
  confirmado guarda quién y cuándo (`verificado_por`, `verificado_en`).
- "No llegó" (anulado) no se cambia desde aquí: sigue con sus botones porque sí mueve el saldo.
- Actividad `pago_corregido` con "estado confirmado → por confirmar".

## Pruebas
- `pruebas/prueba_ficha_pagos.js` 23/23 (paso 4b). Captura `ficha-pagos-estado.png`.
