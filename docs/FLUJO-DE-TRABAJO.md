# Reporte para Codex: cómo se trabaja en Glam y cómo está armado todo

Fecha: 19 oct 2026. Escrito por Claude (sesión de desarrollo del Hub) para que Codex
**no empiece de cero**. Todo lo de aquí se verificó contra el repositorio y contra Supabase
el mismo día; donde algo es estimado o no se pudo comprobar, lo dice.

> **Corregido el 20 oct 2026** después de la auditoría de Codex: `siguiente_folio` **sí** valida el rol;
> los candados contra borrado **no** están en todas las tablas; a Anthropic **sí** puede llegar texto privado
> si alguien lo escribe; y se agregó Academia Glam. Ver `docs/migraciones/2026-10-20-academia-glam-fase1.md`.

> **Actualizado el 21 oct 2026** con lo de los días siguientes:
> - Academia Glam 1b y 1c;
> - la paleta C y la letra nueva del diploma de gira;
> - la lista de alumnas por ciudad;
> - el embudo por curso;
> - el proceso de venta;
> - cómo trabajan juntos Claude y Codex (sección 0).

> **Regla de oro (léela dos veces):** en este proyecto **nada se construye sin que Enoc diga
> "permitido generar"**. Leer, hacer SELECT y diagnosticar es libre. Escribir código, migraciones,
> datos o publicar, no.

---

## 0. Trabajo en equipo: Claude + Codex (desde el 21 oct 2026)

En el Hub trabajan dos agentes. Para no pisarse:

| | Claude | Codex |
|---|---|---|
| **Rama** | `claude/…` | `codex/<tema>`, siempre creada desde el `main` más reciente |
| **Base de datos (Supabase)** | Sí: SQL, migraciones, respaldos, pruebas en transacción | **No.** Si un cambio la necesita, escribe el SQL en el documento de la fase y Enoc se lo pasa a Claude |
| **Publicar a `main`** | Sí, cuando Enoc lo pide (cherry-pick, ver 3.2) y revisando el sitio vivo | **No.** Entrega por Pull Request |
| **Publicar Glamy** (`deploy_edge_function`) | Sí, es el único | Solo edita `manual.ts` en su rama; Claude lo publica |
| **Le conviene** | Fases con base de datos, análisis con datos reales, publicar | Auditorías de solo lectura, pantallas sin base, pruebas, documentación |

Reglas:
1. **Un agente por fase.** Dos agentes no editan a la vez la misma sección de `hub/index.html`, porque es un solo archivo y chocan.
2. **El "permitido generar" es por agente y por fase.** El que Enoc le da a uno no vale para el otro.
3. **Cada uno deja su documento** en `docs/migraciones/`, y el otro lo lee antes de empezar.
4. **Secretos:** Codex no recibe ninguno (ni `service_role` ni la llave de Anthropic).
5. **Entorno de Codex:**
   - Script de preparación: `npm install -g playwright@1.56.1 && npx playwright install --with-deps chromium`.
   - Pruebas: `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js`. Corren sin internet.

---

## 1. Qué es esto, en 60 segundos

**Glam Repostería** es una escuela de repostería que da cursos presenciales en gira por ciudades de
México ("Los Pasteles más sabrosos de la Chef", Chef Perla Ahumada) y tiene una **Academia** con
generaciones de alumnas. Tres personas son administradoras: **Enoc** (dueño del desarrollo y quien
da las órdenes), **Jared** y **Perla**.

Los sistemas:

| Sistema | Qué es | Dónde vive | Quién lo usa |
|---|---|---|---|
| **El Hub** | CRM y operación: leads, inscripciones, pagos, cobranza, recepción del curso, calendario, giras, logística, Academia, reportes, mensajes de WhatsApp | `hub/index.html` → **hub.glamreposteria.com** | Todo el equipo, por rol |
| **Portal de diplomas** | La alumna baja su diploma de la gira con su celular | `diplomas/index.html` → **certificados.glamreposteria.com** | Alumnas (público) |
| **Glamy** | Asistente con IA dentro del Hub (Claude Haiku 5.5) | `supabase/functions/glamy/` (Edge Function) + el cupcake en el Hub | Todo el equipo |
| **Base de datos** | Postgres en Supabase, con RLS, vistas, triggers y funciones | Proyecto Supabase `bomlszsnixazhnsegeik` | Todo lo anterior |
| **Pruebas** | Playwright sobre el Hub real con una base en memoria | `pruebas/` | Quien desarrolla |

No hay framework, ni bundler, ni `package.json` en la raíz: **el Hub es UN archivo HTML**
(~13,700 líneas, ~480 funciones, con CSS, HTML y JavaScript) que habla directo con Supabase desde el navegador.

---

## 2. Arquitectura

```
Navegador ──► Cloudflare Pages (hub/ = raíz del sitio) ──► hub.glamreposteria.com
   │                    └─ 2.º proyecto Pages (diplomas/) ──► certificados.glamreposteria.com
   │
   └──► Supabase (bomlszsnixazhnsegeik)
          ├─ Postgres + RLS (104 políticas, 27 funciones, 9 vistas, 53 triggers en public)
          ├─ Auth (correo y contraseña; el Hub pide cambiar la contraseña en el primer ingreso)
          ├─ Realtime (eventos, inscripciones, leads, notas_usuario, personas)
          └─ Edge Function `glamy` ──► API de Anthropic (Claude Haiku 5.5)
```

- **Sitio publicado:** Cloudflare Pages con la raíz en **`hub/`**. Por eso los archivos van como
  `/certificados/...` y **no** `/hub/certificados/...` (error que ya costó una migración, la
  `academia_08`). `hub/_headers` abre CORS en `/certificados/*` porque el portal de diplomas
  (otro dominio) usa los fondos, la letra y `pdf-certificado.js` desde ahí.
