# 2026-11-06 · Segundo pago prometido, en "Registrar pago"

Sugerencia de una vendedora (por Enoc): al capturar el pago del anticipo (fecha y cantidad), poner ahí mismo la fecha
y la cantidad del **segundo pago**, para no cambiar de herramienta y que Cobranza lo tenga listo. "Permitido generar": 6 nov.

## Base (migración `segundo_pago_prometido`)
Columnas nuevas (no hay datos que respaldar). Funciones tocadas, respaldadas en `respaldo.funciones_20261106`.
- `leads.segundo_pago_fecha`, `leads.segundo_pago_monto`: lo que prometió para después del anticipo.
- `inscripciones.monto_proximo_pago`: cuánto va a dar en su `fecha_proximo_pago` (vacío = todo lo que debe). Es una promesa, no un saldo.
- Disparador `promesa_cumplida` (pagos, al insertar): si paga lo prometido, quita fecha y cantidad (y lo anota en su historial);
  si paga menos, la promesa se queda con lo que falta de ella en la misma fecha. No cuenta el anticipo con el que se
  inscribe (pagos de los primeros 10 minutos de la inscripción) ni un pago "no llegó".
- `ceder_lugar`: la promesa de quien cede se quita.
- `glamy_buscar_persona`: trae `monto_de_pago` en cada curso y `segundo_pago_fecha` / `segundo_pago_monto` en el pago reportado del lead.

## Hub
- **Registrar pago** (lead): recuadro "Su segundo pago (opcional)": fecha, "¿Cuánto va a dar ese día?" (vacío = todo lo que
  le falta), cuánto le falta con lo que está pagando y "Lo paga en su curso". No deja fecha pasada ni más de lo que falta.
  Si con ese pago liquida, el recuadro no sale. Queda en su nota ("Segundo pago: $300 el 16 nov").
- **Confirmar e inscribir**: si paga algo, la fecha y la cantidad vienen de su segundo pago; si no paga nada, la fecha es la de
  su anticipo (como antes). Solo cambia de una a otra cuando cambia "¿Cuánto pagó?" (no reescribe lo que borraron a propósito).
- **Ficha de la inscrita**: "Va a dar" junto a la fecha de pago (se guarda solo; actividad `promesa_monto_movida`);
  "Lo paga en su curso" quita fecha y cantidad.
- **Cobranza, Calendario de Cobranza y "Te toca cobrar"**: su renglón cobra lo prometido ("va a dar $300 · 16 nov").
  Todo sale de `montoPromesaInsc()`: lo prometido sin pasar de lo que debe hoy; sin fecha o sin cantidad, lo que debe.
- `HUB_VERSION = '2026-11-06-segundo-pago'`.

## Nada de fotos
- Lo que debe se sigue calculando de sus pagos. La cantidad prometida nunca pasa de lo que debe al mostrarse, y la base la
  quita o la reduce sola cuando paga.

## ¿Qué pasa si…?
1. Se captura tarde: se anota la fecha real; el semáforo la pinta según hoy. 2. Paga y se inscribe: fecha y cantidad pasan a su ficha.
3. "No se encontró" su pago: la promesa se queda en su lead para la próxima vez. 4. Cambia de curso: la promesa va con ella; si debe
menos, se cobra lo que debe. 5. Cede su lugar: se quita. 6. Reembolso: se cierra y sale de Cobranza. 7. Su curso cambia de fecha:
sin fecha se cobra el día nuevo; con fecha se respeta. 8. Dos cursos: cada uno su promesa. 9. Paga su segundo pago y todavía debe:
se quita sola y Cobranza le pide la siguiente. 10. Cobranza, semáforo, ficha y Glamy leen las mismas columnas y `montoPromesaInsc`.

## Pruebas
- `prueba_segundo_pago.js` (18/18), capturas 1200/390. Historia H15 (promesa parcial, cumplida, anticipo, ceder).
- Glamy: manual (Registrar pago, Confirmar pago, ficha).
