# Flujo del pago ⚪ → 💜 → 🟢 y permiso "Confirmar pagos" — 23 sep 2026

Migración `flujo_pagos_01_pago_reportado_y_permisos_accion` + cambios en `hub/index.html`.

## Cómo trabajan (lo que pidieron)

1. ⚪ **Lead.** El vendedor lo captura con nombre, teléfono, **curso** (ciudad · fecha del
   Calendario, con el buscador) y **fecha de anticipo**: el día que dijo que paga. Cobranza le
   da seguimiento ese día.
2. 💜 **Registrar pago.** Cuando la alumna dice que ya pagó, el vendedor lo registra. El lead
   **sigue siendo lead**, en estatus "Pago por confirmar", con monto, fecha, banco, paquete y
   quién lo reportó. **Todavía no aparece en su ciudad.**
3. 🟢 **Confirmar pago.** Quien tenga el permiso lo busca en el banco y confirma. Eso:
   - crea la inscripción y el pago, con `confirmado_por` = quien confirmó;
   - cierra el lead;
   - hace que la alumna aparezca en su ciudad.

   El formulario sale prellenado con lo que reportó el vendedor.
4. ❌ **No se encontró.** El lead regresa al estatus que tenía antes de reportar, sin el pago
   reportado y con una nota para el vendedor ("PAGO NO ENCONTRADO … Motivo: …").

## Supabase

- `leads` columnas nuevas:
  - `evento_id`: el curso que va a tomar;
  - `pago_reportado_monto`, `_fecha`, `_banco`, `_por` (usuario), `_en` (cuándo);
  - `estatus_antes_de_reporte`: para poder regresarlo.
- Se reusan `fecha_compromiso_pago` (fecha de anticipo) y `paquete`.
- `permisos_accion(rol, accion)`: fila = ese rol puede. RLS: todos leen y sólo admins escriben,
  igual que `permisos_rol`. Arranca con `confirmar_pagos` para **Ventas** y **Cobranza**. Los
  admins siempre pueden.

  Va aparte de `permisos_rol` porque, si un rol no tiene filas ahí, el Hub usa el respaldo de
  secciones. Mezclar acciones en esa tabla rompería ese respaldo.

## Hub

- **Ficha del lead:** tiene los botones del flujo arriba, más los campos "Curso que tomará" y
  "Fecha de anticipo".
  - Elegir un curso pone su ciudad.
  - Sin permiso se ve 💜 Registrar pago, pero no ✅ ni ❌.
  - Con permiso también se puede inscribir directo ("pago ya confirmado").
- **Nuevo lead:** "Curso que tomará" (buscador de cursos del Calendario) y "Fecha de anticipo".
  Si "aún no decide", pide ciudad y curso de interés como antes.
- **Tablero:** la tarjeta dice "💜 $700 por confirmar" y "💸 Anticipo 25 sep". Si ya pasó la
  fecha, lo marca en rojo.
- **Usuarios y permisos:** tarjeta nueva "Qué puede hacer cada rol", con la columna
  "💳 Confirmar pagos". Cada cambio queda en Actividad del equipo.
- Actividad del equipo registra: pago reportado, pago confirmado, pago no encontrado y
  permiso cambiado.

Nota: el permiso se aplica en el Hub, como el resto de permisos por rol. La base de datos
sigue permitiendo escribir a cualquier usuario autenticado.

Los 36 leads que ya estaban en "Pago por confirmar" (del Excel) no tienen pago reportado. Se
ven con los botones normales y se pueden confirmar o registrar.

Pruebas: `prueba_pagos` 58/58. Regresión: ciudades 61, vendedor 23, ui 50, sync 29, inscribir
76 (la prueba de inscribir ahora da a Isabel el rol Ventas con el permiso).