- **Clave pública** (`sb_publishable_…`) va en el HTML a propósito: es pública por diseño; la
  seguridad la da RLS.
- **Secretos:** solo viven en Supabase → Edge Functions → Secrets (`ANTHROPIC_API_KEY`; las de
  Supabase vienen solas). **Nunca** en el repo ni en el chat.
- **Dos "capas" de permisos** (importante):
  1. **RLS en la base**: es amplia (cualquier usuario autenticado lee casi todo).
  2. **Secciones por rol en el Hub** (`permisos_rol`, `permisos_accion`, `es_admin`,
     `puede_ver_actividad`, `recibe_pedidos`): decide qué ve cada quien **en la pantalla**.
     Cuando algo es sensible hay que reforzarlo **en la base** (ejemplo: `academia_datos_privados`
     solo para Academia y admins) y no solo esconder el botón.

---

## 3. Mi flujo de trabajo (el proceso que se sigue en cada cambio)

### 3.1 Las fases, siempre en este orden

```
idea → lluvia de ideas → confirmar → plan (roadmap) + "¿qué pasa si…?" → maqueta → "permitido generar"
  → construir → probar (+ historias y vigilante) → documentar → publicar → avisar
```

1. **Idea y lluvia de ideas.** Enoc cuenta qué quiere. Se le hacen preguntas cortas y numeradas
   (él contesta "1 - sí / 2 - a…"). Se le dan **opciones con recomendación**, no encuestas largas.
2. **Confirmar.** Se repite lo entendido y las decisiones tomadas.
3. **Plan.** Qué tablas, qué pantalla, qué se prueba, qué se publica. Incluye las respuestas de
   **"¿qué pasa si…?"** (sección 3.9 y `docs/plantilla-fase.md`): si alguna no tiene respuesta, la fase no se construye.
4. **Maqueta** (si hay pantalla): imagen con datos inventados (HTML + captura con Playwright).
   Él elige o corrige.
5. **"permitido generar".** Sin esto no se toca nada. **Cada fase pide el suyo**; uno anterior
   no vale para la siguiente.
6. **Construir**, **probar**, **documentar**, **publicar**.

Mientras no haya permiso: se puede leer código, consultar Supabase (SELECT), analizar archivos,
armar maquetas en el scratchpad y proponer.

### 3.2 Ramas y publicación

- Se trabaja en la rama asignada y se hace push ahí:
  - Claude: `claude/ecstatic-pasteur-2saaae`;
  - Codex: `codex/<tema>`, entregando por PR (ver sección 0).
- **`main` es producción**: un push a `main` se publica solo en hub.glamreposteria.com
  (Cloudflare). **No hay ambiente de pruebas.** Por eso: pruebas en verde antes, y solo con permiso.
- Procedimiento usado para subir a `main` sin mezclar historias:
  ```bash
  git fetch origin main
  git branch -f tmp-main origin/main && git checkout tmp-main
  git cherry-pick <commit>            # el commit ya probado en la rama de trabajo
  git push origin tmp-main:main
  git checkout <rama-de-trabajo> && git branch -D tmp-main
  ```
- **Después de publicar, se verifica el sitio vivo** con un sondeo (`curl` cada 15 s hasta que
  aparece un texto del cambio nuevo; tarda ~1 min). Si se puede, además se abre con Playwright.
- Mensajes de commit en español, claros, con lista de qué cambió.
- **No se crean PRs** a menos que Enoc lo pida.

### 3.3 Reglas que no se negocian

1. **Nunca se borra nada.** `eventos`, `inscripciones`, `pagos`, `leads`, `personas` (y las tablas
   nuevas) tienen **candados** (`no_borrar_*`, `no_vaciar_*`) que rechazan DELETE/TRUNCATE. Lo que
   sobra se **mueve** o **cambia de estatus**. Saltar el candado
   (`SET LOCAL glam.permitir_borrar = 'si'`) exige autorización explícita.
2. **Ningún dato personal en el repositorio** (nombres, teléfonos, CURP, direcciones, montos
   individuales). Las listas con nombres se entregan como archivo aparte desde el scratchpad.
   Las pruebas usan solo datos inventados ("Alumna Prueba Uno", "0000000000").
3. **No tocar** `logistica_cursos`, `giras`, `gira_paradas`.
4. **Respaldo antes de migrar:** copia de la tabla en el esquema `respaldo` con nombre
   `tabla_AAAAMMDD` (a veces con sufijo de fase), **y luego** una migración con nombre.
5. **Dinero:** nunca se confirma ni se cobra automáticamente. Glamy, por ejemplo, **solo consulta**.
6. **Secretos fuera del chat y del repo.**

### 3.9 Que no vuelva a pasar (28 oct 2026)

Casi todas las fallas de octubre fueron la misma: **la misma información en dos lugares que se
desincronizan** (Embudo vs Cobranza, Glamy sin los datos del cambio de fecha, inscritas sin lead, dos cajas de
comentarios, la lista del cambio de fecha como foto del día del cambio). Cada función se pensó con los datos de
ese día; las alumnas se mueven (pagan, se cambian de curso, ceden su lugar, las capturan tarde). Por eso:

1. **Nada de fotos.** Ninguna lista, número o estado se guarda como foto de un momento. Se calcula del estado
   de hoy. Si algo se tiene que guardar porque alguien lo marca a mano (p. ej. "Aceptó"), la base lo mantiene al
   día sola cuando la persona cambia (trigger o función de sincronía, como `cambio_fecha_sincronizar`). Un número
   que se ve en dos lugares (Hub, Glamy, Glamy BI) sale de la misma función de la base.
