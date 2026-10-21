/* Embudo por curso: Cobranza → 📊 (cursos de la gira activa de hoy en adelante) y la hoja del día del Calendario.
   La función embudo_cursos de la base se simula con window.__rpc; contra la base real se probó aparte
   (Martínez de la Torre 26 oct: 14 con anticipo, 3 sin confirmar, 4 promesas, 2 vencidas, 7 sin respuesta, 2 no van).
   Datos de ejemplo, sin personas reales. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const hoy = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };

let n = 0;
const fila = (ev, fecha, ciudad, grupo, extra) => ({ evento_id:ev, fecha, ciudad, grupo, persona_id:'p' + (++n), lead_id:grupo === 'liquidada' || grupo === 'anticipo' ? null : 'l' + n,
  inscripcion_id:grupo === 'liquidada' || grupo === 'anticipo' ? 'i' + n : null, nombre:`ALUMNA EJEMPLO ${n}`, telefono:'22990000' + String(n).padStart(2, '0'),
  asesor_id:'u2', monto:700, debe:grupo === 'anticipo' ? 700 : 0, fecha_promesa:null, comentario:null, reportado_en:null, sin_ligar:false, ...extra });
const E1 = ['e1', mas(5), 'Ciudad Uno'], E2 = ['e2', mas(6), 'Ciudad Dos'];
const FILAS = [
  ...Array.from({ length:3 }, () => fila(...E1, 'anticipo')),
  fila(...E1, 'liquidada'),
  fila(...E1, 'sin_confirmar', { reportado_en:new Date(Date.now() - 3 * 864e5).toISOString(), monto:1400 }),
  fila(...E1, 'sin_confirmar', { reportado_en:new Date().toISOString(), asesor_id:'u1' }),
  fila(...E1, 'promesa', { fecha_promesa:hoy, comentario:'dice que paga en la tarde' }),
  fila(...E1, 'promesa', { fecha_promesa:mas(1), asesor_id:'u1' }),
  fila(...E1, 'vencida', { fecha_promesa:mas(-3), nombre:'<img src=x onerror="window.__xss=1"> Rara' }),
  fila(...E1, 'sin_respuesta', { sin_ligar:true }),
  fila(...E1, 'no_van'),
  fila(...E2, 'anticipo'),
  fila(...E2, 'promesa', { fecha_promesa:mas(2) }),
];

(async () => {
  const h = await abrirHub({ tablas:{ leads:[], inscripciones:[], interacciones:[], mensajes_predeterminados:[] },
    usuario:{ id:'u3', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:false },
    equipo:[...EQUIPO_EJEMPLO, { id:'u3', nombre:'Cobranza Prueba', es_vendedor:false, rol:'Cobranza' }] });
  const { p, check } = h;
  await p.evaluate(filas => {
    cursoActivoIdCache = 'cur1';
    window.__rpc.embudo_cursos = ({ p_evento }) => p_evento ? filas.filter(f => f.evento_id === p_evento) : filas;
    setActiveSection('cobranza');
  }, FILAS);
  await p.waitForTimeout(300);

  h.paso('1. Pestaña y tarjetas por curso');
  await p.click('[data-cob-tab="embudo"]');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.getElementById('cobVistaCobrar').style.display === 'none' && document.getElementById('cobVistaEmbudo').style.display === ''), 'cambia a la pestaña Embudo');
  const args = await p.evaluate(() => window.__ops.filter(o => o.tabla === 'rpc:embudo_cursos').map(o => o.datos)[0]);
  check(args && args.p_curso === 'cur1' && args.p_desde === new Date().toLocaleDateString('en-CA') && args.p_evento === null, 'pide la gira activa de hoy en adelante');
  const cabs = await p.$$eval('.emb-curso .emb-cab b', x => x.map(y => y.textContent));
  check(cabs.length === 2 && cabs[0].startsWith('Ciudad Uno') && cabs[1].startsWith('Ciudad Dos'), 'una tarjeta por curso, en orden de fecha');
  const chips = await p.$$eval('.emb-curso:first-child .emb-chip', x => x.map(y => y.textContent.trim()));
  check(chips.join('|') === 'Liquidadas 1|Con anticipo 3|Sin confirmar 2|Promesa vigente 2|Promesa vencida 1|Sin respuesta 1|No van 1', 'los 6 grupos y "no van" aparte (' + chips.join('|') + ')');
  check((await p.textContent('.emb-curso:first-child .emb-cab')).includes('10 en total') && (await p.textContent('.emb-curso:first-child .emb-cab')).includes('en 5 días'), 'el total no cuenta a las que no van');
  check(await p.$$eval('.emb-curso:first-child .emb-bar i', x => x.length) === 6, 'barra de colores con cada grupo');

  h.paso('2. Alertas');
  const alertas = await p.textContent('.emb-alertas');
  check(alertas.includes('1 anticipo sin confirmar desde hace más de 1 día') && alertas.includes('1 promesa vence hoy') && alertas.includes('1 lead sin curso ligado'), 'alertas de pagos viejos, promesas de hoy y sin curso ligado');

  h.paso('3. Lista de un grupo');
  await p.click('[data-emb-abrir="e1|promesa"]');
  const lista = await p.textContent('.emb-lista');
  check(lista.includes('Promesa vigente · 2') && lista.includes('Promete hoy') && lista.includes('dice que paga en la tarde'), 'la lista trae la promesa y el comentario');
  await p.click('[data-emb-abrir="e1|vencida"]');
  check((await p.textContent('.emb-lista')).includes('Venció hace 3 días') && !(await p.evaluate(() => window.__xss)), 'vencida con sus días, nombres escapados');
  await p.click('[data-emb-abrir="e1|sin_respuesta"]');
  check((await p.textContent('.emb-lista')).includes('Sin curso ligado'), 'marca a quien no tiene el curso ligado');
  await p.click('[data-emb-abrir="e1|anticipo"]');
  check((await p.textContent('.emb-lista')).includes('Debe $700') && await p.$('.emb-lista [data-emb-insc]') !== null, 'inscritas con lo que deben y "Abrir" a su ficha');
  await p.click('[data-emb-abrir="e1|anticipo"]');
  check(await p.$('.emb-lista') === null, 'tocar otra vez el grupo lo cierra');
  await h.captura('embudo-cobranza.png');

  h.paso('4. WhatsApp y abrir');
  await p.click('[data-emb-abrir="e1|promesa"]');
  await p.click('.emb-lista [data-emb-wa]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('modalWhats').classList.contains('open') && !!waDatos.leadId), 'WhatsApp con sus datos (queda en su lead)');
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));
  await p.evaluate(() => { window.__abrio = null; abrirModalLead = id => { window.__abrio = 'lead:' + id; }; abrirModalInscripcion = id => { window.__abrio = 'insc:' + id; }; });
  await p.click('.emb-lista [data-emb-lead]');
  check((await p.evaluate(() => window.__abrio)).startsWith('lead:l'), '"Abrir" abre el lead');

  h.paso('5. Filtro por vendedora');
  await p.selectOption('#embVend', 'u1');
  const chipsU1 = await p.$$eval('.emb-curso .emb-chip', x => x.map(y => y.textContent.trim()));
  check(await p.$$eval('.emb-curso', x => x.length) === 1 && chipsU1.includes('Sin confirmar 1') && chipsU1.includes('Promesa vigente 1'), 'solo lo de esa vendedora');
  await p.selectOption('#embVend', '');

  h.paso('6. Copiar reporte');
  const prev = () => p.textContent('#embPrev');
  let t = await prev();
  check(t.startsWith('*Ciudad Uno') && t.includes('✅ Inscritas: 4 (1 liquidadas, 3 con anticipo)') && t.includes('🏦 Sin confirmar: 2') && t.includes('Total: 10 (1 ya dijeron que no)'), 'reporte de un curso con números');
  check(t.includes('_Pendientes_') && t.includes('⚠️ Alumna Ejemplo') === false && t.includes('Rara · Vendedora Prueba · venció'), 'pendientes con vendedora y fecha vencida');
  check(!t.includes('2299'), 'sin teléfonos si no se piden');
  await p.check('[data-emb-inc="tel"]');
  check((await prev()).includes('2299000007'), 'con teléfonos al marcarlos');
  await p.check('input[name="embAlcance"][value="gira"]');
  t = await prev();
  check(t.includes('*Ciudad Uno') && t.includes('*Ciudad Dos'), 'toda la gira');
  await p.check('input[name="embPorVend"][value="si"]');
  t = await prev();
  check(t.includes('*— Recepción Prueba —*') && t.includes('*— Vendedora Prueba —*'), 'una sección por vendedora');
  await p.uncheck('[data-emb-inc="nombres"]');
  check(!(await prev()).includes('_Pendientes_') && await p.isDisabled('[data-emb-inc="tel"]'), 'solo números si se quitan los nombres');
  await p.evaluate(() => { window.__copiado = null; navigator.clipboard.writeText = x => { window.__copiado = x; return Promise.resolve(); }; });
  await p.click('#embCopiar');
  await p.waitForTimeout(200);
  check((await p.evaluate(() => window.__copiado)) === await prev(), 'copia el texto que se ve');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'embudo_reporte'), 'queda en la actividad');

  h.paso('7. Hoja del día del Calendario');
  await p.evaluate(([fecha]) => {
    calendarioDias[fecha] = [{ id:'e1', fecha, ciudad:'Ciudad Uno', ciudadId:'c1', sede:'', total:4, llegaron:0, liquidadas:1, deben:3, liq:1, ant:3, pend:0,
      noLlegaron:0, cobrado:2800, pendiente:2100, debenLlegaron:0, porConfirmar:0, cerrada:false }];
    abrirSheetCalendario(fecha);
  }, [E1[1]]);
  await p.waitForTimeout(400);
  const cal = await p.textContent('[data-emb-cal="e1"]');
  check(cal.includes('Embudo del curso') && cal.includes('En camino: 6'), 'la hoja trae el embudo y "en camino"');
  const pedido = await p.evaluate(() => window.__ops.filter(o => o.tabla === 'rpc:embudo_cursos' && o.tipo === 'rpc').map(o => o.datos).pop());
  check(pedido.p_evento === 'e1', 'pide solo ese curso');
  await p.click('[data-emb-cal-abrir="e1|sin_confirmar"]');
  check((await p.textContent('[data-emb-cal="e1"] .emb-lista')).includes('Sin confirmar · 2'), 'tocar un grupo muestra la lista');
  await h.captura('embudo-calendario.png');

  h.paso('8. Celular');
  await p.click('#sheetCalendarioClose');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { setActiveSection('cobranza'); });
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('embudo-celular.png');

  await h.terminar();
})();
