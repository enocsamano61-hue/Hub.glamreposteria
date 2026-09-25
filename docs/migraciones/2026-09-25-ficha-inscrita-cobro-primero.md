# Ficha de la inscrita: el cobro primero y todo se guarda solo — 25 sep 2026

Fase 1 del rediseño de Recepción (propuesta A). Lo pidió Logística: en la gira, cobrar en la
puerta con el Hub tomaba más pasos que en el Drive, y un comentario no se dejaba guardar si
no se cambiaba un monto. Solo cambia `hub/index.html`. No hay migración.

## Qué cambia en la ficha (Calendario, Cobranza, Plazas e Historial)

- **Arriba, lo que debe en grande** ("Debe $500 · Pagado $1,400 de $1,900") o "✅ Liquidada".
- **Un solo botón de cobro:**
  - con el monto vacío dice **"Liquida $500"** y registra el saldo completo con un clic;
  - si escriben un monto dice "Registrar abono de $200" (o "Liquida $X" si con eso liquida);
  - pagar de más sigue pidiendo confirmación.
- **Forma de pago con un toque:** Efectivo / Tarjeta / Transferencia. Llena el mismo campo de
  banco de siempre (`pagos.banco`), que se puede seguir escribiendo a mano.
- **Comentarios sin botón:** se guardan solos 0.6 s después de dejar de escribir
  ("escribiendo… → ✓ Guardado"). Si cierran la ficha antes, se guarda al cerrar. Si falla,
  dice "⚠ No se guardó" y sale el aviso.
- **"Más información"** (cerrado al abrir): vendedor, próximo pago, Marcar estatus y
  Corregir montos.
  - Vendedor y próximo pago se guardan al elegirlos, sin botón.
  - Cambiar un vendedor que ya tenía dueño sigue preguntando y dejando el rastro. Si cancelan,
    el selector regresa al que estaba. Antes de escribir el rastro se guarda el comentario
    que estuvieran escribiendo, para no perderlo.
  - Corregir montos queda solo para dinero, como antes.
- El cobro directo de Cobranza (💵 Cobrar) sigue abriendo solo el cobro; "Ver ficha
  completa" muestra el resto.

El cálculo no cambia: la vista previa y el guardado usan `calcularAbono`; al liquidar pasa a
"Pagó el curso". No hay consultas nuevas: se escriben las mismas columnas de
`inscripciones` y `pagos` que ya se usaban.

## Pruebas

- `prueba_ficha` 51/51 (Chromium, Supabase simulado): comentario sin montos, guardado al
  cerrar, error visible, formas de pago, liquidar con un clic, abono parcial, pago de más,
  ya liquidada, vendedor con y sin dueño previo, próximo pago, pestañas, modo Cobranza y
  celular sin scroll horizontal.
- Humo: las 14 secciones del menú abren sin errores de JS.
- Las suites anteriores (vendedor, ui, sync, inscribir, ciudades, pagos, cobranza, contacto,
  ladas, mensajes) no están guardadas en el repo, así que no se pudieron volver a correr.
  Ver pendiente "Guardar las pruebas en `pruebas/`".
