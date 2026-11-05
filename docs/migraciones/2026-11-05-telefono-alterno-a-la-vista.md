# 2026-11-05 · Teléfono alterno a la vista en la ficha del lead

Pedido por Enoc el 5 nov 2026 ("revísame dónde se muestra para agregar el teléfono secundario al crear, modificar un lead").
Mockup aprobado y "permitido generar" dado el 5 nov.

## Qué se hizo
- Hub (sin cambios en la base):
  - Ficha del lead: recuadro **"Teléfonos"** arriba, siempre a la vista, con "Teléfono principal" y "Teléfono alterno (opcional)".
    Antes estaban plegados en "Datos de contacto…" y el alterno se llamaba "Teléfono adicional".
  - La sección plegada pasa a ser "Más datos de contacto: nombre, correo y nacimiento".
  - El encabezado de la ficha dice "· alterno …" si tiene.
  - Ventana "Datos de contacto" (inscrita, Historial cliente, Academia): "Teléfono principal" y "Teléfono alterno (opcional)" (antes "Teléfono 1/2").
  - `problemaContacto()`: mismos mensajes en todos lados y ya no deja un alterno igual al principal (como "+ Nuevo lead").
- Glamy: el manual dice dónde está y cómo se llama.

## Nada de fotos
- No se guarda nada nuevo: es el mismo `personas.telefono_alternativo`, ahora a la vista.

## ¿Qué pasa si…?
1–7, 9: no le afecta (es un dato de contacto de la persona, no del curso ni del pago).
8. La misma persona tiene dos teléfonos: es justo para eso; el buscador ya la encuentra por cualquiera de los dos.
10. Glamy, Cobranza y el Embudo: no cuentan teléfonos; Glamy ya busca por el alterno.

## Vigilante e historias
- No hace falta regla nueva (la regla "Mismo teléfono en dos personas" ya existe). Historias sin cambio.

## Pruebas
- `prueba_telefono_alterno_ficha.js` (12/12), capturas 1200/390. `correr_todas.js` en verde antes de publicar.
- `HUB_VERSION = '2026-11-05-telefono-alterno'`. Aviso `2026-11-05-telefono-alterno`: sin publicar.
