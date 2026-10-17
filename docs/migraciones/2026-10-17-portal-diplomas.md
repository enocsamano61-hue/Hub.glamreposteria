# 🎓 Página de diplomas para las alumnas — 17 oct 2026

**certificados.glamreposteria.com**: la alumna teclea su celular, confirma su nombre y descarga su diploma. Así nadie del equipo manda diplomas uno por uno por WhatsApp; eso saturaba el teléfono y arriesgaba que lo bloquearan.

- **Migraciones:**
  - `academia_11_portal_diplomas_tablas`;
  - `academia_12_portal_diplomas_clave`;
  - `academia_13_portal_diplomas_limite`;
  - `academia_14_portal_diplomas_anotar_y_reglas`;
  - `academia_15_portal_diplomas_publicas`.
- **Respaldos:** `respaldo.certificados_20261017` y `respaldo.certificado_plantillas_20261017`.
- **Código:**
  - `diplomas/index.html`: la página nueva;
  - `hub/certificados/pdf-certificado.js`: el armado del PDF, compartido con el Hub;
  - `hub/_headers`: CORS para `/certificados/*`;
  - `hub/index.html`.
- **Pruebas:** `pruebas/prueba_diplomas.js` (nueva) y `pruebas/prueba_academia_certificados.js`.

**Lo que se decidió (17 oct):**
1. Verificación con el **celular** y, como segunda verificación, que la alumna **confirme su nombre**.
2. Si el nombre está mal, la alumna escribe cómo debe ir y **Academia lo corrige**. A Tamar y Eliab les llega una tarea.
3. **Sin QR:** teclean la dirección en su navegador.
4. **Subdominio:** lo da de alta Enoc en Cloudflare. No hace falta otra rama: es una carpeta del mismo repo (ver abajo).
5. **Solo diplomas de la gira**, por ahora.

## Cómo funciona

1. **Celular:** acepta 10 dígitos, y también con `+52` o con espacios (se toman los últimos 10). Busca en el teléfono principal y en el alternativo.
2. **¿Eres tú?:** muestra el curso (ciudad y fecha) y el nombre **tal como sale en el diploma**, en sus 3 renglones y con la misma letra.
   - **"✓ Sí, soy yo y así va"** → se arma el diploma.
   - **"✏️ Soy yo, pero mi nombre está mal"** → escribe su nombre completo. Se guarda y les llega una tarea a Academia.
   - **"✗ No soy yo"** → vuelve a pedir el número.
   - Si el número aparece en dos cursos, sale una tarjeta por curso.
3. **Diploma:** se arma **en el teléfono de la alumna** con el mismo código que el Hub (`pdf-certificado.js`): mismo fondo, letras, nombre en 3 renglones y mes del curso.
   - Muestra una vista previa y los botones **Descargar** y **Guardar o compartir** (cuando el teléfono lo permite).
   - El archivo se llama `Diploma Nombre Apellidos.pdf`, sin acentos, porque algunos navegadores ignoran nombres de archivo con acentos. El diploma sí los lleva.
4. **Solo si ya le toca:** llegó al curso, liquidó y no tiene pagos "por confirmar" (la misma regla del Hub). Si no, le dice que pase con Recepción. En cuanto la liquidan, recarga y ya le sale.
5. **Qué cursos cuentan:** los del curso de la plantilla de gira (`certificado_plantillas.curso_id` = "LOS PASTELES MAS SABROSOS DE LA CHEF"), desde el día del curso. No vence.
6. **No se guarda un PDF por alumna.** Se anota que lo descargó (fecha y cuántas veces) y la inscripción queda con `certificado_entregado`.

## Seguridad

- **La página no lee ninguna tabla.** Solo puede usar tres funciones (`security definer`, para usuarios sin sesión):
  - `diploma_buscar(p_telefono)`: ciudad, fecha, nombre y si ya le toca, solo de inscripciones de ese celular;
  - `diploma_datos(p_telefono, p_inscripcion)`: la plantilla y el nombre; anota la descarga. Exige que el celular corresponda a esa inscripción;
  - `diploma_reportar_nombre(p_telefono, p_inscripcion, p_nombre)`: guarda el nombre pedido (3 a 80 letras) y crea la tarea.
