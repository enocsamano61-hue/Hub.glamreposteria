# Recepción del día del curso — 25 sep 2026

Fase 3 del rediseño (propuesta A, "ChatGPT"). Lo pidió Logística: en la puerta, con 30 alumnas
en fila, el Drive era más rápido que el Hub. Migración `recepcion_01_asistencia_forma_pago_y_estatus`,
más cambios en `hub/index.html`.

## Supabase

Respaldos: `respaldo.inscripciones_20260925` (36,389), `pagos_20260925` (57),
`estatus_20260925` (13), `eventos_20260925` (1,592), `precios_20260925` (2).

- **`inscripciones`:** `asistencia` (`llego` / `no_llego` / vacío), `asistencia_en`,
  `asistencia_por` y `estatus_antes_de_cierre` (para reabrir o si llega tarde).
- **`pagos`:** `forma_pago` (Efectivo / Tarjeta / Transferencia) y `concepto`
  (`curso` por defecto, o el nombre del extra: "Uniforme"…).
- **`eventos`:** `recepcion_cerrada_en` y `recepcion_cerrada_por`.
- **Estatus nuevos:** 14 `no_llego` "No llegó al curso" y 15 `perdio_anticipo` "Perdió anticipo".
  Los dos son finales: no salen en Cobranza ni se ofrecen en la ficha del lead.
- **`precios.clave`:** "Subir a VIP" = `subir_vip`, para reconocerlo aunque le cambien el nombre.
- **Sin llaves foráneas nuevas** (lección PGRST201). Los `*_por` son solo referencia.

## Hub

**Entrada:** Calendario → día → **🎟️ Entrar a recepción** (en cada curso de la hoja del día).
Pantalla completa, pensada para laptop (1366×768). En celular se acomoda en una columna.

- **Arriba:** ciudad y fecha, **Llegaron 18/30** y **Cobrado hoy**, más "Cerrar recepción".
- **Izquierda:** buscador (ya con el cursor; nombre en cualquier orden o 3+ números del teléfono),
  filtros **Faltan · Llegaron · Deben · Todas · Leads · ⚡ Por cobrar** y la lista.
- **Derecha, la alumna:** llegó / no ha llegado y liquidada / debe, por separado; **lo que debe en
  grande**; pagado, cómo pagó el anticipo, total y vendedor.
- **Cobrar:** botón **"Liquida $X"** + forma de pago (Efectivo / Tarjeta / Transferencia; la última
  se queda para las siguientes).
  - Registra el pago (con forma y concepto), deja el saldo en cero, pasa a "Pagó el curso" y marca
    que **llegó**. Sube el contador y **pasa sola a la siguiente** con el buscador limpio.
  - Todos los pagos de un cobro van en una sola escritura: o entran todos o ninguno.
  - Si el pago falla: "El cobro NO se hizo" + **Reintentar**. Si el pago entró pero el saldo no:
    lo dice y **no** ofrece reintentar (sería cobrar dos veces).
  - "Cobrar otro monto (abono)" abre el cobro de la ficha de siempre.
- **Extras** (de la sección Precios): "+ Subir a VIP · $500", "+ Uniforme"…
  - Se suman al botón ("Se cobra: curso $1,200 + Uniforme $350 = $1,550").
  - Subir a VIP cambia el paquete y el precio del curso; los demás extras quedan como pagos
    aparte con su concepto (no inflan el precio del curso).
  - Si un extra no tiene precio, lo pide ahí mismo y **queda en Precios para todos**. El ✎ cambia
    el precio (también para todos).
- **Llegada sin cobrar:** "Marcar que llegó sin cobrar (L)" para quien liquida después. Tocar
  "✓ LLEGÓ" la quita (pregunta antes).
- **Comentario** que se guarda solo; **Ficha completa** y **💬 WhatsApp** a un toque.
- **Leads del curso** (los que no están cerrados): salen en "Leads" y en la búsqueda. Con el permiso
  💳 el botón es **"✅ Confirmar pago e inscribir"**; sin él, "💜 Registrar pago". Al cerrar esa
  ventana, la Recepción se recarga y la alumna ya aparece inscrita.
- **Teclado:** Ctrl/⌘+K buscar · ↑↓ · Enter (abrir / cobrar / marcar / siguiente) · L · P · 1 2 3 ·
  V (VIP) · U (uniforme) · C (comentario) · Esc (buscar otra).
- Cada 20 s trae lo que haya cobrado otra persona (si no se está escribiendo ni cobrando).
- "No va al curso" y "Perdió anticipo" se ven en "Todas", pero no cuentan en los contadores.

**Cerrar recepción:** muestra el resumen (inscritas, llegaron, no llegaron, liquidadas, cobrado)
y los nombres de quienes faltan. Al confirmar:
- quien no llegó queda con asistencia `no_llego`; si **debe**, pasa a **"No llegó al curso"** y sale
  de Cobranza; si ya había liquidado, conserva su estatus;
- se guarda de qué estatus venía cada una;
- el curso queda marcado como cerrado (quién y cuándo) y en Actividad del equipo.

Después del cierre se puede seguir usando: si alguien **llega tarde**, se marca y **recupera su
estatus**. **Reabrir** regresa a todas las "No llegó" a su estatus de antes y a Cobranza.

**Otros cambios:**
- Cobranza ya no muestra inscritas en "No llegó al curso" ni "Perdió anticipo".
- La ficha normal también guarda la forma de pago cuando se elige Efectivo / Tarjeta / Transferencia.
- Actividad del equipo: abrió / cerró / reabrió recepción, marcó / quitó llegada.

## Pruebas

- `prueba_recepcion` 65/65 (Chromium, base simulada, 1366×768 y 390 px). Incluye un caso que
  encontró un error real: el Enter al guardar el precio de un extra podía llegar al teclado general
  y cobrar. Se corrigió.
- Regresión: `prueba_ficha` 52/52, `prueba_precios` 28/28, `prueba_humo` 17/17 (admin y Logística).
- **API real:** las 4 consultas nuevas (inscritas con pagos embebidos por
  `pagos!pagos_inscripcion_id_fkey`, leads del curso, evento, precios) responden 200.
- **Reglas de acceso reales:** como usuario sin admin, dentro de una transacción que se deshizo:
  insertar un pago con forma y concepto, pasar una inscripción a "No llegó" y cerrar el evento
  funcionan. Después: 57 pagos, 0 asistencias, 0 cierres (no quedó nada).