2. **"¿Qué pasa si…?" en cada fase**, antes del "permitido generar" (plantilla en `docs/plantilla-fase.md`).
   Qué pasa con lo nuevo si la persona: (1) la capturan tarde, (2) el lead paga y queda inscrita, (3) su pago no
   se encontró, (4) se cambia de curso, (5) cede su lugar, (6) no va / pide reembolso / pierde su anticipo,
   (7) su curso cambia de fecha, (8) tiene dos cursos o dos teléfonos, (9) su curso ya pasó, y (10) ¿Glamy,
   Glamy BI, el Embudo y Cobranza lo cuentan igual?
3. **Historias completas** (`pruebas/historias/historias.sql`): recorren de punta a punta contra la base real y
   lo deshacen todo al final (lead → pago → confirmar; "No se encontró"; cambio de curso; ceder lugar; lead
   tardío en un curso con cambio de fecha; reembolso). En cada paso revisan el Embudo y la lista del cambio de
   fecha; al final de cada historia, las reglas rojas del vigilante. **Las corre Claude antes de cada
   publicación**: deben salir `HISTORIAS fallas=0`. Si una fase cambia uno de esos recorridos (o agrega otro),
   se actualiza el archivo; Codex escribe la historia nueva en el doc de su fase y Claude la corre.
4. **Vigilante diario** (`vigilante_calcular` / `vigilante_revisar`, tabla `vigilante_resultados`, cron
   `vigilante-diario` 5:41 México). Reglas **rojas** = errores del Hub (deben estar en 0; antes de publicar
   también): inscrita fuera de la lista de su cambio de fecha, inscrita sin lead, lead "Inscrita" sin su
   inscripción (salvo que cedió su lugar), inscrita dos veces en el mismo curso, liquidada que debe (o al revés),
   Embudo que no cuenta igual que la base, Glamy que no cuenta igual que la base o la lista. Reglas
   **amarillas** = datos que limpia el equipo (inscritas sin vendedora, leads sin curso, pagos que no cuadran,
   pago doble, "Pago por confirmar" sin datos, lead abierto de una inscrita, teléfono repetido). Enoc lo ve en
   su **Inicio → Reporte del día**. **Cuando aparezca un tipo de falla nuevo, se agrega su regla.**

### 3.4 Convenciones de código (para que lo nuevo se vea igual que lo viejo)

- **Comentarios en español.** Cada bloque grande del Hub empieza con un banner
  `/* ===== NOMBRE — qué hace ===== */`. Para ubicarte: `grep -n "^/\* =====" -A1 hub/index.html`.
- **Siempre escapar** lo que viene de datos: `escHtml(x)` para texto y `escapeAttr(x)` para atributos.
  No existe `innerHTML` con datos sin escapar.
- **Reutilizar** lo que ya existe antes de escribir algo nuevo:
  `toast`, `registrarActividad(accion, detalle)` (bitácora; agregar la etiqueta en `ACCION_LABEL`),
  `abrirModalInscripcion(id)`, `abrirModalLead(id)` (necesita `leadsCache`, `cargarLeads()`),
  `setActiveSection(id)`, `seccionesPermitidas()`, `puede('accion')`,
  `preguntarConfirmacion({titulo, aviso, textoSi, pedirMotivo})` (devuelve `null` si cancelan),
  `abrirEnviarWhatsApp({telefono, nombre, personaId, leadId, alEnviar})` (deja la interacción),
  `exportarCSV(archivo, encabezados, filas)`, `alCerrarTodasLasFichas(cb)`,
  `fetchTodasFilas(...)` (paginación), `hoyISO`, `sumarDias`, `diasEntre`, `fechaCorta`, `fmtMoney`,
  `tituloCaso`, `normTexto`, `debeDe(insc)`, etc.
- **Funciones de la base que regresan muchas filas** (`plaza_personas`, `embudo_cursos`): se piden por
  páginas con `.range(desde, desde + 999)`, porque la API no regresa más de 1,000 por consulta.
- **Secciones nuevas:** una entrada en `SECCIONES`, un `<div class="view" id="view-ID">`, y su
  `renderX()` llamado desde `setActiveSection`. Si no debe repartirse por rol (como `actividad`,
  `usuarios`, `glamy`), se excluye de `SECCIONES_ASIGNABLES_POR_ROL` y se gobierna en
  `seccionesPermitidas()`.
- **Tareas del bloc (📝)**: `notas_usuario` con `de_sistema`, `nota_sistema` y `enlace` (jsonb:
  `{vista, inscripcion|lead|evento|ciudad|cert_evento|pedido|agl_susc, etiqueta}`); `irAEnlaceNota` lo abre.
  **El texto de la tarea se pinta sin escapar**: si lo genera la base, se sanea ahí (ver `agl_revisar_accesos`).
- **Botones flotantes:** el bloc 📝 abajo a la izquierda, Glamy 🧁 abajo a la derecha; ambos se
  ocultan en Recepción (`body.en-recepcion`).
- **Paleta C "rosa claro"** (oct 2026, reemplazó a la B fucsia/morado/azul): usar variables CSS
  (`--wine` = frambuesa `#B23C6C`, `--wine-dark` = frambuesa oscuro `#8E2F57`, `--champagne` =
  rosa de adorno `#E296B0`, `--barra-1`/`--barra-2`/`--sobre-barra` para la barra lateral rosa
  pastel con letra oscura, `--ambar` para estados de "pendiente", `--wine-rgb` para tintes).
  Los **nombres de variable no cambian** (`--wine` ya no es vino). Las gráficas (Chart.js)
  llevan los colores escritos, no leen CSS. Ver `docs/migraciones/2026-10-20-paleta-c-y-letra-diploma.md`.
