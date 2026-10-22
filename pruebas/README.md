# Pruebas del Hub

Pruebas con Playwright (Chromium) que abren `hub/index.html` **sin tocar Supabase**:
`sb.from` se cambia por una base en memoria y cualquier petición a `supabase.co` se bloquea.

## Correrlas

```bash
NODE_PATH=$(npm root -g) node pruebas/correr_todas.js      # todas
NODE_PATH=$(npm root -g) node pruebas/prueba_ficha.js      # una sola
```

- Chromium se busca en `/opt/pw-browsers/chromium` (o en la variable `CHROMIUM`).
- Cada prueba imprime `nombre: ok/total` y sale con error si algo falla.
- Las capturas quedan en `pruebas/capturas/` y no se suben al repo.
- `prueba.html` se genera en cada corrida y tampoco se sube.

## Archivos

| Archivo | Qué es |
|---|---|
| `arnes.js` | Arma la página de prueba (CDN → `vendor/`), instala la base en memoria, entra como un usuario de ejemplo y da ayudas (`check`, `ops`, `fallar`, `captura`). |
| `vendor/` | Copias locales de supabase-js 2, Chart.js 4.4.4, pdf-lib 1.17.1 y fontkit 1.1.1. |
| `correr_todas.js` | Corre cada `prueba_*.js` y dice cuáles fallaron. |
| `prueba_calendario.js` | Calendario: tarjetas por curso (avance y estado) y hoja del día. |
| `prueba_humo.js` | Todas las secciones del menú abren sin errores de JS (admin y Logística). |
| `prueba_cursos_historial.js` | Cursos (curso → ciudad → alumnas) e Historial cliente (buscar, juntar por mismo teléfono y nombre parecido, separar). |
| `prueba_ficha.js` | Ficha de la inscrita: cobro primero, guardado automático, modo Cobranza. |
| `prueba_vip.js` | ⭐ VIP: paquete en el lead (nuevo y ficha), tablero, VIP primero en Recepción, Cambiar a VIP. |
| `prueba_por_confirmar.js` | 🏦 Pagos por confirmar: marcar al cobrar o después, confirmar / no llegó en Recepción y ficha, Cobranza y Calendario. |
| `prueba_precios.js` | Sección Precios. |
| `prueba_recepcion.js` | Recepción del día del curso: buscar, cobrar, extras, llegada, cerrar/reabrir, leads, teclado. |
| `prueba_tareas_enlace.js` | Tareas del bloc 📝 con botón "Ir →" (ficha, No llegaron, Recepción) y comentario de sistema aparte. |
| `prueba_no_llegaron.js` | Sección No llegaron: estados, filtros, acceso online, sí fue, perdió anticipo, mover de curso. |
| `prueba_academia.js` | 🎓 Academia, pestaña Alumnas: menú por rol, generaciones, filtros y chips, decisión, notas, "ya lo revisé", datos privados, registrar y corregir pagos (con y sin permiso), celular. |
| `prueba_academia_graduacion.js` | 🎓 Academia, pestaña Graduación: cuenta (precio congelado, acompañantes, extras), hotel, filipinas, pagos, quitar/volver, agregar alumna, graduación pasada, Precios por área. |
| `prueba_academia_kits.js` | 🎓 Academia, pestaña Kits: tablero por estado, kits del Excel por clasificar, cobro (liquidar → Por preparar), enviado con guía y WhatsApp {guia}, cancelar/reactivar, crear kit, catálogo, filipinas en Graduación. |
| `prueba_academia_glam.js` | 🎓 Academia Glam fase 1: sección por rol, Cobros (indicadores, grupos, filtros, registrar pago, por confirmar, llegó / no llegó, error de la base, sin permiso de cobrar), vendedora sin "ver todo", Alumnas (lista, búsqueda, cambio de vendedora y estado, pago adelantado), Candidatas por generación (sin confirmar no se activa, lo que lleva, "seleccionar todas", activar), Generaciones configurables con casillas, Planes (crear, editar, desactivar), XSS y celular. Lo que revisa la base (permisos, RLS, fechas) se probó aparte contra Supabase: ver la doc. |
| `prueba_academia_glam_abonos.js` | 🎓 Academia Glam fase 1b: grupos de Cobros con promesas de abono, registrar abono (siguiente fecha, sin pagar de más), abono llegó / no llegó, seguimiento, dar acceso al liquidar, ficha de la alumna (abonos y mensual), activar candidata con plan de abonos, plan de abonos en Planes, permisos en pantalla (Cobranza / vendedora), XSS y celular. |
| `prueba_academia_glam_acceso.js` | 🎓 Academia Glam fase 1c: acceso de las mensuales (retirar a los 7 días de atraso, devolver al ponerse al corriente, motivo y actividad), pagar desde la fila, ficha con acceso y seguimiento, aviso del bloc que abre la ficha, revisión al entrar, permisos, candidatas con inscripción / "Liquidó" / "Ya tiene acceso", configuración de la generación, XSS y celular. |
| `prueba_paleta_y_letra.js` | 🎨 Paleta C "rosa claro": variables, sin colores de paletas anteriores, barra rosa pastel, contraste (menú, botón, texto), sección activa, inicio de sesión y celular. Diploma de gira: el PDF real lleva Barlow Semi Condensed en el nombre, en mayúsculas con acentos y ñ, sin tocar los demás datos. |
| `prueba_plaza_alumnas.js` | 👥 Ciudades → todas las alumnas de la ciudad: lista por páginas, "Mostrar más", XSS, lead sin inscripción, último contacto, 7 filtros con su número, búsqueda, registrar contacto (interacciones + actividad), WhatsApp, ir al historial, exportar CSV y celular. |
| `prueba_embudo.js` | 📊 Embudo por curso: pestaña en Cobranza, tarjetas por curso con 6 grupos y "no van" aparte, alertas, lista de cada grupo, WhatsApp, Abrir, filtro por vendedora, reporte para WhatsApp con opciones, la hoja del día del Calendario con "en camino" y celular. |
| `prueba_usuarios.js` | 👤 Usuarios y permisos: Personas (resumen, búsqueda, rol, admin con confirmación, vendedora, tickets, "lo que ve", actividad) y Roles (áreas, acciones, rol sin configurar, rol nuevo), XSS y celular. |
| `prueba_wa_historial_y_texto.js` | 💬 WhatsApp que sí queda en el historial de contacto (y aviso si falla), texto seguro en notas del bloc, historial del lead y bitácora; etiquetas "Inscrita (anticipo confirmado)" y "Registradas en la gira"; celular. |
| `prueba_lead_ya_inscrita.js` | 🎫 Ticket #1: confirmar el pago de un lead que ya está inscrita cierra el lead y abre su ficha (con el pago escrito solo si no lo tiene); reportar un pago en el lead de una inscrita avisa y lleva a su ficha; celular. |
| `prueba_academia_certificados.js` | 🎓 Academia, pestaña Certificados: diploma de gira (solo liquidadas con pagos confirmados, nombre en 3 renglones, mes, sin folio, letras faltantes y nombres demasiado largos), mandar con {link}, regenerar, agregar a mano, descargado en la página y "Usar este nombre", tarea del sistema con "Ir →", plantilla; academia con folio y programa; celular. |
| `prueba_diplomas.js` | Página de diplomas (`diplomas/`, certificados.glamreposteria.com): celular, límite de intentos, "¿Eres tú?" en 3 renglones, diploma real con vista previa y descarga, pago pendiente, "mi nombre está mal", dos cursos, celular. |
| `prueba_glamy.js` | 🧁 Glamy y su sección: el tutorial ya no existe, cupcake y globito una vez al día, sugerencias, formato escapado, botones validados (sección permitida, ficha, lead, tickets), plática por pestaña, errores, "Nueva"; 📊 Uso (resumen, proyección, por persona, 14 días); 🎫 Tickets solo para quien los recibe, estado con nota, copiar para Claude, avisos del bloc (nuevos y viejos), Recepción y celular. |

