# 🎓 Academia · Fase 2: pestaña Graduación — 14 oct 2026

Fase 2 de la sección Academia: la graduación en Monterrey, con quién va, sus acompañantes, hotel, filipina y su cuenta.

- **Migración:** `academia_05_graduacion`.
- **Respaldos:** `respaldo.precios_20261014_academia` (3), `respaldo.academia_graduaciones_20261014` (2) y `respaldo.academia_graduacion_asistentes_20261014` (48).
- **Código:** `hub/index.html`.
- **Pruebas:** `pruebas/prueba_academia_graduacion.js`, más una verificación nueva en `prueba_recepcion.js`.

**Decisiones** (recomendaciones aceptadas con el "permitido generar" del 14 oct):

1. Entra **cualquier alumna** que se gradúe, de cualquier generación. La generación se muestra pero no limita.
2. El **hotel** lleva su propia cuenta dentro de la misma ficha.
3. El **precio se congela** al inscribirla. Si después cambia el de la graduación, ella conserva el suyo.
4. La graduación de **agosto 2026** (ya pasó) queda **solo de consulta**, con lo que vino del Excel.
5. Fecha de la próxima: **3 ago 2027**, editable en el Hub.

## Supabase

- **`precios.area`** (`gira` | `academia`, `'gira'` por defecto). **Recepción solo ofrece los de la gira.** En la sección Precios cada precio tiene su selector y el alta lo pide.
- **`academia_graduacion_asistentes`**, columnas nuevas:
  - acompañantes (0–20) e invitados (nombre y parentesco);
  - hotel: tipo, entrada, salida y total;
  - filipina: talla, color (blanca, negra o ambas) y nombre a bordar;
  - `precio_alumna` y `precio_acompanante` congelados;
  - extras (los de Precios con área Academia);
  - `estado` (`activa` | `cancelada`; quitarla no borra);
  - `agregado_por`.
  - Las agregadas en el Hub llevan `clave_origen = 'hub:<alumna_id>'`.
- **Tabla nueva `academia_graduacion_pagos`:** abonos de graduación u hotel, con monto mayor a 0, forma, fecha, nota y quién lo registró. RLS solo Academia y admins, sin DELETE y con candado `no_borrar` / `no_vaciar`.
- **`academia_carga()`:** la recarga del Excel ya **no pisa** el precio de alumna ni el de acompañante si Academia lo cambió en el Hub.

## Hub

La pestaña **Graduación** ya está activa.

**Arriba, la graduación:**
- selector entre la próxima y la pasada, y **+ Agregar alumna** (buscador en todas las generaciones);
- de la próxima, se editan fecha, sede, precio de alumna y de acompañante (se guardan solos), con el aviso de que las ya inscritas conservan su precio, y se ven los conceptos del desglose.

**Números:** se gradúan, ya liquidaron, acompañantes, habitaciones y falta por cobrar (graduación + hotel).

**Lista:**
- chips Todas · Deben · Liquidaron · Sin talla · Sin hotel · Quitadas, y buscador;
- columnas: alumna (con su generación), invitados, hotel, filipina, y pagado/total con su barra.

**A los lados:**
- **Filipinas para comprar:** por talla y color. "Blanca y negra" cuenta una de cada. Dice cuántas faltan de talla y tiene **📋 Copiar pedido con nombres a bordar**.
- **Hotel:** habitaciones por tipo.

**Ficha de la alumna (próxima graduación):**
- **Cuenta:** alumna + acompañantes (botones − y + que recalculan) + extras de Precios con área Academia (se agregan con un toque y se quitan con ✕) = total, pagado y lo que debe.
- **Nombre y parentesco** de cada acompañante.
- **Hotel:** tipo, total, entrada y salida, con lo pagado y lo que debe del hotel.
- **Filipina:** talla, color y nombre a bordar.
- **Registrar pago:**
  - concepto Graduación u Hotel;
  - **Liquida todo** pone lo que debe;
  - pide confirmación y avisa si es más de lo que debe;
  - pide el permiso **🎓 Cobrar en Academia**.
- **Notas**, **💬 WhatsApp** (con fecha, sede y lo que debe) y **Quitar de la graduación** / **↩ Volver a agregarla**.

**Graduación pasada:** lista y ficha con los textos del Excel (invitados, hotel, filipina, liquidó, abonos). Sin campos para editar y sin "Agregar".

**Desde Alumnas:** al marcar **🎓 Se gradúa**, el Hub pregunta si la agrega a la próxima graduación con el precio de hoy. Al agregar una alumna desde Graduación, su decisión pasa a "Se gradúa".

**Actividad del equipo:** agregó / quitó una alumna, pago de la graduación, cambios de datos de la alumna y fecha, sede o precios de la graduación.

## Pruebas

- **`prueba_academia_graduacion` 46/46:**
  - números, lista, chips y filipinas;
  - cuenta, acompañantes y extras (solo los de Academia);
  - hotel y filipina;
  - pagos de graduación y de hotel ("Liquida todo"; sin monto no registra);
  - quitar y volver (nunca DELETE);
  - agregar alumna con precio congelado;
  - datos de la graduación (las ya inscritas conservan su precio);
  - pasada solo consulta;
  - Precios por área;
  - "Se gradúa" desde Alumnas;
  - celular sin scroll horizontal.
- **`prueba_recepcion` 66/66:** nueva verificación de que un extra de Academia no sale en Recepción.
- **Regresión en verde:** academia 46, calendario 20, copiar 34, cursos e historial 40, ficha 52, humo 19 (Sistemas y Logística), no llegaron 38, por confirmar 35, precios 28, tareas 14, VIP 23.
- **API real sin sesión:** las 6 consultas nuevas o cambiadas responden 200 (incluido el embed `academia_alumnas(...)` desde asistentes) y una columna inventada da 400.
- **Base con usuarios reales**, en una transacción que se deshizo:
  - Academia agrega una alumna, registra un pago, edita acompañantes, filipina y hotel, y edita la graduación;
  - Ventas recibe un rechazo de RLS;
  - Precios sigue editable para todo el equipo, como ya estaba.
- **Capturas** (no se suben): `graduacion-computadora.png`, `graduacion-celular.png` y `graduacion-celular-ficha.png`.

## Pendientes

- **Kits (Fase 3):** el conteo de filipinas todavía no incluye los kits pendientes. Se suma cuando exista la pestaña Kits.
- **Certificados (Fase 4):** PDF con la plantilla.
- **Sede de la graduación 2027:** queda por capturar en el Hub cuando se confirme.