- **Móvil y escritorio:** se revisa con capturas a **1200 px y 390 px**.

### 3.5 Base de datos: cómo se cambia

- Cada cambio es una **migración con nombre** (`modulo_NN_descripcion`) aplicada con
  `apply_migration` (herramienta MCP de Supabase), **después** del respaldo.
- Patrones usados: `security invoker` por defecto; `security definer` solo si es indispensable y con
  `set search_path = ''`; RLS siempre activo; candado contra borrados en toda tabla de negocio **nueva**. Ojo: no todas las tablas viejas lo tienen (22 con candado DELETE y 21 con TRUNCATE al 20 oct; sin candado, entre otras, `notas_usuario`, `precios`, `permisos_*`, `usuarios`, `ciudades`, `cursos`, `sedes`). Revísalo con `pg_trigger` antes de suponerlo.
- **Funciones públicas para el portal** (`diploma_*`): `security definer` a propósito, con límite
  de intentos (`diploma_intentos`) y confirmación por teléfono.
- **Trampas conocidas del MCP de Supabase:**
  - `apply_migration` y `execute_sql` **se cuelgan (60 s) sin aplicar nada si el SQL contiene
    `DROP` o `delete from`**. Solución: en vez de borrar una función, quitarle permisos (`revoke`) y
    crear una versión nueva (sobrecarga con otro parámetro, o un nombre nuevo como `agl_candidatas_v3`).
  - **Para probar una migración sin dejar rastro:** un bloque `do $$ … $$` que cambia de usuario
    (`set_config('request.jwt.claim.sub', …)` y `set local role authenticated`) y termina con
    `raise exception 'RESULTADO: …'`, que regresa el resultado y deshace todo.
  - Ambigüedad de llaves foráneas en PostgREST (error **PGRST201**): hay que nombrar la relación
    (`pagos!pagos_inscripcion_id_fkey`). Una consulta nueva **se prueba contra la API real**, no
    solo con el stub de pruebas (ver `docs/migraciones/2026-09-23-flujo-de-pago-y-permisos.md`).
  - `list_tables` muestra conteos **estimados** (algunas tablas con datos salen en 0). Para cifras
    reales usar `select count(*)`.

### 3.6 Pruebas

- **Playwright** con Chromium en `/opt/pw-browsers/chromium`. Si Node no encuentra `playwright`:
  `NODE_PATH=$(npm root -g) node pruebas/prueba_X.js`.
- **Todo corre con** `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js` (al 21 oct: **23 archivos,
  todos en verde**).
- `pruebas/arnes.js` abre `hub/index.html` con las librerías locales (`pruebas/vendor/`) y cambia
  `sb.from` por una **base en memoria**; `window.__rpc = { fn: args => data }` simula RPCs (acepta `.range()`);
  `h.ops(tabla,'update')` revisa lo que el Hub mandó. Nada sale a Supabase.
- **Lo que el arnés NO detecta:** llaves foráneas, RLS, caché de esquema de la API, funciones SQL.
  Eso se prueba **a mano contra la API real** (consulta con `curl` + clave pública, o SQL).
- Cada prueba: pasos numerados, `h.check(condición, mensaje)`, capturas en `pruebas/capturas/`
  (esa carpeta no se sube) y una fila en `pruebas/README.md`.
- El portal de diplomas se prueba servido desde un origen https falso (las descargas no funcionan
  desde `file://`).

### 3.7 Documentación

- Cada cambio deja `docs/migraciones/AAAA-MM-DD-tema.md` con: qué se pidió, qué cambió, migraciones,
  decisiones, pruebas y qué **no** cambió a propósito.
- Guías vivas:
  - `docs/guia-actualizar-hub-desde-excel.md` y `docs/GUIA_ACTUALIZAR_DESDE_DRIVE.md`: cómo
    sincronizar el Hub con los Excel del Drive **sin perder dinero ni borrar nada**.
  - `pruebas/README.md`: cómo escribir pruebas y qué cubren.
  - `docs/proceso-de-venta.md`: el proceso de venta, de lead nuevo a alumna inscrita (lo explica Glamy).
- **`AGENTS.md`** en la raíz: las reglas cortas que Codex lee solo.

### 3.8 Cómo comunico los resultados a Enoc

- Español, directo, sin tecnicismos; resumen de **qué cambió / qué probé / qué NO pude probar / qué
  le toca a él**.
- Para WhatsApp del equipo: textos **cortos, en 3–4 mensajes**, con emojis moderados.
- Cuando algo requiere acción suya (Cloudflare, consola de Anthropic, etc.) se le dan los pasos
  numerados.

---

## 4. Mapa del Hub (`hub/index.html`)

Secciones y su rol visible (las secciones se reparten por rol desde "Usuarios y permisos"):

