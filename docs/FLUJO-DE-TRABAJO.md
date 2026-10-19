# Reporte para Codex: cómo se trabaja en Glam y cómo está armado todo

Fecha: 19 oct 2026. Escrito por Claude (sesión de desarrollo del Hub) para que Codex
**no empiece de cero**. Todo lo de aquí se verificó contra el repositorio y contra Supabase
el mismo día; donde algo es estimado o no se pudo comprobar, lo dice.

> **Regla de oro (léela dos veces):** en este proyecto **nada se construye sin que Enoc diga
> "permitido generar"**. Leer, hacer SELECT y diagnosticar es libre. Escribir código, migraciones,
> datos o publicar, no.

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
(~12,300 líneas con CSS, HTML y JavaScript) que habla directo con Supabase desde el navegador.

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
idea → lluvia de ideas → confirmar → plan (roadmap) → maqueta → "permitido generar" → construir
  → probar → documentar → publicar → avisar
```

1. **Idea y lluvia de ideas.** Enoc cuenta qué quiere. Se le hacen preguntas cortas y numeradas
   (él contesta "1 - sí / 2 - a…"). Se le dan **opciones con recomendación**, no encuestas largas.
2. **Confirmar.** Se repite lo entendido y las decisiones tomadas.
3. **Plan.** Qué tablas, qué pantalla, qué se prueba, qué se publica.
4. **Maqueta** (si hay pantalla): imagen con datos inventados (HTML + captura con Playwright).
   Él elige o corrige.
5. **"permitido generar".** Sin esto no se toca nada. **Cada fase pide el suyo**; uno anterior
   no vale para la siguiente.
6. **Construir**, **probar**, **documentar**, **publicar**.

Mientras no haya permiso: se puede leer código, consultar Supabase (SELECT), analizar archivos,
armar maquetas en el scratchpad y proponer.

### 3.2 Ramas y publicación

- Se trabaja en la rama asignada (en esta sesión: `claude/ecstatic-pasteur-2saaae`) y se hace
  push ahí.
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

### 3.4 Convenciones de código (para que lo nuevo se vea igual que lo viejo)

- **Comentarios en español.** Cada bloque grande del Hub empieza con un banner
  `/* ===== NOMBRE — qué hace ===== */`. Para ubicarte: `grep -n "^/\* =====" -A1 hub/index.html`.
- **Siempre escapar** lo que viene de datos: `escHtml(x)` para texto y `escapeAttr(x)` para atributos.
  No existe `innerHTML` con datos sin escapar.
- **Reutilizar** lo que ya existe antes de escribir algo nuevo:
  `toast`, `registrarActividad(accion, detalle)` (bitácora; agregar la etiqueta en `ACCION_LABEL`),
  `abrirModalInscripcion(id)`, `abrirModalLead(id)` (necesita `leadsCache`, `cargarLeads()`),
  `setActiveSection(id)`, `seccionesPermitidas()`, `puede('accion')`, `confirmar(...)` (modal que
  devuelve promesa), `fetchTodasFilas(...)` (paginación), `normTexto`, `debeDe(insc)`, etc.
- **Secciones nuevas:** una entrada en `SECCIONES`, un `<div class="view" id="view-ID">`, y su
  `renderX()` llamado desde `setActiveSection`. Si no debe repartirse por rol (como `actividad`,
  `usuarios`, `glamy`), se excluye de `SECCIONES_ASIGNABLES_POR_ROL` y se gobierna en
  `seccionesPermitidas()`.
- **Tareas del bloc (📝)**: `notas_usuario` con `de_sistema`, `nota_sistema` y `enlace` (jsonb:
  `{vista, inscripcion|lead|evento|ciudad|cert_evento|pedido, etiqueta}`); `irAEnlaceNota` lo abre.
- **Botones flotantes:** el bloc 📝 abajo a la izquierda, Glamy 🧁 abajo a la derecha; ambos se
  ocultan en Recepción (`body.en-recepcion`).
- **Paleta B (fucsia/morado/azul)**: usar variables CSS (`--wine` = fucsia `#C2338A`,
  `--wine-dark` = morado `#5B2C83`, `--champagne` = azul `#4AA3F0`, `--ambar` para estados de
  "pendiente", `--wine-rgb` para tintes). Los **nombres de variable no cambian**
  (`--wine` ya no es vino). Las gráficas (Chart.js) llevan los colores escritos, no leen CSS.
- **Móvil y escritorio:** se revisa con capturas a **1200 px y 390 px**.

### 3.5 Base de datos: cómo se cambia

