# 🏦 Pagos por confirmar — 26 sep 2026

Lo pidió Jared (Recepción): cuando alguien paga por transferencia en la puerta, la deja pasar y
quiere marcar ese pago para revisarlo en el banco más tarde, como hacía con un color en el Excel.
Migración `pagos_verificacion_01_por_confirmar`, más cambios en `hub/index.html`.

## Lo que se acordó
1. La alumna pasa y queda liquidada: Jared la autoriza al recibirla (el comprobante es formalidad).
2. **No es automático:** Jared toca la etiqueta 🏦 para dejar el pago pendiente de revisar, y
   revisa todo con calma después de recibir a las alumnas.
3. Se confirma desde **Recepción** o desde la **ficha de la alumna**.
4. Por ahora solo se marca; los datos para encontrarlo en el banco los revisa Jared en la ficha.
5. Aplica a cualquier forma de pago (se agregó **Depósito / OXXO**) y a cobros fuera de Recepción.

## Supabase
- Respaldo: `respaldo.pagos_20260926` (58).
- `pagos`: `verificacion` (`confirmado` por defecto / `por_confirmar` / `no_llego`),
  `verificado_en`, `verificado_por` (sin llave foránea) e índice parcial de los no confirmados.
  Los 58 pagos que ya existían quedaron `confirmado`. La columna `hora` (ya existía) se llena sola.

## Hub
**Recepción**
- Junto a las formas de pago: **🏦 Por confirmar** (tecla **B**). Apagada por defecto; se apaga
  sola después de cada cobro. Formas: Efectivo · Tarjeta · Transferencia · Depósito / OXXO (1–4).
- Arriba, junto a "Cobrado hoy": **🏦 N por confirmar ($X)**; al tocarlo filtra. También hay filtro
  "🏦 Por confirmar". En la lista, franja dorada y "🏦 Por confirmar".
- En la alumna, recuadro con cada pago pendiente (monto, forma, hora) y **✓ Ya llegó al banco** /
  **✗ No llegó**. Si no se marcó al cobrar: "🏦 Marcar el pago de hoy por confirmar".
- Cerrar recepción avisa cuántos quedan por confirmar (no impide cerrar).

**Ficha de la alumna:** los mismos pendientes con sus dos botones arriba del cobro, la etiqueta
🏦 al registrar un abono y "Marcar el pago de hoy por confirmar".

**✗ No llegó:** pide confirmación; el pago queda `no_llego` (no se borra) y deja de contar en
"cobrado hoy". Si era del curso, la alumna vuelve a deber ese monto (sale de "Pagó el curso" y
aparece en Cobranza). Si era un extra (uniforme…), queda anotado en sus comentarios para cobrarlo.

**Cobranza:** arriba, "🏦 Pagos por confirmar · N · $X" con los de todos los cursos y "Revisar",
que abre la ficha. **Calendario:** la tarjeta y la hoja del día muestran "🏦 N por confirmar".
**Ventas → pagos recientes:** marca "🏦 por confirmar" o "✗ no llegó al banco".
**Actividad del equipo:** marcó por confirmar / confirmó en el banco / no llegó.

## Pruebas
- `prueba_por_confirmar` 35/35. Regresión: ficha 52, precios 28, recepción 65, no llegaron 38,
  calendario 20, humo 18 (admin y Logística): 7 archivos en verde.
- API real: las 5 consultas nuevas o cambiadas responden 200. Reglas reales como usuario sin
  admin (transacción que se deshizo): insertar un pago por confirmar y pasarlo a "no llegó"
  funcionan; después siguen 58 pagos confirmados.
