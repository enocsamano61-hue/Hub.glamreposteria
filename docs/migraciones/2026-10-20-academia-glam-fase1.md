# 🎓 Academia Glam — fase 1: planes, vendedoras y cobros — 20 oct 2026

> **Sigue en la [fase 1b](2026-10-20-academia-glam-fase1b-abonos.md):** planes "liquidar con abonos", fecha prometida, seguimiento, dar acceso y ficha de la alumna.

> **Corrección del mismo día (auditoría):** la primera versión buscaba candidatas por "mes del Excel" y estaba mal.
> - Las "230 que pagaron octubre" eran de las **generaciones 1 a 4**, cuyo Excel usa meses **sin año**.
> - Las alumnas que pagan hoy (**Academia 2025 y 2026**) usan columnas **ANT, ANT2… ANT 11**, que la función excluía.
>
> Nadie había activado alumnas, así que no hubo datos dañados. Se cambió por un catálogo **configurable por generación**: ver "Generaciones (configurable)" abajo.

Jared pidió llevar el control de las alumnas de la Academia que **pagan por mes**: a quién le toca pagar, qué vendedora la atiende, y más adelante qué cupones se le dieron y qué comisión genera cada mensualidad. Esta es la **fase 1**.

- **Fases siguientes (cada una pide su propio "permitido generar"):**
  - Fase 2: cupones y módulos abiertos.
  - Fase 3: comisiones y corte mensual.
  - Fase 4: avisos al bloc 📝 y una herramienta de Glamy.
- **Decisiones de Enoc:**
  - Sección nueva en el menú.
  - Planes, cupones y comisiones se crean en un **catálogo** y se asignan a cada alumna.
  - La vendedora la propone el sistema según el Excel; solo se propone a las que no la tienen asignada.
  - "Cursos abiertos" son los **módulos** de la Academia, y por ahora se registran a mano.
  - Cada vendedora ve solo lo suyo.
  - Quien tenga el permiso **Cobrar en Academia** registra los pagos. Ese permiso se puede reasignar a otro rol.

## Qué hace

La sección **Academia Glam** trae 3 pestañas. **Cupones** y **Comisiones** salen como "pronto".

### 💳 Cobros
- **Indicadores:** te pagan hoy, esta semana, atrasadas y cobrado del mes.
- **Agrupación:**
  - ⚠️ atrasadas (con los días);
  - ⏰ hoy;
  - 🏦 por confirmar;
  - 📅 esta semana.

  Lo que vence en más de 7 días no aparece.
- **Filtros:** por vendedora (solo para quien ve a todas) y por plan.
- **Registrar pago** (solo con el permiso "Cobrar en Academia"):
  - monto, forma de pago y fecha;
  - casilla "🏦 Todavía no se ve en el banco" para dejarlo **por confirmar**;
  - aviso si el monto es menor al de la mensualidad.
- **Por confirmar:** botones **✓ Llegó** y **✗ No llegó**. "No llegó" pide confirmación y regresa la mensualidad a pendiente con una nota.
- **💬 WhatsApp:** abre el envío del Hub con la plantilla que elijan. Las variables `{nombre}`, `{debe}` y `{fecha}` ya vienen llenas.

### 👥 Alumnas
- **Lista:** alumnas activas, pausadas o en baja, con búsqueda por nombre o teléfono. Muestra plan, vendedora, mensualidades pagadas, la próxima y las atrasadas.
- **Cambios:** quien ve a todas cambia la vendedora y el estado desde la misma lista.
- **Registrar pago** directo desde la lista (quien tenga "Cobrar en Academia"): toma la próxima mensualidad **pendiente**, aunque venza en más de 7 días. Sirve para pagos adelantados.
- **Candidatas por activar** (solo quien ve a todas):
  - Son las alumnas de la **generación que se elija** (solo las marcadas como "paga por mes") que todavía no están aquí.
  - Por defecto se muestra Academia 2026: 371 alumnas, 358 con algún pago.
  - **"Lleva"** = mensualidades pagadas en el Excel, contando **solo las columnas configuradas** para esa generación. También muestra cuántas están "por revisar", el último pago (columna y texto) y la decisión de Academia.
  - La vendedora se **propone** solo si el texto del Excel nombra a **una** vendedora del Hub. En Academia 2026 el Excel no trae vendedora, así que hay que asignarla a mano.
  - La próxima mensualidad se propone como "lleva + 1".
  - Se puede elegir plan y fecha para todas a la vez ("Aplicar a las de la lista") y activar las marcadas.
  - **Si la generación no está confirmada**, sale un aviso y el botón Activar queda apagado. La base también lo impide.