- Cada cambio es una **migración con nombre** (`modulo_NN_descripcion`) aplicada con
  `apply_migration` (herramienta MCP de Supabase), **después** del respaldo.
- Patrones usados: `security invoker` por defecto; `security definer` solo si es indispensable y con
  `set search_path = ''`; RLS siempre activo; candado contra borrados en toda tabla de negocio.
- **Funciones públicas para el portal** (`diploma_*`): `security definer` a propósito, con límite
  de intentos (`diploma_intentos`) y confirmación por teléfono.
- **Trampas conocidas del MCP de Supabase:**
  - `apply_migration` **se cuelga (60 s) si el SQL contiene `delete from` dentro de una función**.
    Solución: partir la migración y evitar DELETE.
  - Ambigüedad de llaves foráneas en PostgREST (error **PGRST201**): hay que nombrar la relación
    (`pagos!pagos_inscripcion_id_fkey`). Una consulta nueva **se prueba contra la API real**, no
    solo con el stub de pruebas (ver `docs/migraciones/2026-09-23-flujo-de-pago-y-permisos.md`).
  - `list_tables` muestra conteos **estimados** (algunas tablas con datos salen en 0). Para cifras
    reales usar `select count(*)`.

### 3.6 Pruebas

- **Playwright** con Chromium en `/opt/pw-browsers/chromium`. Si Node no encuentra `playwright`:
  `NODE_PATH=$(npm root -g) node pruebas/prueba_X.js`.
- **Todo corre con** `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js` (hoy: **17 archivos,
  todos en verde**).
- `pruebas/arnes.js` abre `hub/index.html` con las librerías locales (`pruebas/vendor/`) y cambia
  `sb.from` por una **base en memoria**; `window.__rpc = { fn: args => data }` simula RPCs;
  `h.ops(tabla,'update')` revisa lo que el Hub mandó. Nada sale a Supabase.
- **Lo que el arnés NO detecta:** llaves foráneas, RLS, caché de esquema de la API, funciones SQL.
  Eso se prueba **a mano contra la API real** (consulta con `curl` + clave pública, o SQL).
- Cada prueba: pasos numerados, `h.check(condición, mensaje)`, capturas en `pruebas/capturas/`
  (esa carpeta no se sube) y una fila en `pruebas/README.md`.
- El portal de diplomas se prueba servido desde un origen https falso (las descargas no funcionan
  desde `file://`).

### 3.7 Documentación

- Cada cambio deja `docs/migraciones/AAAA-MM-DD-tema.md` con: qué se pidió, qué cambió, migraciones,
  decisiones, pruebas y qué **no** cambió a propósito. (Hoy hay 36 documentos.)
- Guías vivas:
  - `docs/guia-actualizar-hub-desde-excel.md` y `docs/GUIA_ACTUALIZAR_DESDE_DRIVE.md`: cómo
    sincronizar el Hub con los Excel del Drive **sin perder dinero ni borrar nada**.
  - `pruebas/README.md`: cómo escribir pruebas y qué cubren.
- **No hay README ni `AGENTS.md`/`CLAUDE.md` en la raíz del repo.** Este reporte propone uno (sección 9).

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
| Cursos (`cursos`) · Ciudades/Plazas (`plaza`) | Curso → ciudad → alumnas; vista por ciudad |
| Giras (`giras`) · Logística (`logistica`) | Constructor de ruta; sedes, negociaciones, cupo (**no tocar sus tablas**) |
| Ventas (`ventas`) · Reportes (`reportes`) | Ingresos, asesores, embudo; resumen ejecutivo y CSV |
| Cobranza (`cobranza`) | A quién cobrar y cuándo; WhatsApp |
| No llegaron (`nollegaron`) | Recuperar o cerrar el caso de quien pagó anticipo y no llegó |
| Academia (`academia`) | 4 pestañas: Alumnas, Graduación, Kits, Certificados |
| Mensajes (`mensajes`) · Precios (`precios`) | Plantillas de WhatsApp con variables; lo que se cobra aparte |
| Calendario (`calendario`) → **Recepción** | Cursos por fecha; la Recepción es la pantalla del día del curso (cobrar, marcar llegada, VIP, cerrar) |
| Actividad del equipo (`actividad`) | Checador y bitácora (solo admins o con permiso) |
| Usuarios y permisos (`usuarios`) | Solo admins: roles, secciones y acciones |
| **Glamy** (`glamy`) | Solo quien recibe tickets (Enoc): 📊 Uso y 🎫 Tickets |
| Bloc 📝 (botón flotante) | Notas personales y tareas (incluidas las de sistema, con "Ir →") |

