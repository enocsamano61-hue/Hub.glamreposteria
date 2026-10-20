# 🎓 Academia Glam — fase 1b: liquidar con abonos y seguimiento — 20 oct 2026

Sigue a la [fase 1](2026-10-20-academia-glam-fase1.md). Jared y Cinthia explicaron cómo se trabaja hoy:

- Las alumnas se inscriben en la gira con Jared.
- Cinthia captura la hoja con la **fecha de su próximo abono**.
- Les marca todos los días hasta que pagan.
- Cuando **liquidan**, les da **acceso** a sus clases.

La fase 1 solo manejaba planes por mensualidad. Esta fase agrega el plan **"liquidar con abonos"** y todo lo que Cinthia necesita para dar seguimiento.

## Decisiones de Enoc ("permitido generar")
- **Dos modalidades de plan:**
  - **Mensual:** paga cada mes, como en la fase 1.
  - **Liquidar con abonos:** tiene un **total**. Cada abono deja una **fecha prometida** para el siguiente.
- **Cinthia (Cobranza, permiso "Ver todo"):**
  - ve a todas y da seguimiento (llamada, WhatsApp, no contestó, nueva fecha prometida o nota);
  - da **acceso** cuando la alumna liquida;
  - **no registra abonos** si su rol no tiene "🎓 Cobrar en Academia". Ese permiso se le puede dar desde Usuarios y permisos.
- **Lo que ya traía abonado del Excel:** se cuenta solo lo **pagado**. Entra como un abono "previo", marcado "del Excel".
- **Generaciones:** Academia 2025 y 2026 quedan con tipo **abonos** (columnas ANT…). Siguen **sin confirmar** hasta que Jared lo valide.

## Qué hace

### 💳 Cobros
- **Grupos:**
  - ⚠️ Atrasadas y promesas vencidas;
  - ⏰ Hoy;
  - 🏦 Por confirmar (abonos y mensualidades);
  - 📅 Esta semana;
  - ❓ Deben y no tienen fecha prometida;
  - 🔓 Liquidaron: dar acceso.
- **Cada fila muestra:**
  - cuánto debe y de cuánto es el total;
  - cuándo prometió ("Prometió hace 2 días", "Prometió hoy", "Sin fecha prometida");
  - el último seguimiento ("🔕 No contestó · hoy").
- **Acciones:** Registrar abono, Seguimiento, WhatsApp y Dar acceso. Para los abonos por confirmar: ✓ Llegó y ✗ No llegó.
- **Registrar abono:**
  - pide el monto, la forma de pago y la **siguiente fecha prometida**;
  - no deja pagar de más ni poner una fecha pasada;
  - "Por confirmar" queda pendiente hasta que se vea en el banco.
- **"Cobrado este mes":** suma las mensualidades y los abonos confirmados.

### 👤 Ficha de la alumna
Se abre al tocar el nombre, desde Cobros o desde Alumnas. Muestra:
- Total, abonado y lo que debe.
- La fecha prometida.
- Los botones de la alumna.
- La lista de abonos (o de mensualidades, si su plan es mensual).
- El historial de seguimiento: quién, cuándo y qué. Todo va escapado.

### 👥 Alumnas → Candidatas
- Lo que se pide para activar depende de la **modalidad del plan** que se elija:
  - **Abonos:** el total, lo ya abonado (propuesto desde el Excel) y la fecha prometida.
  - **Mensual:** el número de mensualidad y la fecha, como antes.
- En las generaciones tipo abonos, "Lleva" se muestra en pesos (por ejemplo "$3,500 (2 abonos)").

### ⚙️ Planes y generaciones
- **Al crear un plan** se elige la modalidad:
  - mensual: precio al mes y día de cobro;
  - abonos: **precio total**.
- **En generaciones** se elige el tipo: mensualidades o abonos.

