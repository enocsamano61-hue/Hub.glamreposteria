# 2026-10-28 · Kits: columna "Por pagar envío"

Pedido de Tamar; permitido por Enoc el 28 oct 2026 (paquete del 1 al 5; este es el 4). Decisión: el envío se cobra
**después** de preparar el kit. Orden: Por pagar → Por preparar → Por pagar envío → Enviado → Entregado.

## Base (migración `kits_por_pagar_envio`)
- Respaldo `respaldo.academia_kits_20261028`.
- Columna `academia_kits.esperando_envio` (boolean): el kit ya está preparado y falta que paguen el envío. El estado
  sigue siendo `por_preparar` (cambiar la regla de estados de la tabla habría pedido quitarla); así lo demás que
  cuenta kits "por preparar" (filipinas de Graduación) sigue igual.

## Hub
- Columna "Por pagar envío" (morada) en el tablero y en los botones de estado del kit.
- La tarjeta y la ficha dicen: "Falta el costo del envío", "Envío: debe $X" o "Envío pagado · ya se puede enviar".
- Al pagar el kit (sin el envío) pasa solo a "Por preparar" (antes esperaba también el envío si ya tenía costo).
- En "Por pagar envío" el pago se propone como "Envío"; al cubrirlo avisa "Envío pagado: ya se puede enviar".
- Marcar "Enviado" un kit de "Por pagar envío" sin el envío pagado pregunta antes ("Falta pagar el envío… ¿lo
  envías de todos modos?"). Fuera de esa columna, igual que antes.
- Lo pagado de más del kit cuenta para el envío.

## ¿Qué pasa si…?
- Se cancela: va a Cancelados y se quita la marca; sus pagos se conservan.
- Cambia el costo del envío: lo que falta se recalcula solo.
- Paga de más: el Hub avisa antes de registrar (como antes).
- Glamy: no consulta kits; su manual explica la columna nueva.

## Pruebas
- Nueva `pruebas/prueba_kits_envio.js` (13); `prueba_academia_kits.js` sigue igual (34).
