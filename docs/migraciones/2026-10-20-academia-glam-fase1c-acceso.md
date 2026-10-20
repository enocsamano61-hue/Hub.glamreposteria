# 🎓 Academia Glam — fase 1c: planes reales y acceso a las clases — 20 oct 2026

Sigue a la [fase 1b](2026-10-20-academia-glam-fase1b-abonos.md).

## De dónde salen los datos
- **Planes:** del Excel "Planes de Academia" que mandó Enoc. Los precios los confirmó él: Chef repostero cuesta $799 al mes o $7,997 en un solo pago.
- **Lo que ya pagó cada alumna:** de los pagos del Excel ya cargados en la base. Se revisaron solo totales, sin datos personales:
  - en Academia 2025 y 2026, 41 alumnas liquidaron con $7,997, 17 con $8,000 y 43 con $6,997;
  - los $6,997 eran el precio anterior.

## Decisiones de Enoc ("permitido generar")
1. **Inscripción:** cuenta como abono del pago, no como un cobro aparte. Si luego cambia, se ajusta.
2. **El total de cada alumna** es lo que dice el Excel:
   - quien liquidó con $6,997 se queda con $6,997;
   - las demás quedan con $7,997.
3. **Acceso:**
   - las que ya liquidaron quedan con acceso;
   - las de mensualidad también tienen acceso mientras pagan;
   - si una de mensualidad tiene adeudo, se **avisa** que hay que retirarle el acceso.
4. **Bimestres:** se envía uno cada 2 mensualidades. Queda para la fase 2 (módulos).
5. **Planes que ya no se venden** (Diplomado y Plan introducción): se crean apagados, listos por si se usan. Las generaciones "Hobby", "Repostero" y "Sous Chef" solo tienen pagos de 2023, así que no se tocaron.

## Qué hace

### Planes (creados por la migración)
| Plan | Modalidad | Precio | Meses | Estado |
|---|---|---|---|---|
| Chef repostero mensual | Mensual | $799 al mes | 24 | Activo |
| Chef repostero pago único | Liquidar con abonos | $7,997 | 24 | Activo |
| Hobbie mensual | Mensual | $580 al mes | 6 | Activo |
| Hobbie pago único | Liquidar con abonos | $2,900 | 6 | Activo |
| Diplomado 6 meses (poner precio) | Mensual | $1 (por definir) | 6 | Apagado |
| Plan introducción 3 meses (poner precio) | Mensual | $1 (por definir) | 3 | Apagado |

Los dos planes apagados no se pueden asignar. Antes de usarlos, un administrador les pone el precio real en Planes y los activa.

### Generaciones
Cada generación tiene dos datos nuevos, que un administrador puede editar en Planes → Generaciones:
- **"Liquidó si pagó desde $":** si lo que pagó una alumna llega a ese monto, ya liquidó. Lo que pagó queda como su total y queda con acceso.
- **Columna de inscripción:** esa columna cuenta como abono.

Valores iniciales:
- Academia 2025, Academia 2026 y la 5ª generación mensual: $6,997.
- La 5ª generación mensual usa la columna "INSCRIPCION O PAGO UNICO".

Siguen **sin confirmar**: un administrador las marca Confirmado para poder activar alumnas.

### Candidatas
- **"Lleva"** muestra la inscripción ("+ $500 de inscripción o pago único") y la marca ✅ Liquidó cuando aplica.
- **Con plan de pago único:**
  - "Ya abonó" suma lo abonado más la inscripción;
  - el total propuesto es lo que pagó (si ya liquidó) o el precio del plan.
- **Casilla "Ya tiene acceso":**
  - viene marcada en las de mensualidad y en las que ya liquidaron;
  - no deja activar con acceso a quien todavía no liquida.
- Al cambiar el total o lo abonado se actualiza solo esa fila, sin borrar lo que se estaba escribiendo.

### Acceso de las alumnas de mensualidad
- **Aviso al bloc 📝:** si una alumna con acceso debe una mensualidad desde hace **7 días o más**:
  - le llega una tarea del sistema a quien tiene "👁 Ver todo en Academia Glam" (Cobranza y Academia e Inbox);
  - la tarea dice "⛔ Retirar acceso: …" y su botón "Abrir su ficha" abre la ficha de la alumna;
  - llega **una vez por mensualidad**;
  - se marca hecha sola cuando la alumna paga o cuando se le retira el acceso.
- **Cuándo se revisa:** al entrar al Hub, cada quien con "Ver todo" pide a la base revisar. El Hub no tiene tareas programadas, así que el aviso llega en cuanto alguien de Cobranza o Academia entra.
- **Cobros, grupos nuevos:**
  - "⛔ Deben 7 días o más y tienen acceso: retirar acceso", con los botones Retirar acceso, Registrar pago y WhatsApp;
  - "↩️ Se pusieron al corriente: devolver acceso".