| Sección (`id`) | Qué hace |
|---|---|
| Inicio (`inicio`) | Resumen, indicadores y "Tus pendientes" |
| Alumnos y Leads (`board`) | Tablero kanban de leads por estatus; ficha del lead; reportar pago; inscribir |
| Historial cliente (`historial`) | Buscar a cualquiera por nombre/teléfono; juntar duplicados |
| Cursos (`cursos`) · Ciudades/Plazas (`plaza`) | Curso → ciudad → alumnas. Ciudades trae además **"Todas las alumnas de esta ciudad"** (histórico sin repetir, filtros, WhatsApp, registrar contacto en `interacciones`, CSV; función `plaza_personas`) |
| Giras (`giras`) · Logística (`logistica`) | Constructor de ruta; sedes, negociaciones, cupo (**no tocar sus tablas**) |
| Ventas (`ventas`) · Reportes (`reportes`) | Ingresos, asesores, embudo; resumen ejecutivo y CSV |
| Cobranza (`cobranza`) | Pestaña **Por cobrar** (a quién cobrar y cuándo; WhatsApp). Pestaña **📊 Embudo por curso**: gira activa de hoy en adelante, cada alumna en un grupo (liquidada, con anticipo, sin confirmar, promesa vigente, promesa vencida, sin respuesta; "no van" aparte), alertas, filtro por vendedora y reporte para WhatsApp (función `embudo_cursos`) |
| No llegaron (`nollegaron`) | Recuperar o cerrar el caso de quien pagó anticipo y no llegó |
| Academia (`academia`) | 4 pestañas: Alumnas, Graduación, Kits, Certificados |
| Academia Glam (`academia_glam`) | Alumnas de la Academia que pagan por mes o liquidan con abonos: Cobros (promesas, seguimiento, dar o retirar acceso), Alumnas (ficha), Planes y Generaciones. **Todavía sin alumnas activadas**: faltan respuestas de Jared (ver sección 8) |
| Mensajes (`mensajes`) · Precios (`precios`) | Plantillas de WhatsApp con variables; lo que se cobra aparte |
| Calendario (`calendario`) → **Recepción** | Cursos por fecha. La hoja del día de los cursos de hoy en adelante trae el **embudo del curso** y "en camino". La Recepción es la pantalla del día del curso (cobrar, marcar llegada, VIP, cerrar) |
| Actividad del equipo (`actividad`) | Checador y bitácora (solo admins o con permiso) |
| Usuarios y permisos (`usuarios`) | Solo admins: roles, secciones y acciones |
| **Glamy** (`glamy`) | Solo quien recibe tickets (Enoc): 📊 Uso y 🎫 Tickets |
| Bloc 📝 (botón flotante) | Notas personales y tareas (incluidas las de sistema, con "Ir →") |

Roles que existen en `permisos_rol`: Academia e Inbox, Cobranza, Coordinadora, Dueña, Gerente,
Logística, Sistemas, Ventas, Ventas coordinadora. Acciones aparte (`permisos_accion`):
- `confirmar_pagos`: Cobranza, Gerente y **Ventas** (al 21 oct);
- `cobrar_academia`: Academia e Inbox;
- `ver_todo_academia_glam`: Cobranza y Academia e Inbox.

**Flujo del dinero** (lo más delicado): lead ⚪ → pago reportado 💜/🏦 *por confirmar* → ✅ confirmado
(quien tiene `confirmar_pagos`) → inscripción liquidada. `debeDe(insc)` calcula lo que debe;
"liquidado" exige `debe = 0` **y** ningún pago por confirmar. Los diplomas de la gira solo se
generan a quien llegó y liquidó con pagos confirmados.

**Qué cuenta como inscrita:** tener una fila en `inscripciones` para ese curso, es decir, salir en el
Calendario. Se crea al **confirmar el pago** del lead (o con "Inscribir (pago ya confirmado)") o
desde la carga del Excel.
- Un lead en "Pago por confirmar" **no** está inscrito.
- El estatus del lead "Inscrita (anticipo confirmado)" (antes "Pagó el curso", clave `pagado`, id 12) significa *anticipo confirmado e inscrita*, **no** liquidada.
- El proceso completo está en `docs/proceso-de-venta.md`.

**Certificados:** `hub/certificados/pdf-certificado.js` arma el PDF **en el navegador** (pdf-lib +
fontkit) y lo comparte el Hub y el portal. Las fuentes se incrustan **completas** (`subset:false`:
la licencia de Nickainley prohíbe modificarla y el subconjunto perdía letras). La plantilla vive en
`certificado_plantillas` (posiciones, tamaños, fondo).

El diploma de la gira lleva el nombre en 3 renglones y el mes, sin folio:
- desde el 20 oct, el nombre va **en mayúsculas con Barlow Semi Condensed** (licencia OFL; campo `mayusculas: true`);
- el diploma de Academia sigue con Great Vibes.

---

## 5. Inventario de la base de datos (Supabase)

> Cifras de objetos: las de políticas/funciones/triggers son exactas (consulta del 19 oct). Los
> conteos de filas que muestra `list_tables` son estimados y varios salen en 0 aunque hay datos.

| Grupo | Tablas (esquema `public`) |
|---|---|
| **CRM base** | `personas` (decenas de miles: histórico), `leads`, `inscripciones`, `pagos`, `interacciones`, `eventos`, `ciudades`, `cursos`, `estatus`, `estatus_tonos_alternos`, `personas_separadas`, `ladas` (477) |
| **Sin uso aparente** | `asesores` (reemplazada por `usuarios`), `comisiones`, `secuencia_nurture` |
| **Logística y gira** | `sedes`, `sedes_contactos`, `logistica_cursos`, `giras`, `gira_paradas`, `personal_apoyo` |
| **Equipo y permisos** | `usuarios`, `sesiones_usuario`, `actividad_usuario`, `permisos_rol`, `permisos_accion`, `notas_usuario` |
| **Mensajes y precios** | `mensajes_predeterminados`, `precios` |
| **Academia** | `academia_alumnas`, `academia_datos_privados` (CURP, dirección… solo Academia/admins), `academia_pagos`, `academia_generaciones`, `academia_graduaciones`, `academia_graduacion_asistentes`, `academia_graduacion_pagos`, `academia_kits`, `academia_kit_pagos`, `academia_hotel`, `academia_prospectos`, `academia_contenido`, `academia_excel_archivos`, `academia_excel_celdas` (copia exacta del Excel), `academia_carga_llave` |
| **Academia Glam** | `academia_glam_planes`, `academia_glam_suscripciones`, `academia_glam_mensualidades`, `academia_glam_abonos`, `academia_glam_seguimientos`, `academia_glam_generaciones`. Todo se escribe por funciones `agl_*` (las tablas son de solo lectura para la API) |
| **Certificados** | `certificado_plantillas`, `certificados`, `diploma_intentos` |
| **Glamy** | `hub_pedidos` (= **tickets**), `glamy_uso`, `glamy_prueba_llave` |
| **Tutorial (ya retirado de la pantalla)** | `tutorial_faq` (**sigue en uso**: Glamy la lee), `tutorial_spotlight`, `tutorial_pasos`, `tutorial_vistas_vistas`, `tutorial_pasos_completados` |
| **Respaldos** | Esquema `respaldo`: ~50 copias `tabla_AAAAMMDD`. No son accesibles desde la API (`anon` y `authenticated` no tienen USAGE en ese esquema) |

