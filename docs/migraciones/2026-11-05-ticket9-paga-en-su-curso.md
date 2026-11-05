# 2026-11-05 · Ticket #9: la que paga el resto en su curso no debe salir vencida

Pedido por Cinthia (Cobranza), ticket #9. Diagnóstico y propuesta a Enoc; "permitido generar" el 5 nov.

## Causa
Al confirmar el pago e inscribir, "Fecha de pago de lo que falta" se llenaba sola con la fecha que el lead prometió para su
**anticipo**. Si nadie la borraba, quedaba como fecha del resto y ese mismo día salía "vencida" en Cobranza y en el semáforo.
De las 278 inscritas con anticipo de cursos que vienen, 272 no tienen fecha (van a "Más adelante", bien); solo una tenía la del anticipo.

## Qué se hizo
- Hub: al inscribir, si paga algo, la fecha de lo que falta queda vacía (= el día del curso); si no paga nada, se propone su fecha.
- Hub: botón **"Lo paga en su curso"** junto a la fecha de pago de la ficha de la inscrita (quita la fecha; queda en Actividad).
- Datos: a la inscrita afectada (la del ticket) se le quitó esa fecha, con su renglón respaldado en `respaldo.inscripciones_20261105`
  y nota en sus notas. La otra inscrita con fecha vencida trae una promesa real (no viene de esta falla) y se dejó igual.
- Glamy: el manual explica el botón.

## Nada de fotos
- No se guarda nada nuevo: "sin fecha" ya significaba "se cobra el día del curso" (Cobranza lo calcula).

## ¿Qué pasa si…?
2. Paga y queda inscrita: lo que falta queda sin fecha salvo que se escriba una. 3. Pago no encontrado: no le afecta.
4. Cambia de curso: la fecha sigue siendo de su ficha; sin fecha toma el día del curso nuevo. 6–9: no le afecta.
10. Cobranza, semáforo y Glamy leen la misma `fecha_proximo_pago`.

## Pruebas
- `prueba_ticket9_paga_en_curso.js` (10/10), capturas 1200/390. `HUB_VERSION = '2026-11-05-ticket9'`.