## Escribir una prueba nueva

```js
const { abrirHub } = require('./arnes');
(async () => {
  const h = await abrirHub({ tablas: { precios: [ /* filas de ejemplo */ ] } });
  h.paso('1. Qué se prueba');
  await h.p.click('#algo');
  h.check((await h.ops('precios', 'update')).length === 1, 'guardó una vez');
  await h.terminar();
})();
```

- `tablas`: filas por tabla. `select` filtra con `eq`, `in`, `ilike`, `or(…)` (ilike/in/eq), `range` y `not(…, 'in', …)` (también con
  columnas anidadas como `eventos.curso_id`); `insert`, `update` y `delete` cambian las filas.
  Los demás filtros (`order`, `gte`, `ilike`…) se aceptan pero no filtran, y no hay joins:
  lo anidado se escribe ya dentro de la fila de ejemplo.
- `h.ops(tabla, tipo)`: lo que el Hub mandó (`insert`, `update`, `select`, `delete`).
- `window.__rpc = { funcion: args => data }` simula `sb.rpc`.
- `h.fallar(op => ...)`: simula un error de la base en las operaciones que cumplan la condición.
- Usa solo datos inventados: nada de nombres, teléfonos ni direcciones reales.

## Lo que estas pruebas NO detectan

La base en memoria no sabe de llaves foráneas, RLS ni del caché de esquema de la API.
Toda consulta nueva o cambio de esquema se prueba además **contra la API real**
(ver la lección del PGRST201 en `docs/migraciones/2026-09-23-flujo-de-pago-y-permisos.md`).

Las suites de sesiones anteriores (vendedor, ui, sync, inscribir, ciudades, pagos, cobranza,
contacto, ladas, mensajes) se perdieron al cerrar esas sesiones. Conviene rehacerlas aquí
conforme se toquen esas partes.