- **Las funciones de apoyo no se pueden llamar sin sesión:** `diploma_clave`, `diploma_revisar_limite`, `diploma_anotar`, `diploma_listo` y `diploma_inscripciones`.
- **Límite de intentos** por conexión (IP que manda Cloudflare), en una ventana de 10 minutos:
  - 30 búsquedas sin resultado;
  - 600 consultas en total. Es alto a propósito: en un salón con Wi-Fi todas comparten IP.
  - La tabla `diploma_intentos` tiene RLS y no tiene permisos para nadie más.
- **Lo que hay que saber:** quien teclee el celular de otra alumna verá su nombre completo, como se decidió. Lo frenan el límite de intentos y que solo responde a números de alumnas que fueron a un curso.
- **La tarea para Academia:** su texto se pinta en el bloc sin escapar, así que solo lleva datos de la base, saneados. Lo que escribió la alumna va en "Comentario de sistema", que sí se escapa.

## Hub (Academia → Certificados)

- **Lista del curso:**
  - si la alumna lo descargó, sale **"Descargado · ⬇️ Lo descargó 14 oct (2 veces)"**;
  - si pidió otro nombre, sale **"✏️ Pidió que diga: «…»"** con el botón **"Usar este nombre"**, que lo guarda como nombre impreso;
  - la siguiente vez que entre a la página, ya le sale corregido.
- **Grupos:** la tercera columna ahora es **"entregados"**: mandados por WhatsApp o descargados por ella. "Generar pendientes" ya no cuenta a las que lo descargaron.
- **Bloc 📝:** las tareas del sistema (sin quién las asignó) cuentan como tarea, con el contador y sin "Te asignó…". **"Corregir nombre →"** abre Certificados en ese curso.
- **El armado del PDF** se movió de `hub/index.html` a `hub/certificados/pdf-certificado.js`, sin cambios en el resultado.
  - Se agregó `acomodarBloqueCert`, que la página usa para la vista previa.
  - El Hub lo carga con `?v=20261017`. Si se cambia el archivo, hay que subir ese número.

## Publicación (Cloudflare Pages)

La página vive en la carpeta **`diplomas/`** del mismo repo y rama `main`. Usa el fondo, las letras y el código del PDF que publica el Hub en `https://hub.glamreposteria.com/certificados/`, con CORS por `hub/_headers`. Así no hay copias que se desfasen.

**Pasos para Enoc** (segundo proyecto de Pages):
1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → repo `enocsamano61-hue/Hub.glamreposteria`.
2. **Production branch:** `main`. **Framework preset:** None. **Build command:** vacío.
3. **Build output directory:** `diplomas`.
4. *Save and Deploy*. Luego, en el proyecto → *Custom domains* → `certificados.glamreposteria.com`. El DNS lo crea Cloudflare solo si el dominio está en la misma cuenta.

## Pruebas

- **`prueba_diplomas` 26/26** (página nueva, base simulada):
  - número corto, no encontrado, límite de intentos, `+52`;
  - "¿Eres tú?" con 3 renglones;
  - diploma real (PDF de más de 500 KB con fondo y letras), vista previa vertical y descarga del archivo;
  - pago pendiente;
  - "mi nombre está mal" (manda el nombre limpio);
  - dos cursos;
  - celular sin scroll horizontal, y computadora.
- **`prueba_academia_certificados` 74/74:**
  - lo de antes;
  - "Descargado", "Pidió que diga" y "Usar este nombre";
  - tarea del sistema (contador, sin "Te asignó", texto de la alumna escapado);
  - "Ir →" que abre el curso.
- **Base real**, en una transacción que se deshizo, sin imprimir datos de nadie:
  - con el celular de una alumna real: 1 resultado y "ya le toca";
  - número inexistente: `[]`;
  - número corto y número de otra persona: rechazados;
  - datos: plantilla de 2 campos, hoja 595.5;
  - descarga anotada y `certificado_entregado`;
  - "nombre mal": 2 tareas, una para cada persona de Academia, con el texto saneado;
  - sin sesión no se usan las funciones de apoyo ni se lee `diploma_intentos`;
  - con 30 intentos fallidos, el límite frena.
- **PDF de la página revisado a ojo:** `pruebas/capturas/diploma-portal.pdf`, igual al del Hub.

## Nota técnica

El conector de Supabase se quedaba esperando cuando una migración traía un `delete` dentro de una función: se cortaba a los 60 s y no aplicaba nada. Por eso:

- la migración se dividió en cinco partes;
- `diploma_anotar` no borra intentos viejos. Solo se cuentan los últimos 10 minutos y la tabla crece unos pocos renglones por alumna.