Vistas importantes: `vista_resumen_ciudad_gira`, `vista_curso_ciudades`, `vista_resumen_plaza`, y
las de cobranza e histórico. Funciones propias de Glamy: `glamy_secciones`, `glamy_buscar_persona`,
`glamy_curso`, `glamy_proximos_cursos`, `glamy_mis_tareas`, `glamy_debe`, `glamy_sin_acentos`
(todas `security invoker`, respetan RLS y las secciones del rol).

Funciones de lectura más recientes (`security invoker`):
- `plaza_personas(ciudad)`: Ciudades → todas las alumnas.
- `embudo_cursos(curso, desde, evento)`: el embudo por curso.

Academia Glam usa funciones `agl_*` (`security definer`, que revisan el permiso por dentro):
- `agl_activar`, `agl_activar_abonos`;
- `agl_registrar_pago`, `agl_registrar_abono`;
- `agl_seguimiento`;
- `agl_dar_acceso`, `agl_retirar_acceso`, `agl_revisar_accesos`;
- `agl_candidatas_v3`, `agl_config_generacion`;
- entre otras.

Historial: **~100 migraciones** (`list_migrations`), de `corregir_montos_corruptos…` (4 sep) a
`glamy_06_tickets` (19 oct). Los prefijos cuentan la historia: `fase*` (cargas del Excel de la gira),
`vendedores_*`, `notas_*`, `ciudades_*`, `flujo_pagos_*`, `cobranza_*`, `ladas_*`, `precios_*`,
`recepcion_*`, `no_llegaron_*`, `pagos_verificacion_*`, `historico_*`, `excel_20261013_*`,
`academia_01…15`, `glamy_01…06`, `academia_glam_00…10`, `plaza_personas_seguimiento`,
`certificados_letra_nombre_gira_barlow` y `embudo_cursos` (21 oct).

---

## 6. Glamy (el sistema más nuevo)

- **Función:** `supabase/functions/glamy/index.ts` (+ `manual.ts`, el prompt fijo con la guía del
  Hub). Desplegada como **versión 9** (21 oct), `verify_jwt: false` **a propósito**: valida la sesión ella
  misma con `auth.getUser` (sin sesión → 401).
- **Qué sabe además del mapa del Hub:** Academia Glam, la lista de alumnas por ciudad, el embudo por curso
  y el **proceso de venta** (de lead a inscrita) con cómo leer los números.
- **Para publicarla** hay que enviar los dos archivos completos (`index.ts` y `manual.ts`).
- **Modelo:** `claude-haiku-5-5`, `output_config: { effort: "low" }`, prompt cacheado
  (`cache_control: ephemeral`) → ~$0.0002–$0.0013 USD por pregunta. Reglas de la API: sin
  `temperature`, sin prefill; en el ciclo de herramientas se devuelve `r.content` completo.
- **Herramientas** (todas de lectura): `buscar_persona`, `curso`, `proximos_cursos`, `mis_tareas`,
  `mis_tickets`, `buscar_tickets_abiertos` y `crear_ticket`. Las de datos corren con **el JWT de
  quien pregunta** (RLS + secciones del rol). Sus consultas **no seleccionan** dirección, CURP, correo
  ni fecha de nacimiento; pero lo que alguien escriba en una pregunta, una nota o un ticket **sí** viaja
  a Anthropic tal cual. Y `tutorial_faq` (que entra a sus instrucciones) hoy la puede editar cualquier
  usuario con sesión: pendiente de restringir (auditoría de Codex).
- **Sin límites** de preguntas (decisión de Enoc el 19 oct); solo mide en `glamy_uso`. El límite
  real es el saldo de Anthropic (~$10 USD) **si la recarga automática está apagada** (confirmar).
- **Botones en las respuestas:** `⟦ir:seccion⟧`, `⟦ficha:uuid⟧`, `⟦lead:uuid⟧`, `⟦tickets⟧`; el
  Hub los valida (sección permitida, forma de uuid) antes de pintarlos.
- **Tickets:** `hub_pedidos` (el nombre de tabla/columna `recibe_pedidos` se dejó a propósito).
  Un trigger avisa en el bloc 📝 (nuevo → Enoc; cambio de estado → quien lo levantó, con la nota).
- **Prueba de punta a punta sin sesión:** acción `"prueba"` con una llave temporal cuya huella
  sha256 vive en `glamy_prueba_llave` (caduca; **hay que caducarla al terminar**).
- **Despliegue:** se hace con la herramienta MCP `deploy_edge_function` (no hay CLI de Supabase
  configurada en esta sesión). Los tipos se revisan con `tsc` aparte antes de desplegar.