Roles que existen en `permisos_rol`: Academia e Inbox, Cobranza, Coordinadora, Dueña, Gerente,
Logística, Sistemas, Ventas, Ventas coordinadora. Acciones aparte (`permisos_accion`):
`confirmar_pagos`, `cobrar_academia`.

**Flujo del dinero** (lo más delicado): lead ⚪ → pago reportado 💜/🏦 *por confirmar* → ✅ confirmado
(quien tiene `confirmar_pagos`) → inscripción liquidada. `debeDe(insc)` calcula lo que debe;
"liquidado" exige `debe = 0` **y** ningún pago por confirmar. Los diplomas de la gira solo se
generan a quien llegó y liquidó con pagos confirmados.

**Certificados:** `hub/certificados/pdf-certificado.js` arma el PDF **en el navegador** (pdf-lib +
fontkit) y lo comparte el Hub y el portal. Las fuentes se incrustan **completas** (`subset:false`:
la licencia de Nickainley prohíbe modificarla y el subconjunto perdía letras). La plantilla vive en
`certificado_plantillas` (posiciones, tamaños, fondo); el diploma de la gira lleva el nombre en
3 renglones y el mes, sin folio.

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
| **Certificados** | `certificado_plantillas`, `certificados`, `diploma_intentos` |
| **Glamy** | `hub_pedidos` (= **tickets**), `glamy_uso`, `glamy_prueba_llave` |
| **Tutorial (ya retirado de la pantalla)** | `tutorial_faq` (**sigue en uso**: Glamy la lee), `tutorial_spotlight`, `tutorial_pasos`, `tutorial_vistas_vistas`, `tutorial_pasos_completados` |
| **Respaldos** | Esquema `respaldo`: ~50 copias `tabla_AAAAMMDD`. No son accesibles desde la API (`anon` y `authenticated` no tienen USAGE en ese esquema) |

Vistas importantes: `vista_resumen_ciudad_gira`, `vista_curso_ciudades`, `vista_resumen_plaza`, y
las de cobranza e histórico. Funciones propias de Glamy: `glamy_secciones`, `glamy_buscar_persona`,
`glamy_curso`, `glamy_proximos_cursos`, `glamy_mis_tareas`, `glamy_debe`, `glamy_sin_acentos`
(todas `security invoker`, respetan RLS y las secciones del rol).

Historial: **~100 migraciones** (`list_migrations`), de `corregir_montos_corruptos…` (4 sep) a
`glamy_06_tickets` (19 oct). Los prefijos cuentan la historia: `fase*` (cargas del Excel de la gira),
`vendedores_*`, `notas_*`, `ciudades_*`, `flujo_pagos_*`, `cobranza_*`, `ladas_*`, `precios_*`,
`recepcion_*`, `no_llegaron_*`, `pagos_verificacion_*`, `historico_*`, `excel_20261013_*`,
`academia_01…15`, `glamy_01…06`.

---

## 6. Glamy (el sistema más nuevo)

- **Función:** `supabase/functions/glamy/index.ts` (+ `manual.ts`, el prompt fijo con la guía del
  Hub). Desplegada como **versión 3**, `verify_jwt: false` **a propósito**: valida la sesión ella
  misma con `auth.getUser` (sin sesión → 401).
- **Modelo:** `claude-haiku-5-5`, `output_config: { effort: "low" }`, prompt cacheado
  (`cache_control: ephemeral`) → ~$0.0002–$0.0013 USD por pregunta. Reglas de la API: sin
  `temperature`, sin prefill; en el ciclo de herramientas se devuelve `r.content` completo.
- **Herramientas** (todas de lectura): `buscar_persona`, `curso`, `proximos_cursos`, `mis_tareas`,
  `mis_tickets`, `buscar_tickets_abiertos` y `crear_ticket`. Las de datos corren con **el JWT de
  quien pregunta** (RLS + secciones del rol). **No** manda dirección, CURP, correo ni fecha de
  nacimiento.
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
| 5 | **`security definer` ejecutable por `authenticated`**: `es_academia`, `es_admin_glam`, `siguiente_folio`, etc. | Las de permisos (`es_academia`, `es_admin_glam`) son necesarias para las políticas y usan `auth.uid()`. **`siguiente_folio` no revisa quién la llama**: cualquier usuario con sesión podría consumir folios de certificados | Hacer que `siguiente_folio` valide el rol (Academia o admin). El resto es esperado. |
| 6 | `no_borrar_historico` sin `search_path` fijo | Bajo | Fijarle `search_path = ''`. |
| 7 | 3 tablas con RLS y sin políticas (`academia_carga_llave`, `diploma_intentos`, `glamy_prueba_llave`) | **Intencional**: solo las usan funciones/servicio | Mantener; documentarlo. |
| 8 | **RLS amplia**: cualquier usuario autenticado lee casi todo; la restricción por rol está en el cliente | Medio | Si el equipo crece, mover las restricciones por rol a políticas RLS (empezando por pagos y datos de Academia). `academia_datos_privados` ya lo hace. |

