# 🎓 Academia Glam — fase 1: planes, vendedoras y cobros — 20 oct 2026

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
- **Candidatas por activar** (solo quien ve a todas):
  - Son las alumnas que pagaron en el **mes del Excel que se elija** y todavía no están aquí. Hoy hay **230** que pagaron octubre.
  - La vendedora se **propone** solo si el texto del Excel nombra a **una** vendedora del Hub. Con las 230 alumnas de octubre se propuso en **91**.
  - La próxima mensualidad se propone como las que lleva + 1.
  - Se puede elegir plan y fecha para todas a la vez ("Aplicar a las de la lista") y activar las marcadas.

### ⚙️ Planes
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
  - **Candidatas:** 230 candidatas, 91 con vendedora propuesta.
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
- **`pruebas/prueba_academia_glam.js`** (71/71):
  - **Acceso:** la sección por rol; las pestañas "pronto".
  - **Cobros:** indicadores, grupos, filtros, registrar pago, por confirmar, llegó / no llegó, error de la base, y sin permiso de cobrar.
  - **Vendedora sin "ver todo":** sin filtro de vendedoras, candidatas ni edición.
  - **Alumnas:** lista, búsqueda, cambio de vendedora y estado, y cómo se revierte si la base lo rechaza.
  - **Candidatas:** solo meses del calendario, vendedora propuesta y activación.
  - **Planes:** crear, editar y desactivar.
  - **General:** todo se escapa (XSS) y el celular a 390 px.
- **Suite completa:** en verde (18 archivos).
- **Pendiente de revisar a ojo** con datos reales: cómo se ve la pantalla con las 230 candidatas, y la primera activación real.

## Cómo se arranca (primer uso)
1. Un administrador crea los **planes** en la pestaña Planes, con los montos reales.
2. En **Alumnas → Candidatas**, elegir el mes (OCTUBRE), asignar plan y fecha, revisar las vendedoras propuestas y activar.
3. En **Cobros** aparecen las de hoy, esta semana y las atrasadas.
4. Crear en **Mensajes** una plantilla de recordatorio de mensualidad (con `{nombre}`, `{debe}` y `{fecha}`).
