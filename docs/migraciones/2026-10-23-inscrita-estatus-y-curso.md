# 2026-10-23 · Ficha de la inscrita: estatus según sus pagos, cambiar de curso y fecha de pago

Permitido por Enoc el 23 oct 2026. Origen: "Estefani Vences sigue con errores raros, la card se ve
diferente; se debe poder asignar curso, fecha, todo" (y la duda de Martha Cossette, que era un pago de
lead sin confirmar: falta "✅ Confirmar pago", no es error).

## Qué pasaba
1. La ficha de la inscrita ofrecía TODOS los estatus, incluidos los de lead ("Pago por confirmar", "Aún no
   vence su pago"…). Una inscrita con su pago confirmado quedó en "Pago por confirmar".
2. Registrar un abono no corregía el estatus (solo al liquidar).
3. No se podía cambiar el curso desde la ficha (solo en No llegaron) y la fecha de cobro estaba escondida.

## Ahora (`hub/index.html`)
- `estatusInscSegunPagos`: el estatus de una inscrita sale de sus pagos → Sin pago (`no_vence_pago`),
  Con anticipo (deben) (`anticipo_vigente`) o Liquidada (`pagado`). En la ficha: "Activa · según sus
  pagos: …" y a mano solo **Verificar antes de cobrar** (algo está mal, ya se usaba así en las tarjetas),
  **No va**, **Perdió anticipo**, **No llegó**.
- Un abono pone el estatus según sus pagos, salvo que esté marcada a mano.
- **"Cambiar de curso"** arriba del cobro: buscador de ciudad con su lada primero, confirma de dónde a
  dónde, conserva pago/paquete/vendedora, rastro en sus notas y actividad `inscripcion_movida`; no la
  mueve a un curso donde ya está inscrita.
- **"Fecha de pago (lo que le falta)"** a la vista junto al curso (antes en "Más información").

## Datos (migración `inscritas_estatus_segun_pagos`)
- Respaldo `respaldo.inscripciones_estatus_20261023` (6 filas: id, estatus anterior, notas).
- 6 inscritas de cursos que vienen pasaron al estatus de sus pagos (Estefani incluida → Con anticipo),
  con nota "ESTATUS CORREGIDO 23 oct 2026: era …". Las 7 marcadas "Algo está mal" no se tocaron.
- Verificado: 0 inscritas de cursos que vienen con estatus que no cuadre.

## Pendiente
- Manual de Glamy (cambiar de curso, fecha de pago, estatus por pagos): se publica con la fase 2 de la
  ficha única.

## Pruebas
- `pruebas/prueba_ficha_estatus_curso.js` 21/21; `prueba_ficha.js` ajustada (el abono pone estatus).
- Capturas `ficha-curso-y-fecha.png`, `ficha-cambiar-curso.png`, `ficha-curso-celular.png`.
