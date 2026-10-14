# 🎓 Academia · Fase 3: pestaña Kits — 14 oct 2026

Kits a domicilio para quien no va a la graduación. Tablero por estado, ficha con cobro y seguimiento del envío.

- **Migración:** `academia_06_kits`.
- **Respaldos:** `respaldo.academia_kits_20261014` (44) y `respaldo.precios_20261014_kits` (3).
- **Código:** `hub/index.html`.
- **Pruebas:** `pruebas/prueba_academia_kits.js`.

**Decisiones del 14 oct:**
1. Los 44 kits del Excel arrancan en **"Del Excel · por clasificar"** y Tamar los acomoda con un toque.
2. El precio del kit es el de Precios ("Kit a domicilio") **y se puede ajustar en cada kit**. El envío se captura por kit.
3. Al liquidarse, el kit pasa **solo** a "Por preparar". "Enviado" y "Entregado" los marca Academia.
4. Solo se cuenta la filipina. **"Qué incluye el kit"** es un texto que Academia edita.

## Supabase

- **`precios.descripcion`:** columna nueva.
- **Precio nuevo "Kit a domicilio"** (`clave = 'kit_academia'`, área Academia, sin precio): Tamar le pone el precio desde Kits o desde Precios.
- **`academia_kits`:**
  - estados `por_clasificar`, `por_pagar`, `por_preparar`, `enviado`, `entregado` y `cancelado` (por defecto `por_pagar`);
  - columnas nuevas: precio (se congela al crear el kit), costo de envío, cantidad, filipina (talla, color, nombre), paquetería, fecha de envío y de entrega, `agregado_por`;
  - los 44 del Excel quedaron en `por_clasificar`;
  - la recarga del Excel no toca el estado ni lo capturado en el Hub.
- **Tabla nueva `academia_kit_pagos`** (concepto kit o envío): RLS solo Academia y admins, sin DELETE y con candado `no_borrar` / `no_vaciar`.

## Hub

- **Pestaña Kits activa.** Arriba:
  - buscador (nombre, ciudad, teléfono o guía) y **+ Crear kit** (buscador en todas las generaciones);
  - **precio del kit** y **qué incluye**, que se guardan en Precios.
- **Tablero:** Del Excel · por clasificar (solo si queda alguno) → Por pagar → Por preparar → Enviado → Entregado → Cancelados (solo si hay).
  - Cada tarjeta muestra alumna, generación, ciudad, filipina, lo que debe o "Liquidado", guía y el aviso del Excel ("PEDIR BLANCA XL"…).
  - El tablero va a todo lo ancho y la ficha debajo.
- **Ficha del kit:**
  - **Estado** con un toque. "Enviado" pide antes el número de guía, pone la fecha y ofrece mandar la guía por 💬 WhatsApp. "Entregado" pone la fecha.
  - **Cuenta:** precio del kit (editable) + envío = total, pagado y lo que debe. Pagos de kit o envío con "Liquida todo", confirmación y permiso **🎓 Cobrar en Academia**. Al quedar liquidado pasa solo a "Por preparar".
  - **Filipina:** talla, color, nombre a bordar y cantidad.
  - **🔒 Envío:** dirección, paquetería y guía.
  - **Lo que decía el Excel:** anticipo, filipina, pago, envío y situación. También notas, y **Cancelar** / **Reactivar** (nunca se borra).
- **Mensajes de WhatsApp:** variables nuevas **`{guia}`** y **`{paqueteria}`**, en la lista de ayuda de la sección Mensajes.
- **Desde Alumnas:** al marcar **📦 Kit**, el Hub ofrece crearle su kit. Al crear un kit desde Kits, su decisión pasa a "Kit".
- **Graduación → Filipinas para comprar:** suma también las filipinas de los kits **por pagar y por preparar** (por su cantidad), y el pedido copiado las marca como "kit".
- **Actividad del equipo:** kit creado, cambio de estado, pago, cambios de datos y "qué incluye".

## Pruebas

- **`prueba_academia_kits` 34/34:**
  - tablero y columnas;
  - clasificar un kit del Excel;
  - pago que liquida → "Por preparar";
  - filipina, cantidad, dirección y precio;
  - "Enviado" pide guía y el WhatsApp sale con `{guia}` y `{paqueteria}`;
  - cancelar y reactivar (nunca DELETE);
  - crear kit con precio del catálogo;
  - precio y "qué incluye" del catálogo;
  - sin permiso de cobrar;
  - "Kit" desde Alumnas;
  - filipinas de kits en Graduación;
  - celular sin scroll horizontal.
- **Regresión en verde:** academia 46, graduación 46, calendario 20, copiar 34, cursos e historial 40, ficha 52, humo 19 (Sistemas y Logística), no llegaron 38, por confirmar 35, precios 28, recepción 66, tareas 14, VIP 23.
- **`prueba_recepcion`:** en una corrida completa falló una vez la verificación "dice que sí se registró, sin Reintentar", que esperaba 300 ms fijos. Sola pasó 3 de 3. Ahora espera a que aparezca el aviso (máximo 5 s). No es un cambio del Hub.
- **API real sin sesión:** las 5 consultas nuevas o cambiadas responden 200.
- **Base con usuarios reales**, en una transacción que se deshizo: Academia edita un kit y registra un pago; Ventas recibe un rechazo de RLS.
- **Capturas** (no se suben): `kits-computadora.png`, `kits-celular.png` y `kits-celular-ficha.png`.

## Pendientes

- **Tamar:** ponerle precio al kit y clasificar los 44 kits del Excel.
- **Crear en Mensajes una plantilla con `{guia}`**, por ejemplo: "Hola {nombre}, tu kit va por {paqueteria} con guía {guia}".
- **Fase 4, Certificados:** PDF con la plantilla, link y envío por WhatsApp.