- **Retirar acceso:**
  - pide un motivo opcional;
  - queda en el seguimiento de la alumna ("⛔ Se le retiró el acceso: …") y en la actividad del equipo.
- **Devolver acceso:** solo se puede si no tiene mensualidades atrasadas.
- **Ficha:** muestra 🔓 Acceso dado, ⛔ Acceso retirado o Sin acceso, los botones de Retirar y Dar/Devolver, y el seguimiento de las dos modalidades.
- **Alumnas:** cada mensual muestra 🔓 Con acceso o ⛔ Sin acceso.
- **Quién puede:**
  - retirar o devolver: quien ve a todas;
  - registrar el pago: solo con "Cobrar en Academia";
  - las vendedoras no retiran ni devuelven.

## Base de datos: `academia_glam_10_fase1c_acceso_y_planes`
- **Respaldos:** `respaldo.academia_glam_{generaciones,planes,suscripciones}_20261020_1c`.
- **Columnas nuevas:**
  - `academia_glam_generaciones`: `liquida_desde` y `columna_inscripcion`;
  - `academia_glam_suscripciones`: `acceso_retirado_en` y `acceso_retirado_por`.
- **Funciones nuevas:**
  - `agl_dias_retiro()` (7). El Hub usa el mismo número en `AGL_DIAS_RETIRO`.
  - `agl_candidatas_v3(generacion)`: las candidatas, más su inscripción y "liquida desde".
  - `agl_activar(…, p_con_acceso)` y `agl_activar_abonos(…, p_con_acceso)`: versiones con acceso. Con abonos, solo si ya liquidó.
  - `agl_retirar_acceso(suscripcion, nota)`: quien ve a todas.
  - `agl_revisar_accesos()`: crea los avisos y cierra los que ya no aplican. Es seguro llamarla varias veces, porque nunca crea dos avisos de la misma mensualidad. Una vendedora que la llama no crea nada.
  - `agl_config_generacion(…, p_liquida_desde, p_columna_inscripcion)`: solo administradores.
- **Funciones cambiadas:**
  - `agl_dar_acceso`: también sirve para las de mensualidad (sin atrasadas), limpia el retiro y cierra los avisos de esa alumna.
  - `vista_agl_suscripciones`: suma `acceso_retirado_en` al final.
- **Versiones anteriores:** siguen funcionando; no se borró nada.
- **Texto de las tareas:** el bloc lo muestra sin escapar, así que la base lo sanea (como en los avisos de diplomas).

## Pruebas
- **Contra la base real**, en transacciones que se revierten al final (no quedó nada):
  - **Planes y candidatas:** 6 planes, 4 de ellos activos. En la 5ª generación, 15 candidatas tienen inscripción.
  - **Aviso:**
    - la mensual activada con acceso y 10 días de atraso genera **1 aviso** para Cinthia, Eliab y Tamar;
    - una segunda revisión no lo duplica;
    - con 6 días de atraso no avisa;
    - al pagar, la revisión cierra los 3 avisos.
  - **Retirar acceso:**
    - cierra los avisos y lo anota en el seguimiento;
    - después, "dar acceso" se rechaza mientras siga atrasada;
    - al pagar se devuelve, y la marca de retiro se limpia.
  - **Activación con abonos:** la que liquidó con $6,997 queda con acceso; la que debe se rechaza ("le faltan…").
  - **Permisos:** Ines (Ventas) no retira y su revisión no crea nada; `anon` no tiene acceso.
- **`pruebas/prueba_academia_glam_acceso.js` (35/35):**
  - **Cobros:** grupos de retirar y devolver (la de 5 días no sale), retirar con motivo y actividad, cancelar, devolver, pagar desde la fila.
  - **Ficha y aviso:** la ficha mensual con acceso y seguimiento; el aviso del bloc abre la ficha; la revisión al entrar solo la hace quien ve a todas.
  - **Permisos en pantalla.**
  - **Candidatas:** inscripción, "Liquidó", total propuesto, "Ya tiene acceso", que no se pierda la fecha y los datos con que se activa.
  - **Generación:** "liquidó desde" y la columna de inscripción.
  - **General:** XSS y celular a 390 px.
- **Pruebas ajustadas:** `prueba_academia_glam.js` (94/94) y `prueba_academia_glam_abonos.js` (53/53).
- **Suite completa:** en verde (20 archivos).
- **Capturas:** `academia-glam-acceso-{cobros,ficha,candidatas,generacion,celular}.png`.

## Glamy
El manual explica el acceso de las mensuales, el aviso de 7 días y los precios de los planes. La función `glamy` quedó en la **versión 6**.

## Siguiente paso (administrador)
1. En Planes → Generaciones, revisar Academia 2025, Academia 2026 y la 5ª generación, y marcar **Confirmado**.
2. En Alumnas → Candidatas, elegir el plan para todas con "Aplicar a las de la lista", revisar los totales y la casilla de acceso, y **activar**.