### ⚙️ Planes y 🎓 Generaciones (configurable)
**Generaciones que pagan por mes.** Es la parte que se corrige sin tocar código, cuando Jared confirme cómo se lee el Excel.
- **Qué se marca por generación:**
  - si **paga por mes**;
  - qué **columnas** de su Excel son mensualidades (casillas, en el orden del Excel);
  - **Confirmado**: "ya revisé que estas son las mensualidades".
- **Quién lo edita:** solo los administradores. Quien ve a todas lo puede leer.
- **Propuesta inicial, sin confirmar:**

  | Generación | Columnas propuestas |
  |---|---|
  | Academia 2026 | ANT, ANT2… ANT 11 |
  | Academia 2025 | ANT, ANT2… ANT 11 |
  | 5ª generación mensual | MENS 1… MENS 23 |

  Las generaciones 1 a 4 y las demás quedan como "no paga por mes".
- **Cómo se corrige:**
  - Si "ANT" resulta ser la inscripción, se quita su casilla y "lleva" se recalcula solo. Ya se probó contra la base: una alumna pasó de "lleva 2" a "lleva 1".
  - Si otra generación también paga por mes, se marca y se eligen sus columnas.
- **Qué no cambia:** las alumnas ya activadas. Su avance vive en sus propias mensualidades.

**Planes:**
- **Qué definen:** el precio al mes, cuántos meses dura y qué día se cobra.
- **Día de cobro:**
  - el día de su primer pago;
  - un día fijo de 1 a 28.
- **Quién los edita:** solo administradores.
- **Un plan no se borra:** se desactiva y deja de ofrecerse.
- **Los montos se congelan:** si cambia el precio de un plan, las alumnas que ya lo tienen conservan el monto con el que se activaron.

## Reglas de la activación
Al activar a una alumna se crean **todas** sus mensualidades.
- Las anteriores a la "próxima" quedan como **previas, ya pagadas**. No cuentan como cobrado ni generarán comisión.
- **Plan "día de su primer pago":** vence el mismo día de cada mes, contado desde la fecha capturada. Cada fecha se calcula desde la base, así que un día 31 no se va recorriendo.
- **Plan de día fijo:** la próxima mensualidad vence el primer día fijo que caiga **en o después** de la fecha capturada.
  - Ejemplo: día fijo 5 y fecha 14 de octubre → vence el 5 de noviembre.

## Base de datos (migraciones)

- **`academia_glam_00_respaldo`:** respaldo de `permisos_rol` y `permisos_accion` en `respaldo.*_20261020_academia_glam`.
- **`academia_glam_01_tablas_y_permisos`:**
  - **Tablas:**
    - `academia_glam_planes`;
    - `academia_glam_suscripciones` (una por alumna);
    - `academia_glam_mensualidades`.
  - **Vistas planas** (con `security_invoker`, respetan los permisos de quien consulta):
    - `vista_agl_cobros`;
    - `vista_agl_suscripciones`.
  - **Candados:** nada se borra ni se vacía (`no_borrar_*`, `no_vaciar_*`).
  - **Permisos:**
    - las tablas y vistas **solo se pueden leer**; no se concede escribir ni `TRUNCATE`;
    - `anon` no tiene ningún permiso.
- **`academia_glam_02_funciones`:** todo lo que escribe va por funciones que revisan quién las llama.
  - `agl_guardar_plan` (solo administradores).
  - `agl_activar`, `agl_asignar_vendedor` y `agl_cambiar_estado` (quien ve a todas).
  - `agl_registrar_pago` y `agl_confirmar_pago` (quien tenga "Cobrar en Academia").
  - `agl_meses_excel` y `agl_candidatas` (quien ve a todas).
  - Ayudas de permisos: `agl_mi_id`, `agl_tiene_accion`, `agl_ve_todo` y `agl_participa`.
- **`academia_glam_03_permisos`:**
  - La sección `academia_glam` para Cobranza, Ventas, Ventas coordinadora, Academia e Inbox, Gerente, Dueña y Sistemas.
  - La acción nueva **`ver_todo_academia_glam`** para Cobranza y Academia e Inbox. Se reasigna desde "Usuarios y permisos".
- **`academia_glam_04_dia_fijo_desde_la_fecha`:** la regla del día fijo descrita arriba.
- **`academia_glam_05_generaciones_configurables`:**
  - Tabla `academia_glam_generaciones`, con candados, solo lectura y propuesta inicial sin confirmar.
  - `agl_generaciones()` (quien ve a todas), `agl_config_generacion()` (solo administradores) y `agl_candidatas(generacion)`.
  - Las funciones viejas `agl_candidatas(texto)` y `agl_meses_excel()` quedaron **sin permiso para nadie**. No se borraron porque la herramienta de migraciones se cuelga con `DROP`.