- **Fase 2 pendiente:** asistente personal (resumen "¿qué hago hoy?", memoria de pláticas en la
  base visible **solo para Enoc y Jared**, redactar WhatsApp, acciones con "Confirmar").

Detalle: `docs/migraciones/2026-10-19-glamy.md` y `…-glamy-cupcake-uso-tickets.md`.

---

## 7. Auditoría: lo que encontré (19 oct 2026)

### 7.1 Seguridad (advisores de Supabase, revisados uno por uno)

| # | Hallazgo | Riesgo real | Recomendación |
|---|---|---|---|
| 1 | **RLS desactivado en ~52 tablas del esquema `respaldo`** (el aviso sale "crítico") | **Bajo hoy**: `anon` y `authenticated` **no** tienen acceso a ese esquema, así que la API no las expone. Pero contiene copias de **datos personales** (personas, pagos, el Excel completo). | No activar RLS a ciegas (las bloquearía; no hace falta). Mejor: confirmar que el esquema **no** esté en "Exposed schemas" de la API y revisar quién tiene acceso al panel de Supabase. A futuro, borrar o archivar fuera los respaldos viejos con autorización de Enoc. |
| 2 | **Protección contra contraseñas filtradas desactivada** (Auth) | Medio: el Hub tiene contraseñas de equipo | Activarla en Supabase → Auth → contraseñas (lo hace Enoc en el panel). |
| 3 | **`security definer` ejecutable por `anon`**: `diploma_buscar`, `diploma_datos`, `diploma_reportar_nombre` | **Intencional** (portal público): tienen límite de intentos y verificación por teléfono | Mantener. Vigilar `diploma_intentos`. |
| 4 | **`security definer` ejecutable por `anon`**: `marcar_password_cambiada()`, `recibe_pedidos()` | Bajo (verificado: ambas usan `auth.uid()` y fijan `search_path`), pero **no necesitan** ser públicas | Quitar `EXECUTE` a `anon` en una migración. |
| 5 | **`security definer` ejecutable por `authenticated`**: `es_academia`, `es_admin_glam`, `siguiente_folio`, `agl_*`, etc. | Esperado: las de permisos (`es_academia`, `es_admin_glam`) las usan las políticas; `siguiente_folio` **sí** valida `es_academia()` (Academia o admin); las `agl_*` revisan el permiso por dentro. | Mantener. |
| 6 | `no_borrar_historico` sin `search_path` fijo | Bajo | Fijarle `search_path = ''`. |
| 7 | 3 tablas con RLS y sin políticas (`academia_carga_llave`, `diploma_intentos`, `glamy_prueba_llave`) | **Intencional**: solo las usan funciones/servicio | Mantener; documentarlo. |
| 8 | **RLS amplia**: cualquier usuario autenticado lee casi todo; la restricción por rol está en el cliente | Medio | Si el equipo crece, mover las restricciones por rol a políticas RLS (empezando por pagos y datos de Academia). `academia_datos_privados` ya lo hace. |

### 7.2 Deuda técnica y riesgos de mantenimiento

- **Un solo archivo de ~13,700 líneas** (`hub/index.html`, ~480 funciones globales). Funciona y es
  fácil de publicar, pero cada cambio toca el mismo archivo y es difícil de revisar. Si Codex va a
  "potenciar" el sistema, la mayor ganancia es **partirlo en módulos** (por sección) sin cambiar el
  comportamiento, **con las 23 pruebas como red de seguridad**. Plan sugerido: primero extraer lo
  compartido (conexión, permisos, utilidades), luego una sección a la vez; el Hub debe seguir
  publicándose como estático (los módulos `<script src>` ya se usan: `pdf-certificado.js`).
- **Pruebas con base falsa:** no ven RLS, llaves foráneas ni SQL. Falta una prueba de integración
  contra un proyecto/branch de Supabase (hay `create_branch` en el MCP) para consultas y RLS.
- **Producción sin ambiente intermedio:** todo push a `main` publica. Opción: Cloudflare Pages
  genera **vista previa por rama**; usarla antes de `main`.
- **Respaldos acumulados** en `respaldo` (~50 tablas, algunas de decenas de miles de filas con datos
  personales) sin política de retención.
- **Tablas sin uso** (`asesores`, `comisiones`, `secuencia_nurture`) y tablas del tutorial retirado
  (`tutorial_spotlight`, `tutorial_pasos`, `tutorial_*_vistas/completados`): documentar o archivar
  (nunca borrar sin permiso).
- **Texto de notas de sistema:** quedó una tarea abierta para escapar `notas_usuario.texto` en
  todos los puntos de pintado (se creó como tarea aparte, `task_3e469f49`). Verificar si ya se hizo.
- **Costos de la IA:** sin límites por decisión de Enoc; depende de que la recarga automática de
  Anthropic esté apagada. Revisar la pestaña Glamy → Uso con regularidad.
- **Sin monitoreo/alertas:** no hay alertas de errores del Hub ni de la Edge Function (los errores
  de Glamy sí quedan en `glamy_uso.error`).

### 7.3 Lo que está bien hecho (conservar)

- Candados contra borrado en las tablas de negocio principales (no en todas; ver arriba) + respaldos con fecha antes de cada migración.
- Bitácora de actividad (`actividad_usuario`) y checador (`sesiones_usuario`).
- Documentación por cambio y 23 pruebas automatizadas en verde.
- Cargas del Excel **repetibles** (`academia_carga()`, llave temporal, no pisa lo editado en el Hub).
- Escapado de HTML consistente y pruebas de XSS en lo nuevo.

---