### 7.2 Deuda técnica y riesgos de mantenimiento

- **Un solo archivo de ~12,300 líneas** (`hub/index.html`, 432 funciones globales). Funciona y es
  fácil de publicar, pero cada cambio toca el mismo archivo y es difícil de revisar. Si Codex va a
  "potenciar" el sistema, la mayor ganancia es **partirlo en módulos** (por sección) sin cambiar el
  comportamiento, **con las 17 pruebas como red de seguridad**. Plan sugerido: primero extraer lo
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

- Candados contra borrado en toda tabla de negocio + respaldos con fecha antes de cada migración.
- Bitácora de actividad (`actividad_usuario`) y checador (`sesiones_usuario`).
- Documentación por cambio y 17 pruebas automatizadas en verde.
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

**De desarrollo:**
6. Glamy **Fase 2** (asistente personal), aprobada en idea, sin "permitido generar".
7. Endurecer funciones `security definer` (hallazgos 4–6) y revisar `siguiente_folio`.
8. Verificar el escapado de `notas_usuario.texto` (tarea `task_3e469f49`).

---

## 9. Cómo debería arrancar Codex (checklist)

1. **Leer en este orden:** este reporte → `docs/guia-actualizar-hub-desde-excel.md` →
   `pruebas/README.md` → los últimos 5 documentos de `docs/migraciones/`.
2. **Auditar sin escribir:** recorrer los banners `/* =====` del Hub; correr
   `NODE_PATH=$(npm root -g) node pruebas/correr_todas.js` (debe dar 17/17); revisar
   `get_advisors` (seguridad y rendimiento) y `list_tables`.
3. **Pedir "permitido generar" por fase** y no asumir que el anterior sigue vigente.
4. **Antes de cualquier migración:** respaldo en `respaldo.tabla_AAAAMMDD`; después, migración
   nombrada; después, prueba contra la API real.
5. **Antes de publicar:** pruebas en verde, capturas a 1200 y 390 px, doc en `docs/migraciones/`.
6. **Después de publicar:** verificar el sitio vivo.
7. **Herramientas necesarias:** acceso a Supabase (MCP o CLI) para SQL, migraciones y
   `deploy_edge_function`; Node + Playwright (Chromium); `git` con permiso a la rama de trabajo.
   Sin acceso a Supabase, Codex no podrá hacer migraciones ni desplegar Glamy: pedirlo a Enoc.

### Texto sugerido para `AGENTS.md` (en la raíz del repo, para que Codex lo lea solo)

```md
# Glam Repostería — reglas para agentes

- NADA se construye sin "permitido generar" de Enoc (una por fase). Leer y hacer SELECT es libre.
- `main` = producción (hub.glamreposteria.com). Trabaja en tu rama; sube a main solo con permiso
  y con `node pruebas/correr_todas.js` en verde (usa NODE_PATH=$(npm root -g)).
- Nunca borres datos: hay candados. Respaldo en `respaldo.tabla_AAAAMMDD` antes de migrar.
- Cero datos personales en el repo. No toques logistica_cursos, giras, gira_paradas.
- Código con comentarios en español; escapa con escHtml/escapeAttr; reutiliza funciones existentes;
  llama registrarActividad. Variables CSS: --wine=fucsia, --wine-dark=morado, --champagne=azul.
- Cada cambio: prueba Playwright + capturas 1200/390 px + docs/migraciones/AAAA-MM-DD-tema.md.
- Lee docs/FLUJO-DE-TRABAJO.md (este reporte) antes de empezar.
```

---

## 10. Datos de contacto técnico (sin secretos)

- Repo: `enocsamano61-hue/hub.glamreposteria`.
- Supabase: proyecto `bomlszsnixazhnsegeik` (URL pública en el HTML).
- Edge Function: `glamy` (v3). Secreto: `ANTHROPIC_API_KEY` (solo en Supabase).
- Dominios: `hub.glamreposteria.com`, `certificados.glamreposteria.com`.
- Responsable y quien autoriza: **Enoc**. Administradores del Hub: Enoc, Jared y Perla.