## Base de datos (migraciones)
- **`academia_glam_07_abonos_estructura`:**
  - **Respaldos:** `respaldo.academia_glam_{planes,suscripciones,generaciones}_20261020`.
  - **Planes:** se agregan `modalidad` y `precio_total`. Un plan de abonos exige el total.
  - **Suscripciones:** se agregan `total`, `fecha_promesa` y `acceso_dado_en` / `acceso_dado_por`.
  - **Generaciones:** se agrega `tipo`.
  - **Tablas nuevas:**
    - `academia_glam_abonos`, con estado por_confirmar / confirmado / no_llego y el campo `previa`;
    - `academia_glam_seguimientos`.
  - Ambas tablas llevan candados (no se borra ni se vacía), RLS, y son **solo lectura** por la API.
- **`academia_glam_08_abonos_funciones`** (todo lo que escribe pasa por funciones que revisan quién llama):
  - `agl_guardar_plan` con modalidad y total (solo administradores).
  - `agl_activar_abonos`, para quien ve a todas.
  - `agl_activar`, que ahora rechaza los planes de abonos.
  - `agl_registrar_abono` (requiere "Cobrar en Academia"; rechaza pagar de más; mueve la fecha prometida) y `agl_confirmar_abono` ("no llegó" anota quién lo había registrado).
  - `agl_seguimiento`, para quien ve a todas o la vendedora de la alumna.
  - `agl_dar_acceso`, para quien ve a todas y **solo con saldo $0**.
  - `agl_config_generacion` con tipo, y `agl_candidatas_gen` (trae lo ya abonado).
  - Las versiones anteriores quedaron **sin permiso**; no se borraron.
- **`academia_glam_09_abonos_vistas`:**
  - `vista_agl_suscripciones` gana columnas de abonos.
  - Vistas nuevas `vista_agl_cuentas` (saldo, promesa y último seguimiento) y `vista_agl_abonos_por_confirmar`.
  - Todas con `security_invoker`, así que cada vendedora ve solo lo suyo.

## Glamy
El manual explica las dos modalidades, el seguimiento, la ficha y "dar acceso". La función `glamy` quedó en la **versión 5**.

## Pruebas
- **Contra la base real**, en una transacción que se revierte al final (no quedó nada):
  - **Planes:** un plan de abonos sin total se rechaza; el equivalente mensual se calcula.
  - **Activación:**
    - las candidatas traen lo abonado;
    - la activación mensual rechaza un plan de abonos;
    - con abonos, el saldo queda bien.
  - **Permisos:**
    - Cinthia da seguimiento pero no registra abonos;
    - Ines no da seguimiento a la alumna de otra vendedora;
    - `anon` no tiene acceso.
  - **Abonos:**
    - pagar de más se rechaza;
    - "por confirmar" cuenta en el saldo;
    - la nota de "no llegó" dice quién lo registró;
    - al liquidar, el saldo queda en 0.
  - **Acceso:** se rechaza antes de liquidar y funciona después (y borra la promesa).
  - **Lo que ve cada quien:** Cinthia ve 1 cuenta e Ines 0.
- **`pruebas/prueba_academia_glam_abonos.js` (53/53):**
  - **Cobros:** grupos, registrar abono, llegó / no llegó y seguimiento.
  - **Acceso y fichas:** dar acceso; ficha de abonos y ficha mensual con WhatsApp.
  - **Activación y planes:** activar una candidata con plan de abonos; plan de abonos en Planes.
  - **Permisos en pantalla, XSS y celular a 390 px.**
- **`pruebas/prueba_academia_glam.js`:** ajustada a la fase 1b (94/94).
- **Suite completa:** en verde (19 archivos).
- **Capturas:** `academia-glam-abonos-cobros.png`, `academia-glam-ficha.png`, `academia-glam-abonos-celular.png` y `academia-glam-ficha-celular.png`.

## Pendiente (de Jared)
- Precios reales de cada plan, y cuál es de abonos y cuál mensual.
- Si "ANT" son los abonos y cuál es el total a liquidar.
- Si el acceso se da todo de una vez.
- Después de eso: un administrador marca **Confirmado** en las generaciones, crea los planes y se activan las candidatas.
