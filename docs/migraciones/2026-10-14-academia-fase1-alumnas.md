# 🎓 Academia · Fase 1: pestaña Alumnas — 14 oct 2026

Fase 1 de la sección Academia, para Tamar y Eliab: la lista de egresadas por generación con su ficha.
Sigue el mockup acordado (4 pestañas). Graduación, Kits y Certificados se ven como "pronto".

- **Migración:** `academia_04_fase1_alumnas`.
- **Respaldos:** `respaldo.permisos_rol_20261013_academia` (104 filas) y `respaldo.permisos_accion_20261013_academia` (3 filas).
- **Código:** `hub/index.html`.
- **Prueba:** `pruebas/prueba_academia.js`.

## Supabase

- **Vista `academia_pagos_resumen`** (`security_invoker`, respeta el RLS de quien consulta):
  - una fila por alumna con pagos, pagados, debe, por revisar y total pagado;
  - existe porque una generación pasa de 1,000 pagos (el límite por consulta de la API) y la lista necesita una fila por alumna;
  - sin sesión no responde (permiso quitado a `anon`).
- **`permisos_rol`:** sección `academia` para *Academia e Inbox*, *Sistemas*, *Dueña* y *Gerente*. Los admins la ven siempre.
- **`permisos_accion`:** nueva acción **`cobrar_academia`** (🎓 Cobrar en Academia) para *Academia e Inbox*. Aparece en Usuarios y permisos para dársela a otro rol.

## Hub

**Menú:** "Academia" después de No llegaron. También se agregó a `PERMISOS_POR_ROL_DEFAULT` de *Academia e Inbox*.

**Lista:**
- **Filtros:**
  - selector de generación: las 10, más "Todas las generaciones";
  - buscador por nombre del Excel, nombre en el Hub, ciudad o teléfono;
  - filtro de pagos: con "debe", con pagos por revisar, sin pagos.
- **Chips por decisión, con conteo:** Por contactar · Contactada · 🎓 Se gradúa · 📦 Kit · ⏭️ Espera · ❌ No quiere · ✅ Graduada · ⚠️ A revisar. Los chips en cero no se muestran.
- **Resumen:** N alumnas y cuánto han pagado a la academia.
- **Columnas:** alumna (⚠️ si está "a revisar"), ciudad, pagos de la academia y decisión.
- **Orden:** el del Excel (hoja y fila).
- **Tamaño:** muestra 200 y luego "Ver más". Trae todo por páginas de 1,000.

**Ficha:**
- **Datos:** generación, matrícula, ciudad, vendedora y sección del Excel ("DESERTORES", "TORREON AC 2026"…).
- **Aviso "a revisar":** dice por qué. Si el teléfono es de alguien con otro nombre, muestra el nombre que tiene en el Hub. **✓ Ya lo revisé** quita la marca.
- **Contacto:** teléfono, tel 2, correo y cumpleaños, con **💬 Enviar WhatsApp** (mensajes predeterminados) y **✏️ Datos de contacto** (el mismo formulario de siempre).
- **¿Qué decidió?** 7 botones. Muestra lo que decía la columna GRADUACIÓN del Excel. Se guarda al tocarlo.
- **Pagos de la academia:**
  - un cuadro por celda de pago: verde pagado, rojo debe, punteado por revisar, con marco si se registró en el Hub;
  - al tocar uno se ven su texto original, fecha y banco;
  - con permiso `cobrar_academia` se puede **corregir** (monto y estado) y **registrar un pago nuevo** (monto, forma, fecha, concepto; pide confirmación). El pago nuevo se guarda con `origen = 'hub'`.
- **🔒 Datos privados:** CURP, dirección, estado civil, redes y encuesta de ingreso. Solo se cargan al tocar "Mostrar" y solo llegan a Academia y admins (RLS).
- **Notas:** se guardan solas al salir del campo. Debajo, el comentario original del Excel.
- **Origen:** "Vino del Excel: hoja …, fila …".

**Actividad del equipo** registra:
- cambio de decisión (antes → después);
- nota;
- "ya lo revisé";
- pago registrado;
- pago corregido.

**Celular:** la lista oculta la columna Ciudad (está en la ficha). La ficha va debajo y la lista baja hasta ella al elegir una alumna.

La recarga del Excel (`scripts/academia/cargar_excel_academia.py`) **no pisa** lo que se edita aquí:
- decisión y notas;
- monto y estado de un pago cuyo texto no cambió;
- pagos con origen hub.

## Pruebas

- **`prueba_academia` 46/46:**
  - menú por rol (Academia sí, Ventas no, admin sí);
  - lista, filtros y chips;
  - ficha, "ya lo revisé", decisión y notas;
  - datos privados;
  - registrar pago (y sin monto no deja);
  - corregir pago;
  - error de la base;
  - todas las generaciones;
  - sin permiso de cobrar;
  - celular sin scroll horizontal.
- **Regresión en verde:** calendario 20, copiar 34, cursos e historial 40, ficha 52, humo 19 (Sistemas y Logística, ya recorre Academia), no llegaron 38, por confirmar 35, precios 28, recepción 65, tareas 14, VIP 23.
- **API real con la clave publicable, sin sesión:**
  - las consultas de generaciones, alumnas (con el embed `personas(...)`), pagos y datos privados responden 200;
  - la vista responde 401 sin sesión, a propósito.
- **Base con usuarios reales**, en una transacción que se deshizo: la vista da 1,328 filas y el mismo total pagado que las tablas, tanto para Academia como para Ventas. Lo sensible sigue cerrado por las tablas de la Fase 0.
- **Capturas:** `academia-computadora.png`, `academia-celular.png` y `academia-celular-ficha.png` en `pruebas/capturas/` (no se suben).

## Pendientes

- **Fase 2, Graduación:** asistentes, invitados, hotel, filipinas por talla y conceptos en Precios (etiqueta Academia).
- **Fase 3, Kits:** estados y guía. **Fase 4, Certificados:** PDF con la plantilla.
- **COPPYS de la academia → `mensajes_predeterminados`**, para que salgan en 💬.
- **Las 69 alumnas "a revisar"** las resuelve Tamar desde el chip ⚠️.
