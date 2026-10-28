/* Reporte del día (28 oct 2026): el Inicio de quien recibe los tickets (Enoc) ya no trae números del negocio,
   sino lo que hay que atender del Hub: errores del Hub (reglas rojas del vigilante), datos por limpiar (amarillas,
   con cuánto cambiaron desde ayer), tickets nuevos, "No me sirvió" de Glamy, errores de Glamy de ayer y quién
   falta de leer la actualización. Cada bloque solo si hay algo; si no, "Todo en orden". El resto del equipo
   conserva su Inicio, sin la frase vieja de "Datos en vivo…". Datos de ejemplo. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const AYER = mas(-1);
const regla = (fecha, r, tipo, n, extra) => ({ fecha, regla:r, tipo, titulo:'Regla ' + r, quien:tipo === 'amarillo' ? 'Cobranza' : null, n, casos:[], creado_en:fecha + 'T11:41:00Z', ...extra });
const VIG = [
  regla(HOY, 'lead_inscrita_sin_inscripcion', 'rojo', 2, { titulo:'Leads "Inscrita" sin su inscripción en ese curso', casos:[
    { persona_id:'p1', nombre:'ALUMNA UNO', inscripcion_id:null, lead_id:'l1', detalle:'Su lead dice Inscrita en Orizaba' },
    { persona_id:'p2', nombre:'<img src=x onerror="window.__xss=1">', inscripcion_id:'i2', lead_id:null, detalle:'Ciudad Prueba' }] }),
  regla(HOY, 'inscrita_sin_lead', 'rojo', 0),
  regla(HOY, 'inscrita_sin_vendedora', 'amarillo', 95, { titulo:'Inscritas sin vendedora' }),
  regla(HOY, 'pago_doble', 'amarillo', 0),
  regla(AYER, 'inscrita_sin_vendedora', 'amarillo', 98),
];

(async () => {
  const enoc = { id:'u1', nombre:'Enoc Prueba', rol:'Sistemas', es_admin:true, recibe_pedidos:true };
  const h = await abrirHub({ tablas:{
      vigilante_resultados:VIG,
      hub_pedidos:[{ numero:7, titulo:'Botón para exportar', seccion:'cobranza', estado:'nuevo' }, { numero:6, titulo:'Ya hecho', seccion:'board', estado:'hecho' }],
      glamy_comentarios:[{ pregunta:'¿Cuántas faltan en Xalapa?', nota:'Que me diera los nombres', usuario_id:'u2', creado_en:new Date().toISOString() }],
      glamy_uso:[{ id:'g1', fecha:AYER, error:'API 500' }],
      hub_novedades:[{ id:'nov1', titulo:'Fichas más claras', publicada:true, creado_en:'2026-10-27T10:00:00Z' }],
      hub_novedades_leidas:[{ novedad_id:'nov1', usuario_id:'u1' }],
      usuarios:[{ id:'u1', nombre:'Enoc Prueba' }, { id:'u2', nombre:'Vendedora Prueba' }],
      inscripciones:[{ id:'i2', persona_id:'p2', evento_id:'e1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
        asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:null, pagos:[],
        personas:{ id:'p2', nombre:'ALUMNA DOS', telefono_principal:'5510000002' }, eventos:{ fecha:mas(60), sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } } }],
      leads:[], interacciones:[], pagos:[] },
    usuario:enoc, equipo:EQUIPO_EJEMPLO });
  const { p, check } = h;
  await p.evaluate(() => { window.__rpc.vigilante_revisar = () => []; setActiveSection('inicio'); return renderDashboard(); });
  await p.waitForTimeout(400);
  const rep = () => p.textContent('#reporteDia');

  h.paso('1. Enoc: su reporte en lugar de los números del negocio');
  check(await p.isVisible('#reporteDia') && !(await p.isVisible('#dashKpis')) && !(await p.isVisible('#inicioLeadsCard')), 'sale el reporte; no los KPI ni los leads recientes');
  await p.evaluate(() => renderPendientes());
  check(!(await p.isVisible('#pendientesCard')), 'tampoco el avance de la gira');
  check(!(await p.textContent('#view-inicio')).includes('Datos en vivo'), 'sin la frase vieja de "Datos en vivo"');
  const t = await rep();
  check(t.includes('Errores del Hub') && t.includes('Leads "Inscrita" sin su inscripción en ese curso') && !t.includes('Regla inscrita_sin_lead'), 'errores del Hub: solo las reglas rojas que fallan');
  check(t.includes('Datos por limpiar') && t.includes('Inscritas sin vendedora') && t.includes('−3 desde ayer') && t.includes('Lo limpia: Cobranza') && !t.includes('Regla pago_doble'), 'datos por limpiar, con el cambio desde ayer y quién');
  check(t.includes('Tickets nuevos sin revisar') && t.includes('#7 Botón para exportar') && !t.includes('Ya hecho'), 'tickets nuevos (solo los nuevos)');
  check(t.includes('"No me sirvió" · Vendedora Prueba') && t.includes('Esperaba: Que me diera los nombres'), 'los "No me sirvió" de Glamy');
  check(t.includes('Veces que Glamy no pudo contestar ayer'), 'errores de Glamy de ayer');
  check(t.includes('Falta leerla') && t.includes('Vendedora Prueba') && t.includes('Fichas más claras'), 'quién falta de leer la actualización');
  check(!t.includes('Todo en orden'), 'con pendientes no dice "Todo en orden"');
  await h.captura('reporte-dia.png');

  h.paso('2. Ver casos y abrirlos');
  await p.click('[data-vig-casos="lead_inscrita_sin_inscripcion"]');
  await p.waitForSelector('#modalVigilante.open');
  const casos = await p.textContent('#vigCasos');
  check(casos.includes('Alumna Uno') && casos.includes('Su lead dice Inscrita en Orizaba') && (await p.textContent('#vigSub')).includes('pásaselo a Claude'), 'lista los casos con su detalle');
  check(await p.isVisible('[data-vig-abrir="lead"][data-vig-id="l1"]') && await p.isVisible('[data-vig-abrir="ficha"][data-vig-id="i2"]'), 'con botón a su lead o a su ficha');
  check(!(await p.evaluate(() => window.__xss)), 'nombres escapados');
  await h.captura('reporte-dia-casos.png');
  await p.click('[data-vig-abrir="ficha"][data-vig-id="i2"]');
  await p.waitForTimeout(500);
  check(!(await p.evaluate(() => document.getElementById('modalVigilante').classList.contains('open'))) && await p.evaluate(() => modalInscId === 'i2'), 'abre la ficha de la inscrita');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('3. Revisar ahora');
  await h.limpiarOps();
  await p.click('#rdRevisar');
  await p.waitForTimeout(400);
  check((await h.ops('rpc:vigilante_revisar', 'rpc')).length === 1, 'vuelve a correr el vigilante');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'vigilante_revisado'), 'y queda en la actividad');

  h.paso('4. Todo en orden');
  await p.evaluate(hoy => {
    window.__tablas.vigilante_resultados = [{ fecha:hoy, regla:'inscrita_sin_lead', tipo:'rojo', titulo:'x', n:0, casos:[], creado_en:hoy + 'T11:41:00Z' }];
    window.__tablas.hub_pedidos = []; window.__tablas.glamy_comentarios = []; window.__tablas.glamy_uso = [];
    window.__tablas.hub_novedades_leidas.push({ novedad_id:'nov1', usuario_id:'u2' });
    return renderReporteDia();
  }, HOY);
  await p.waitForTimeout(300);
  check((await rep()).includes('Todo en orden') && !(await rep()).includes('Datos por limpiar'), 'si no hay nada, una sola línea: "Todo en orden"');
  await h.captura('reporte-dia-todo-en-orden.png');

  h.paso('5. Si el vigilante no corrió hoy, lo dice');
  await p.evaluate(ayer => { window.__tablas.vigilante_resultados = [{ fecha:ayer, regla:'inscrita_sin_lead', tipo:'rojo', titulo:'x', n:0, casos:[], creado_en:ayer + 'T11:41:00Z' }]; return renderReporteDia(); }, AYER);
  await p.waitForTimeout(300);
  check((await rep()).includes('Hoy no corrió') && !(await rep()).includes('Todo en orden'), 'avisa que hoy no corrió');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(hoy => { window.__tablas.vigilante_resultados = [
    { fecha:hoy, regla:'r1', tipo:'rojo', titulo:'Leads "Inscrita" sin su inscripción en ese curso', n:2, casos:[], creado_en:hoy + 'T11:41:00Z' },
    { fecha:hoy, regla:'a1', tipo:'amarillo', titulo:'Inscritas sin vendedora', quien:'Cobranza', n:95, casos:[], creado_en:hoy + 'T11:41:00Z' }]; return renderReporteDia(); }, HOY);
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('reporte-dia-celular.png');

  h.paso('7. El resto del equipo conserva su Inicio');
  await p.setViewportSize({ width:1200, height:900 });
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, recibe_pedidos:false }; return renderDashboard(); });
  await p.waitForTimeout(300);
  check(!(await p.isVisible('#reporteDia')) && await p.isVisible('#dashKpis') && await p.isVisible('#inicioLeadsCard'), 'otros administradores ven sus números como antes');

  await h.terminar();
})();