- **`academia_glam_06_confirmada_adelantos_y_nota`:**
  - `agl_activar` exige que la generación esté **confirmada**.
  - "No llegó" deja en la nota **quién** había registrado el pago.
  - `vista_agl_suscripciones` trae la generación y la próxima mensualidad **pendiente** (para pagos adelantados).

### Quién ve qué (en la base, no solo en la pantalla)

| Persona | Ve | Hace |
|---|---|---|
| Administradores | Todo | Todo, incluidos los planes |
| Academia e Inbox (permiso Cobrar + Ver todo) | Todas las alumnas | Registrar y confirmar pagos, activar, cambiar vendedora y estado |
| Cobranza (permiso Ver todo) | Todas las alumnas | Ver, mandar WhatsApp, activar, cambiar vendedora y estado. **No** registra pagos. |
| Vendedoras (Ventas) | Solo sus alumnas | Ver y mandar WhatsApp |

- **Nota sobre nombres y teléfonos:** son de la tabla `academia_alumnas`, que ya era legible por cualquier usuario con sesión desde la Academia. Lo que sí queda protegido por vendedora es el **cobro y su avance**.
- **Auditoría:** esta sección se hizo con el servidor revisando permisos desde el inicio. No hereda los problemas de `pagos` abierto a todos.

## Glamy
- El manual se actualizó (la función `glamy` está en la **versión 4**) para explicar la sección y llevar con `⟦ir:academia_glam⟧`.
- Todavía no tiene una herramienta para consultar los cobros (es parte de la fase 4).

## Pruebas
- **Contra la base real**, dentro de una transacción que se revierte al final (no quedó nada):
  - **Candidatas (versión corregida):** Academia 2026 da 371 candidatas, 358 con pagos y hasta 11 mensualidades. La 1ª generación se rechaza por no ser de pago mensual.
  - **Confirmación:** sin confirmar no se activa; Eliab (no es administrador) no puede confirmar; sin columnas no se guarda. Al quitar "ANT", lo que lleva cada alumna se recalcula; después de confirmar sí se activa y la alumna sale de candidatas.
  - **Pagos:** la próxima pendiente aparece para el pago adelantado, y la nota de "no llegó" dice quién lo registró.
  - **Activación:**
    - 12 mensualidades por plan y 3 previas;
    - fechas correctas: 14 oct → 14 nov → … → 14 jun, y día fijo el 5.
  - **Seguridad:**
    - doble activación y repago rechazados;
    - una vendedora no puede cobrar, editar planes ni ver candidatas;
    - escribir directo en las tablas se rechaza.
  - **Registro de pago:** por confirmar → no llegó → efectivo, y los dos pasos se rechazan si el pago ya no está pendiente.
  - **Lo que ve cada quien:** el administrador ve todo; Ines ve solo su alumna; Cinthia (Cobranza) ve todas.
  - **Vistas:** las vistas devuelven las filas y los totales esperados.
- **`pruebas/prueba_academia_glam.js`** (91/91). Además de lo de abajo, cubre el pago adelantado desde Alumnas, las candidatas por generación (sin confirmar no se activa) y la configuración de generaciones con casillas (incluida la vista de solo lectura):
  - **Acceso:** la sección por rol; las pestañas "pronto".
  - **Cobros:** indicadores, grupos, filtros, registrar pago, por confirmar, llegó / no llegó, error de la base, y sin permiso de cobrar.
  - **Vendedora sin "ver todo":** sin filtro de vendedoras, candidatas ni edición.
  - **Alumnas:** lista, búsqueda, cambio de vendedora y estado, y cómo se revierte si la base lo rechaza.
  - **Candidatas:** solo meses del calendario, vendedora propuesta y activación.
  - **Planes:** crear, editar y desactivar.
  - **General:** todo se escapa (XSS) y el celular a 390 px.
- **Suite completa:** en verde (18 archivos).
- **Pendiente de revisar a ojo** con datos reales: cómo se ve la lista de 371 candidatas, y la primera activación real.

## Cómo se arranca (primer uso)
1. **Confirmar con Jared** cómo se lee el Excel:
   - ¿"ANT" es la primera mensualidad o la inscripción?
   - ¿Qué generaciones pagan por mes hoy?
2. Un administrador lo marca en **Planes → Generaciones** (casillas) y pone **Confirmado**.
3. Un administrador crea los **planes** con los montos reales.
4. En **Alumnas → Candidatas**, elegir la generación, asignar plan, fecha y vendedora, y activar.
5. En **Cobros** aparecen las de hoy, de la semana y las atrasadas.
6. Crear en **Mensajes** una plantilla de recordatorio de mensualidad (con `{nombre}`, `{debe}` y `{fecha}`).
