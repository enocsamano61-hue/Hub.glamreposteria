# 2026-10-28 · Fecha de pago de las inscritas (un solo lugar: su ficha)

Permitido por Enoc el 28 oct 2026 ("permitido generar", paquete del 1 al 5; este es el 1).

## Qué pasó
Una inscrita sin pago iba a dar su abono el 03/11. Jared puso esa promesa en la **pestaña Lead** de su ficha
("Aún no vence su pago" + fecha de anticipo). Para una inscrita, Cobranza lee la **Fecha de pago de su ficha**
(`inscripciones.fecha_proximo_pago`); como estaba vacía, tomaba la fecha del curso (enero) y la mandaba a "Más
adelante", cerrado. Su lead sí tenía el 03/11, pero Cobranza no cuenta el lead de alguien ya inscrita en ese curso.
Otra vez la misma información en dos lugares (la pestaña Lead de las inscritas se abrió en la Fase 1).
Además: 63 inscritas sin ningún pago y sin fecha de pago estaban todas escondidas en "Más adelante".

Decisión de Enoc: que el Hub pida la fecha de pago al inscribir sin pago, y que esté en el reconocimiento
(vigilante) y en el seguimiento (Cobranza).

## Base (migración `fecha_de_pago_de_inscritas`)
- Respaldos `respaldo.inscripciones_20261028` y `respaldo.leads_20261028b`.
- Trigger `promesa_de_inscrita_a_su_ficha` (antes de insertar o cambiar la fecha de anticipo, el estatus o el curso
  de un lead): si la persona ya está inscrita en ese curso (y no es un pago por confirmar), la fecha de anticipo pasa
  a la Fecha de pago de su ficha (si debe algo) con una nota en su historial, y si su lead estaba cerrado como
  "Inscrita" no se reabre.
- Se arregló el caso que había (su fecha quedó en su ficha y su lead volvió a "Inscrita").
- Vigilante: regla roja `promesa_escondida` (promesa de una inscrita guardada en su lead que su ficha no tiene) y
  amarilla `inscrita_sin_pago_sin_fecha` (hoy 62). Rojas en 0.
- `glamy_buscar_persona` trae `telefono_alternativo` y la `fecha_de_pago` de cada curso.

## Hub
- Cobranza → Por cobrar: grupo nuevo **"Inscritas sin pago · sin fecha"** (abierto de entrada); en cuanto tienen
  fecha pasan a su día. Las de anticipo sin fecha siguen en "Con anticipo · se cobra en el curso".
- Inscribir (Confirmar pago / Inscribir): campo **Fecha de pago**: obligatoria si no pagó nada, opcional si queda
  debiendo, no sale si liquida; no acepta fechas pasadas; propone su fecha de anticipo si ya la tenía.
- Pestaña Lead de una inscrita: aviso "Ya está inscrita en este curso: su fecha de pago va en su ficha… se pasa sola"
  con "Abrir su ficha"; al guardar, dice que la fecha quedó en su ficha.

## ¿Qué pasa si…?
- Paga después: pasa a "Con anticipo" y conserva su fecha para el siguiente pago.
- Reportan un pago en el lead de una inscrita: el Hub ya lo manda a su ficha (como antes); la base respeta
  "Pago por confirmar".
- Cambia de curso / cede su lugar: la fecha vive en la inscripción y se va con ella (o con quien recibe el lugar).
- No va / reembolso / curso pasado: igual que antes.
- Embudo, Cobranza y Glamy leen la misma fecha (la de la ficha).

## Glamy v25
- Manual: grupo nuevo de Cobranza, la fecha de pago de una inscrita va en su ficha (y se pasa sola desde el lead),
  la fecha se pide al inscribir, y el teléfono alternativo ("ese es su teléfono alternativo", no "no coincide").
- Examen 32/32.

## Pruebas
- Nueva `pruebas/prueba_fecha_pago_inscrita.js` (16); `prueba_cobranza_grupos.js` ajustada (la inscrita sin pago y
  sin fecha va al grupo nuevo). Historia H7 en `pruebas/historias/historias.sql`: 28/28. `correr_todas.js`: 44 en verde.
