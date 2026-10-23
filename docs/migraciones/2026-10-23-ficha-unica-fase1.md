# 2026-10-23 · Ficha única, fase 1: mismo encabezado y pestañas en todas las fichas

Permitido por Enoc el 23 oct 2026 ("si dos · Academia Glam con su ficha · solo Recepción distinta ·
adelante genera"). Origen: "si abren la ficha en histórico no sale igual que el lead; es importante
unificar todas las fichas".

## Revisión (antes)
Tres "fichas" para la misma persona: la del lead (datos, curso, estatus, pago reportado, historial de
contacto), la de la inscrita (cobro, pagos, cambio de fecha, notas; sin historial de contacto) y el perfil
de Historial cliente (cursos y contactos; sin leads). Cursos y Ciudades/Plazas mandan a Historial;
Recepción tiene su panel rápido; Academia Glam su ficha de suscripción.

## Fase 1 (`hub/index.html`, sin cambios en la base)
- Las dos fichas (lead e inscrita) comparten **encabezado**: avatar, nombre, teléfono, ⭐ VIP / ⚠ Lista
  negra, ✏️ Datos de contacto, 💬 WhatsApp, ➕ Otro curso.
- **Pestañas iguales** en las dos: **Lead** (su lead abierto) · **Inscripción** (sus cursos que no han
  pasado, hasta 3) · **Contactos**. Cambiar de pestaña abre la otra ficha de la MISMA persona
  (`pintarFichaTabs`, `irPestanaFicha`); las 28 formas de abrir una ficha en el Hub siguen igual.
- **Contactos** (`pintarContactosFicha`): el mismo historial en las dos, con canal (WhatsApp, nota…) y
  quién; en la ficha del lead sigue abajo también.
- En la ficha del lead los datos de contacto van plegados ("Datos de contacto" del encabezado los abre;
  se guardan con "Guardar cambios", como antes).
- Modo "solo cobro" (Cobranza / No llegaron): sin pestañas; "Ver ficha completa" las muestra.
- Recepción conserva su panel rápido; Academia Glam su ficha.

## Fase 2 (pendiente)
Pestaña **Historial** (todos sus cursos y leads, resumen de Academia) y que Historial cliente, Cursos y
Ciudades/Plazas abran esta misma ficha. Manual de Glamy al publicar la fase 2.

## Pruebas
- `pruebas/prueba_ficha_unica.js` 18/18. Suite completa en verde.
- Capturas `ficha-unica-lead.png`, `ficha-unica-inscripcion.png`, `ficha-unica-contactos.png`, `ficha-unica-celular.png`.