## 8. Pendientes abiertos (hasta hoy)

**De Enoc / en paneles externos:**
1. Cloudflare: confirmar el **2.º proyecto Pages** (raíz `diplomas`, dominio
   `certificados.glamreposteria.com`) y que `/certificados/*` responda con CORS.
2. Consola de Anthropic → Billing: **recarga automática apagada**.
3. Supabase → Auth: activar protección de contraseñas filtradas.
4. Tamar: corregir **2 nombres con números** en los diplomas de la gira.
5. WhatsApp (Mensajes): crear plantillas que usen `{link}` y `{guia}`.

**De Jared y Cinthia (para activar Academia Glam):**
6. Academia 2026: ~650 celdas del Excel con fecha y banco pero sin monto. ¿Dónde está el monto?
7. ¿"ABONA" en el Excel es la fecha prometida?
8. Vendedora de cada alumna (el Excel no la trae); plan de cada una (¿todas Chef repostero pago único?).
9. A quién activar: las ~170 que nunca pagaron y las ~275 de 2025 que van abonando.
10. 5ª generación: número y fecha de la próxima mensualidad de cada alumna.

**De desarrollo (cada uno pide su "permitido generar"):**
11. **Seguridad, de la auditoría de Codex:**
    - ~~escapar `notas_usuario.texto`~~ (hecho 21 oct); falta quitar la posibilidad de suplantar quién asignó la tarea;
    - restringir quién edita `tutorial_faq` (entra a las instrucciones de Glamy);
    - RLS de `pagos` e `inscripciones` por permiso;
    - validar las inserciones en `glamy_uso`;
    - endurecer las funciones `security definer` (hallazgos 4 y 6).
12. ~~Renombrar el estatus "Pagó el curso" a "Inscrita (anticipo confirmado)"~~ Hecho el 21 oct (ver `docs/migraciones/2026-10-21-fase0-whatsapp-y-texto.md`). Lo que sigue de la Fase 0 de Codex (pasos 2 a 5) está en ese mismo doc.
13. Academia Glam fase 2 (cupones y módulos por bimestre), fase 3 (comisiones) y fase 4 (avisos y herramienta de Glamy).
14. Glamy **Fase 2** (asistente personal), aprobada en idea.

---

## 9. Cómo debería arrancar Codex (checklist)

1. **Leer en este orden:** este reporte → `docs/guia-actualizar-hub-desde-excel.md` →
   `pruebas/README.md` → los últimos 5 documentos de `docs/migraciones/`.
2. **Auditar sin escribir:** recorrer los banners `/* =====` del Hub; correr
   `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js` (debe dar los 23 archivos en verde).
   Con acceso a Supabase (solo Claude), revisar también `get_advisors` y `list_tables`.
3. **Pedir "permitido generar" por fase** y no asumir que el anterior sigue vigente.
4. **Antes de cualquier migración:** respaldo en `respaldo.tabla_AAAAMMDD`; después, migración
   nombrada; después, prueba contra la API real.
5. **Antes de publicar:** pruebas en verde, capturas a 1200 y 390 px, doc en `docs/migraciones/`.
6. **Después de publicar:** verificar el sitio vivo.
7. **Herramientas necesarias:** acceso a Supabase (MCP o CLI) para SQL, migraciones y
   `deploy_edge_function`; Node + Playwright (Chromium); `git` con permiso a la rama de trabajo.
   **Codex trabaja sin acceso a Supabase a propósito** (sección 0): entrega el SQL y Claude lo aplica.

### Texto sugerido para `AGENTS.md` (en la raíz del repo, para que Codex lo lea solo)

```md
# Glam Repostería — reglas para agentes

- NADA se construye sin "permitido generar" de Enoc (una por fase). Leer y hacer SELECT es libre.
- `main` = producción (hub.glamreposteria.com). Trabaja en tu rama; sube a main solo con permiso
  y con `node pruebas/correr_todas.js` en verde (usa NODE_PATH=$(npm root -g)).
- Nunca borres datos: hay candados. Respaldo en `respaldo.tabla_AAAAMMDD` antes de migrar.
- Cero datos personales en el repo. No toques logistica_cursos, giras, gira_paradas.
- Código con comentarios en español; escapa con escHtml/escapeAttr; reutiliza funciones existentes;
  llama registrarActividad. Variables CSS (paleta C): --wine=frambuesa, --wine-dark=frambuesa oscuro, --champagne=rosa de adorno.
- Cada cambio: prueba Playwright + capturas 1200/390 px + docs/migraciones/AAAA-MM-DD-tema.md.
- Lee docs/FLUJO-DE-TRABAJO.md (este reporte) antes de empezar.
- Nada de fotos: ninguna lista, número o estado se guarda como foto de un momento; se calcula del estado
  de hoy, o la base lo mantiene al día sola (triggers). Un número que se ve en dos lugares sale de la misma función.
- Cada fase responde "¿qué pasa si…?" (docs/plantilla-fase.md) ANTES de pedir el "permitido generar".
- Antes de publicar: reglas rojas del vigilante en 0 y `pruebas/historias/historias.sql` con fallas=0 (lo corre Claude).
```

---

## 10. Datos de contacto técnico (sin secretos)

- Repo: `enocsamano61-hue/hub.glamreposteria`.
- Supabase: proyecto `bomlszsnixazhnsegeik` (URL pública en el HTML).
- Edge Function: `glamy` (v9). Secreto: `ANTHROPIC_API_KEY` (solo en Supabase).
- Dominios: `hub.glamreposteria.com`, `certificados.glamreposteria.com`.
- Responsable y quien autoriza: **Enoc**. Administradores del Hub: Enoc, Jared y Perla.
