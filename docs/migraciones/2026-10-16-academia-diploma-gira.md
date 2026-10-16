# 🎓 Academia · Diploma oficial de la gira — 16 oct 2026

El certificado de la gira ahora es **el diploma que ya usan** (hecho en Canva): hoja vertical, solo el nombre y el mes.

- **Migraciones:** `academia_09_plantilla_hoja_y_folio` y `academia_10_diploma_gira`.
- **Respaldo:** `respaldo.certificado_plantillas_20261016` (las dos plantillas antes del cambio).
- **Código:** `hub/index.html`.
- **Archivos en `hub/certificados/`:**
  - `diploma-gira.jpg`: el diploma a 300 dpi con el mes borrado;
  - `Nickainley-Normal.ttf` y su licencia `Nickainley-Licencia-FF_EULA_ver2.2.pdf`;
  - `LibreBaskerville-Italic.ttf` y su licencia `OFL-LibreBaskerville.txt`.
- **Pruebas:** `pruebas/prueba_academia_certificados.js`.

**Lo que pidió Academia (16 oct):**
1. Solo el nombre: sin matrícula ni folio.
2. El nombre completo en **3 renglones, centrado**, en el recuadro bajo "Al alumno:", con la letra de "Diploma" (Nickainley).
3. El mes de abajo cambia cuando hace falta.
4. Solo para quien **llegó y pagó completo**, con los pagos **confirmados**. Las que se agregan a mano también tienen que estar liquidadas.
5. Sin folio en la gira.

## Licencia de las letras

- **Nickainley** (Seniors Studio, publicada gratis por Fontfabric), licencia FF EULA 2.2:
  - permite usarla como letra web (@font-face) y meterla en los PDF que se mandan a terceros;
  - prohíbe modificar el archivo de la letra y revenderlo. Por eso **va completa en el PDF**, sin recortarla.
- **Libre Baskerville Italic:** licencia OFL. Es la misma letra del mes en el diploma original.

## Cómo se arma el diploma

- **Fondo:** su PDF a 300 dpi. Solo se borró el renglón del mes, rellenando con el degradado de arriba y de abajo. Todo lo demás queda igual: firmas, sello, textos y "Duración 10 horas".
- **Nombre** (campo con `renglones: 3`):
  - va en nombre(s) / apellido paterno / apellido materno;
  - "de", "del", "la", "los"… van en minúscula y pegadas a la palabra que sigue ("de la Cruz" no se parte);
  - se mide la tinta real de cada renglón para centrar el bloque en su caja (232 × 83 pt, entre las dos líneas cafés, con aire arriba y abajo).
- **Mes:** Libre Baskerville Italic con espaciado entre letras, calibrado contra el original (mismo lugar, tamaño y ancho).
  - Sale del mes de cada curso ("OCTUBRE 2026").
  - Si se escribe otro en ⚙️ Plantilla → "Mes de abajo", se usa ese.
- **Revisiones antes de subir (para no mandar un diploma mal hecho):**
  - si el nombre trae una letra que la fuente no tiene (un emoji, por ejemplo), **no genera** y dice cuál;
  - si el nombre es tan largo que la letra quedaría de menos de 14 pt, **no genera** y pide acortarlo;
  - cada fila muestra **"Así sale: María Fernanda / López / García"**, y cambia al momento si se corrige el nombre;
  - el registro y el link no cambian si algo falla.
- **Peso:** cerca de 1 MB por diploma (fondo + letras completas).

## Supabase

- **`certificado_plantillas`:** columnas nuevas `ancho` y `alto` (tamaño de la hoja, en puntos) y `usa_folio`. Por defecto: carta horizontal con folio, como antes.
- **Plantilla `gira`:**
  - hoja 595.5 × 842.25 (A4 vertical), fondo `/certificados/diploma-gira.jpg`, `usa_folio = false`;
  - dos campos: nombre (Nickainley, café #774228, hasta 3 renglones) y mes (Libre Baskerville Italic);
  - `textos.mes` vacío.
- **Plantilla `academia`:** sin cambios.

## Hub

- **Gira, cursos que ya pasaron:** "listas" = llegaron y ya liquidaron con pagos confirmados, más las que se agregan a mano. Si hay quien llegó pero debe, el curso lo dice ("⏳ 2 aún no").
- **Lista del curso:**
  - las listas, con "Así sale" (cómo queda el nombre en 3 renglones);
  - aparte, **"⏳ Llegaron, pero todavía no les toca"**, con "Debe $…" o "🏦 Pago por confirmar". Pasan solas a la lista cuando liquidan.
  - **"¿Falta alguien?"** solo ofrece a las del curso que ya liquidaron.
- **Ya no pide folio** en la gira. La academia sigue con su folio.
- **⚙️ Plantilla:**
  - vista previa con la hoja vertical y el nombre en 3 renglones;
  - solo muestra los textos que la plantilla usa (en la gira, el mes);
  - en la gira no aparece el folio.
- El código del PDF sirve para cualquier tamaño de hoja y para datos en varios renglones. Si cambia el diseño, se sube otro fondo y se ajustan las posiciones.

## Revisión con datos reales (solo conteos, sin nombres)

- **Últimos 6 cursos:** todas las que llegaron ya están liquidadas y sin pagos por confirmar (Recepción cobra al llegar). Nadie queda fuera por error.
- **Largo de los nombres:** el más largo de quienes llegaron tiene 38 letras. En la prueba, uno de 47 letras ("María Guadalupe del Carmen Hernández de la Cruz") sale bien, con la letra a 21.7 pt.
- **Hay 2 nombres capturados con números:** uno trae un teléfono pegado y otro un "0". Saldrían impresos; se ven en "Así sale" para corregirlos antes de generar.

## Pruebas

- **`prueba_academia_certificados` 64/64:**
  - gira:
    - listas y "aún no" (debe / pago por confirmar);
    - agregar a mano solo liquidadas;
    - diploma real sin folio, con el mes del curso;
    - "Así sale" al corregir el nombre;
    - emoji y nombre demasiado largo, que no se suben;
    - WhatsApp con `{link}`, mandar todos, regenerar, falla de subida;
    - pasa sola a la lista al liquidar;
    - plantilla (sin folio, mes editable, vertical, posición);
  - academia: folio sin configurar y configurar, número negativo, programa obligatorio, diploma con matrícula;
  - celular.
- **Revisión a ojo:** los PDF que arma el Hub (`pruebas/capturas/diploma-gira.pdf` y `diploma-gira-largo.pdf`) se compararon con el original: nombre centrado entre las líneas y mes igual al de Canva.
- **Regresión:** todas en verde (15 archivos).
- **Sitio publicado** (con la plantilla ya en la base):
  - el diploma se arma sin errores con el pdf-lib del CDN y el fondo y las letras publicados;
  - comparado lado a lado con el PDF de Canva, sale igual, con el nombre en su recuadro;
  - en la vista previa de la pantalla cargan Nickainley y Libre Baskerville.
- **API real:** las consultas nuevas responden 200 (plantillas con `ancho`, `alto` y `usa_folio`; inscripciones con `pagos!pagos_inscripcion_id_fkey`).
