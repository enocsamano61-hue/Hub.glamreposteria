# 2026-10-22 · Ticket #1: leads de alumnas ya inscritas atorados en "Pago por confirmar"

Ticket levantado por Cinthia con Glamy. Permitido por Enoc el 22 oct 2026.

## Problema
- Si la alumna ya estaba inscrita en ese curso (por la carga del Excel o porque alguien le creó un
  lead nuevo después) y se reportaba su pago en el lead, el lead quedaba en "Pago por confirmar".
- Al darle "Confirmar pago", el Hub sí evitaba duplicar la inscripción ("Ya estaba inscrita — te abro
  su ficha"), pero **no cerraba el lead**: se quedaba atorado para siempre.
- Había 13 leads así (del 24 sep al 22 oct).

## Cambios en el Hub (`hub/index.html`)
- Nueva `cerrarLeadYaInscrita(lead, inscId, pago)`:
  - cierra el lead en "Inscrita (anticipo confirmado)" con nota en el comentario y en el historial
    (`interacciones`), y registra la actividad `lead_ya_inscrita`;
  - abre la ficha de la inscripción;
  - si la ficha **no** tiene un pago de ese monto, deja el pago reportado escrito en "Registrar pago"
    para que quien cobra lo revise y lo guarde; si ya lo tiene, no escribe nada (no duplica dinero).
- "✅ Confirmar e inscribir" de una alumna ya inscrita en ese curso usa esa función.
- "💜 Registrar pago" en el lead de una alumna ya inscrita en ese curso avisa
  ("Ya está inscrita en ese curso") y, al aceptar, usa la misma función. Ya no deja el lead en
  "Pago por confirmar".

## Datos (migración `ticket1_cerrar_leads_ya_inscritas`)
- Respaldo: `respaldo.leads_20261022_ya_inscritas` (los 13).
- Se cerraron **9** cuyo pago reportado ya está en los pagos de su inscripción (mismo monto), con nota
  "CERRADO 22 oct 2026 (ticket #1): ya estaba inscrita en … El pago reportado de $… ya está en su ficha."
  y su renglón en `interacciones`.
- Se dejaron **4** en "Pago por confirmar": su pago reportado ($1,050, $900, $700, $700) **no** está en
  su inscripción. Al confirmarlos con el Hub nuevo, se cierra el lead y el pago queda escrito en su
  ficha para revisarlo en el banco y guardarlo.

## Pruebas
- Nueva `pruebas/prueba_lead_ya_inscrita.js` (14/14). Suite completa: 26 archivos en verde.
- Capturas: `lead-ya-inscrita-ficha.png`, `lead-ya-inscrita-aviso.png` (1200) y `lead-ya-inscrita-celular.png` (390).

## Corrección (22 oct, tarde): confirmar el pago de una inscrita ahora registra el abono
**Problema reportado por Enoc:** al confirmar un pago de $700 de una alumna que ya estaba inscrita
(la inscripción la había creado la carga del Excel con $0 pagado), el Hub cerraba el lead y abría
su ficha con los $700 escritos, pero **no los guardaba**: la alumna seguía debiendo $1,400 hasta que
alguien le daba "Registrar abono". Caso real: Jazmín (Coatzacoalcos, 8 nov).

**Arreglo (`cerrarLeadYaInscrita(..., { registrar:true })`):**
- Desde "✅ Confirmar e inscribir" (requiere el permiso "Confirmar pagos"), si su ficha no tiene ya un
  pago de ese monto, se registra el abono **confirmado** (monto, fecha, banco, quién) y se actualizan
  pagado, lo que debe, liquidado y estatus (`calcularAbono` y `estatusSegunPago`, igual que la ficha).
  Si falla, el lead **no** se cierra. Aviso: "registré el abono de $700. Debe $700".
- Si la ficha ya tiene ese pago, no se registra otra vez (igual que antes).
- "💜 Registrar pago" (reportar, sin confirmar) sigue dejando el pago escrito en la ficha para que
  Cobranza lo revise.

**Datos:** Jazmín ya tenía su abono: Enoc lo registró a mano a las 13:51. La corrección que preparé
no se aplicó (se agotó el tiempo y la base la deshizo), así que no hubo duplicado. Quedan 2 leads
del mismo tipo en "Pago por confirmar" (Tehuacán, $700 y $900): al confirmarlos, el abono ya se
registra solo.

**Pruebas:** `prueba_lead_ya_inscrita.js` 18/18 (abono confirmado, saldo, actividad, y que reportar
sin confirmar no registra). Suite: 29 archivos en verde.
