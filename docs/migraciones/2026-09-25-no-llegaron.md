# No llegaron — 25 sep 2026

Fase 4 del rediseño de Recepción. Lo pidió Jared: "¿qué hacemos con los que no llegan?… que
podamos filtrar, tipificarlos bien… ver de qué ciudades son… lograr que liquiden y darles acceso
al online para que no pierdan su anticipo… y cuando ya perdieron el anticipo, que ya no aparezca
como que está pendiente de liquidar". Migración `no_llegaron_01_acceso_online_y_seccion`, más
cambios en `hub/index.html`.

## Supabase

- Respaldos: `respaldo.inscripciones_20260925_fase4` (36,389) y `respaldo.permisos_rol_20260925_fase4` (95).
- `inscripciones`: `acceso_online_en` y `acceso_online_por` (sin llave foránea).
- Sección `nollegaron` en `permisos_rol` para los 9 roles, y en `PERMISOS_POR_ROL_DEFAULT`.

## Hub — sección "No llegaron"

**Quién sale** (el estado se calcula; abrir la sección no cambia nada en la base):

| Estado | Quién |
|---|---|
| **Por revisar** | Curso del curso activo que ya pasó, dejó anticipo, no liquidó y nadie marcó si llegó. |
| **No llegó** | Se cerró la recepción sin ella (estatus 14). |
| **Acceso online dado** | Alguien lo marcó aquí. |
| **Perdió anticipo** | Alguien lo marcó aquí (estatus 15). |

"Pendientes" = Por revisar + No llegó. Hoy entran **56 por revisar** (42 de esta gira, incluido
Mexicali 24 sep, y 14 de la gira anterior del mismo curso): nadie quedó marcado "No llegó" sin
evidencia, como pide la regla.

**Pantalla:** chips por estado con conteo, buscador (nombre o teléfono), ciudad y vendedor; resumen
"N alumnas · $X en anticipos · les falta $Y". Tabla con curso y "hace N días"; a la derecha la ficha.

**Acciones:**
- 💬 **Ofrecer el curso online** (WhatsApp con los mensajes predeterminados).
- 💵 **Cobrar** (el cobro de la ficha de siempre).
- 🎓 **Acceso online dado** (fecha y quién; se puede quitar).
- 📅 **Mover a otro curso** (solo cursos próximos, con el buscador): conserva lo pagado, regresa a su
  estatus de antes y a Cobranza; sale de esta lista.
- ✓ **Sí fue al curso** (solo "Por revisar"): marca que llegó; sigue en Cobranza con lo que debe.
- 🔒 **Perdió el anticipo** (pregunta, con motivo opcional): estatus "Perdió anticipo", sale de
  pendientes y de Cobranza. **Deshacer** lo regresa a su estatus (o a "No llegó" si venía de ahí).
- Ficha completa.

Cada acción deja rastro en los comentarios de la alumna ("PERDIÓ ANTICIPO 25 sep 2026 por …") y
en Actividad del equipo.

## Pruebas

- `prueba_no_llegaron` 38/38 (estados, filtros, cada acción, deshacer, error de la base, celular).
- Regresión: ficha 52/52, precios 28/28, recepción 65/65, humo 18/18 (admin y Logística).
- API real: las dos consultas (casos marcados de cualquier curso con
  `eventos!inscripciones_evento_id_fkey!inner`, y por revisar del curso activo) responden 200.
