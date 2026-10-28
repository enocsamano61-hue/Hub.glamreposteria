# 2026-10-28 · Comprobantes de pago (opcionales)

Permitido por Enoc el 28 oct 2026 ("permitido generar", paquete del 1 al 5; este es el 3). Decisión: opcionales al
principio; el vigilante cuenta los pagos por confirmar sin comprobante.

## Base (migración `comprobantes_de_pago`)
- Bucket **privado** `comprobantes` (10 MB; JPG, PNG, WEBP o PDF). Políticas: el equipo (con usuario en el Hub)
  sube y ve; nadie borra ni cambia. Se abren con enlaces firmados de 5 minutos.
- Tabla `comprobantes` (ruta, huella sha256, tipo, tamaño, persona, lead, inscripción, pago, estado vigente /
  no_encontrado, quién y cuándo). RLS para el equipo; candado contra borrado.
- Trigger `comprobantes_al_pago` (al insertar un pago): los comprobantes del lead de esa persona en ese curso pasan a
  ese pago y su inscripción (el mismo archivo, no una copia).
- Trigger `comprobantes_no_encontrado` (el lead sale de "Pago por confirmar" sin inscribirse): quedan "no_encontrado".
- Vigilante (amarillas): `comprobante_repetido` (la misma huella en dos pagos distintos) y
  `por_confirmar_sin_comprobante` (leads en "Pago por confirmar" y pagos por confirmar de cursos que vienen).
- `glamy_buscar_persona`: `comprobantes` por curso y `pago_reportado_con_comprobante` en los leads.
- Probado contra la base (ensayo que se deshace): al confirmar pasa al pago; "no se encontró" lo marca; la huella
  repetida se detecta.

## Hub
- "Registrar pago" (lead): campo "Comprobante (opcional: foto o PDF)"; en el celular deja tomar la foto.
- Lead con pago reportado y "Confirmar pago e inscribir": "Ver comprobante" y "Adjuntar comprobante".
- Ficha de la inscrita → Pagos registrados: "Ver comprobante" y "Adjuntar comprobante" en cada pago.
- Cobranza → Por confirmar: botón "Comprobante" en el lead o la inscrita que lo tiene.
- Las fotos se reducen (máx. 1600 px, JPG) antes de subir; la huella es la del archivo original. Actividad
  `comprobante_subido`.

## ¿Qué pasa si…?
- El lead paga y se confirma: su comprobante pasa solo al pago de la inscripción.
- "No se encontró": queda en su historial, marcado así.
- Cambia de curso o cede su lugar: el comprobante va ligado al pago/inscripción, se va con ella.
- Suben el mismo comprobante dos veces: el vigilante lo marca (ayuda contra pagos dobles).
- Glamy: sabe si un curso tiene comprobantes y si el pago reportado de un lead lo trae (manual actualizado; se
  publica junto con los puntos 4 y 5).

## Pruebas
- Nueva `pruebas/prueba_comprobantes.js` (13). `correr_todas.js`: 45 en verde.
