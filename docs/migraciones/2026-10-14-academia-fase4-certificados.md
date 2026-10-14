# 🎓 Academia · Fase 4: pestaña Certificados — 14 oct 2026

El Hub arma el PDF del certificado (gira) o del diploma (academia), lo guarda con un link permanente y lo manda por WhatsApp.

- **Migración:** `academia_07_certificados`.
- **Respaldos:** `respaldo.academia_generaciones_20261014` y `respaldo.inscripciones_20261014_certificados`.
- **Código:** `hub/index.html` y `hub/certificados/` (fondos, letra Great Vibes y su licencia OFL).
- **Pruebas:** `pruebas/prueba_academia_certificados.js`.

**Decisiones del 14 oct:**
1. **Gira:** reciben certificado las que Recepción marcó "llegó", y Academia puede agregar a mano a alguien más del curso.
2. **Folio:** ya se usa uno. Queda **editable** (prefijo, siguiente número y dígitos) para poner el número donde van; el Hub sigue la cuenta.
3. **Link (opción a):** permanente, con nombre aleatorio (imposible de adivinar).
4. **Programa** de cada generación y **segunda firma** del diploma: campos que Academia llena o corrige.
5. **Academia:** el diploma es para las alumnas con decisión "✅ Graduada".

## Supabase

- **`academia_generaciones.programa`:** columna nueva (sale en el diploma).
- **Tabla nueva `certificado_plantillas`** (una por tipo, `gira` y `academia`):
  - fondo, campos (texto con `{variables}`, x, y, tamaño, letra, alineación, ancho máximo, color) y textos fijos;
  - folio: prefijo, siguiente número y dígitos. **Arranca sin folio**: Academia lo configura.
- **Tabla nueva `certificados`:**
  - tipo, curso (`evento_id` + `inscripcion_id`) o alumna (`alumna_id`), nombre impreso, datos impresos, folio (único), estado (`pendiente` → `generado` → `enviado`), archivo y link;
  - una sola fila por inscripción o por alumna;
  - RLS solo Academia y admins, sin DELETE y con candado `no_borrar` / `no_vaciar`.
- **Función `siguiente_folio(tipo)`:** da el folio y avanza la cuenta en un solo paso (dos personas a la vez no reciben el mismo). Falla con un mensaje claro si el folio no está configurado. Solo para usuarios con sesión.
- **Bucket público `certificados`:** se lee con el link; solo Academia y admins suben archivos.

## Hub

- **Pestaña Certificados activa.** Arriba: **Cursos de la gira** / **Graduadas de la academia** y **⚙️ Plantilla y folio**.
- **Grupos:**
  - Gira: cursos ya pasados del curso activo, con asistieron / generados / enviados y barra de avance.
  - Academia: generaciones con graduadas, y su programa (o "Falta el programa").
- **Lista del grupo**, una fila por alumna:
  - **Nombre como se imprime** (editable; si ya estaba generado, avisa que hay que regenerar);
  - estado, folio y "Sin teléfono" si no tiene;
  - **📄 Generar** / **↻ Regenerar** (si ya se mandó, pide confirmación; conserva el folio y da otro link), **Ver PDF** y **💬** WhatsApp.
- **Botones del grupo:**
  - **📄 Generar los N pendientes:** uno tras otro; si algo falla (p. ej. falta el folio), se detiene y avisa.
  - **💬 Mandar los N links:** abre WhatsApp de una en una.
- **Al tocar "Abrir WhatsApp"** el certificado queda **Enviado** y, en la gira, la inscripción queda con `certificado_entregado`.
- **¿Falta alguien?** (gira): agrega a mano a alguien del curso sin "llegó" (no salen las que no van al curso ni las que perdieron anticipo).
- **Academia:** el **programa** de la generación se escribe ahí mismo; sin programa no se genera el diploma.
- **⚙️ Plantilla y folio:**
  - folio (muestra cuál sigue);
  - textos: curso (gira), lugar y fecha y segunda firma (academia);
  - vista previa con la posición de cada dato y una tabla para moverlos (x, y, tamaño, texto);
  - **🖼️ Subir otro fondo** (PNG o JPG) y **👁️ Vista previa en PDF**.
- **Cómo se arma el PDF:** en el navegador con pdf-lib 1.17.1 y fontkit 1.1.1 (se cargan solo al generar). Hoja carta horizontal. El nombre va en Great Vibes y los nombres largos se achican para caber. Un dato cuyo valor falta no se imprime (sin matrícula no sale "Matrícula").
- **El registro y el folio se guardan antes que el PDF:** si la subida falla, se reintenta con el mismo folio y el link anterior sigue sirviendo.
- **Mensajes de WhatsApp:** variable nueva **`{link}`**.
- **Actividad del equipo:** certificado generado, enviado, agregado a mano y cambios de plantilla o programa.

## Pruebas

- **`prueba_academia_certificados` 56/56:**
  - grupos y conteos;
  - aviso sin folio (crea el registro, no arma el PDF);
  - configurar folio;
  - generar uno (PDF real que empieza con `%PDF-`, nombre aleatorio, folio, datos);
  - mandar con `{link}` → Enviado y `certificado_entregado`;
  - agregar a mano;
  - generar todos con folios seguidos;
  - mandar todos uno por uno;
  - regenerar con confirmación sin gastar folio;
  - falla de subida;
  - plantilla (texto y posición);
  - academia (programa obligatorio, diploma con matrícula y generación, sin teléfono);
  - celular sin scroll horizontal.
- **PDF revisados a ojo:** `pruebas/capturas/certificado-gira.pdf` y `certificado-academia.pdf`.
- **Arreglo encontrado por la prueba:** si algo tronaba a media generación, la lista se quedaba bloqueada. Ahora se libera siempre.
- **Regresión en verde:** academia 46, graduación 46, kits 34, calendario 20, copiar 34, cursos e historial 40, ficha 52, humo 19 + 19, no llegaron 38, por confirmar 35, precios 28, recepción 66, tareas 14, VIP 23.
- **API real sin sesión:** las 8 consultas nuevas responden 200 (incluye el embed `personas!inscripciones_persona_id_fkey`). `siguiente_folio` sin sesión responde 401.
- **Base con usuarios reales**, en una transacción que se deshizo (al final: 0 certificados, folio sin configurar, 0 archivos):
  - Academia crea un certificado, saca folio, edita la plantilla y el programa, sube al bucket y marca la inscripción;
  - borrar un certificado no borra nada;
  - Ventas no ve certificados y se le rechaza crear, sacar folio y subir archivos.
- **Capturas** (no se suben): `certificados-computadora.png`, `certificados-plantilla.png` y `certificados-celular.png`.

## Pendientes

- **Academia:** configurar el folio de cada tipo (prefijo y número donde van) en "⚙️ Plantilla y folio".
- **Crear en Mensajes una plantilla con `{link}`**, por ejemplo: "Hola {nombre}, aquí está tu certificado: {link}".
- **Academia:** escribir el programa de cada generación y la segunda firma del diploma.
- **Fondos:** si se quiere usar el diseño oficial, se sube con "🖼️ Subir otro fondo" y se acomodan las posiciones.
