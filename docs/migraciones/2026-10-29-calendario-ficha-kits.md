# 2026-10-29 · Calendario de Cobranza, botones del cambio de fecha en la ficha y cancelar kits

Permitido por Enoc el 29 oct 2026 ("permitido generar", las tres juntas).

Pedidos:
- Enoc: "que se vea de forma sencilla y visual todos los clientes por día… siento que estamos tan enfocados en filtrar
  todo que ahora son excesos de filtros". Decisión: incluir Academia Glam ("si lo cobra Cinthia y va con sus funciones").
- Eliab: los botones del cambio de fecha (Aceptó, Reembolso) en la ficha, para no salir y entrar de ciudad en ciudad.
- Tamar (ticket #3, levantado con Glamy): cancelar el kit de una alumna que se gradúa el próximo año y saber qué pasa
  con lo que pagó. Decisión de Enoc: "deja la opción para que el usuario la capture".

## 1. Cobranza → Calendario (solo `hub/index.html`)
- Pestaña nueva **Calendario**, la primera de Cobranza (antes abría en Por cobrar). Sin filtros ni grupos.
- El mes en cuadrícula (lunes primero): en cada día hasta 3 nombres con un punto de color (rosa = lead con promesa
  de anticipo, verde = inscrita con su fecha de pago, morado = Academia Glam) y "+N más"; cuántos son; hoy marcado;
  los días que ya pasaron con alguien sin pagar, en rojo.
- Al tocar un día: su lista con tipo, "por confirmar", "venció…", dónde, quién lo atiende, cuánto paga, el total del
  día, **WhatsApp** y **Abrir** (su lead, su ficha o la ficha de Academia Glam).
- Arriba, solo si hay: "N atrasados de meses anteriores · Ver" y "N sin fecha de pago (no salen en el calendario) ·
  Ver en Por cobrar". La inscrita sin fecha de pago (Cobranza toma el día de su curso) no se inventa un día.
- Gira: los mismos renglones de Por cobrar (`itemsCobranza(true)`, misma regla, sin sus filtros). Academia Glam:
  `vista_agl_cobros` (mensualidades hasta el fin del mes que se ve) y `vista_agl_cuentas` (abonos con saldo, por su
  fecha prometida), solo si el rol ve la sección Academia Glam y con lo que la base le deja ver.
- Nada se guarda aparte: se calcula cada vez que se abre o se cambia de mes.

## 2. Botones del cambio de fecha en la ficha (Eliab)
- `cfBotones(f)`: los botones de un renglón salen de una sola función que usan la lista y las fichas (y `cfAccion`
  los ejecuta igual).
- Ficha de la inscrita: su renglón de la lista del curso (`cambio_fecha_lista`), con todos los botones según cómo va
  (WhatsApp, Ya le avisé, Aceptó, Reembolso; Registrar regalo, Ya se envió; Reembolso hecho · cerrar lugar; deshacer).
  Antes, ya "Avisada", se quedaba sin botones.
- Ficha del lead (pestaña Lead): la misma caja, con Aceptó y Ya no va.
- Después de marcar se actualizan la lista, el embudo y la ficha abierta. Si ya no está en la lista (curso pasado o
  lugar cerrado), la ficha solo dice cómo quedó.

## 3. Cancelar un kit (ticket #3 de Tamar)
- Base (migración `kits_cancelar_con_motivo`): respaldo `respaldo.academia_kits_20261029`; columnas
  `academia_kits.cancelado_motivo`, `cancelado_dinero`, `cancelado_en`, `cancelado_por`.
- Hub: **Cancelar el kit** ahora está debajo de los estados (antes, hasta abajo del panel, y no se encontraba). Abre
  una ventana: motivo obligatorio; si ya pagó, "Pagó $X. ¿Qué pasa con ese dinero?" (lo escribe quien cancela, con
  atajos "Queda a su favor" y "Se le devolvió"); casilla para pasar su decisión en Academia a "Espera la siguiente".
  El kit cancelado dice cuándo, quién, el motivo, qué pasó con su dinero y que sus pagos se conservan; **Reactivar**.
  La tarjeta en "Cancelados" enseña el motivo.

## ¿Qué pasa si…?
- Le mueven la fecha de pago o la promesa: cambia de día sola. Paga o se confirma: sale del calendario.
- No tiene fecha: no sale en el calendario; se cuenta arriba y se ve en Por cobrar.
- Una vendedora sin Academia Glam abre Cobranza: solo ve lo de la gira.
- Se marca Aceptó desde la ficha: la lista y el embudo lo dicen igual (misma función). Reembolso desde la ficha:
  la misma tarea a Cobranza y Gerencia; cerrar el lugar sigue siendo solo de Cobranza y administradores.
- Se cancela un kit sin pagos: no pregunta por el dinero. Se reactiva: vuelve a "Por pagar" con sus pagos.
- Leads, inscritas, Embudo, Glamy BI y el vigilante: sin cambios de regla.

## Glamy v28
- Manual: el Calendario de Cobranza, los botones del cambio de fecha en la ficha y cómo cancelar un kit. Examen 42/42
  (3 casos nuevos).

## Aviso
- Fila `2026-10-29-calendario` en `hub_novedades`, **sin publicar** (Enoc revisa el texto). `HUB_VERSION` del Hub:
  `2026-10-29-calendario`.

## Pruebas
- Nueva `pruebas/prueba_cobranza_calendario.js` (21). Actualizadas: `prueba_regalo_y_aviso.js` (ficha de inscrita y
  de lead), `prueba_academia_kits.js` (cancelar con motivo y dinero), `prueba_cambio_fecha.js` y
  `prueba_cambio_fecha_al_dia.js` (la ficha sale de la lista), y las de Cobranza tocan "Por cobrar".
