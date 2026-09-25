/* Recepción (fase 3): buscar, cobrar con un toque, extras, llegada,
   cerrar y reabrir, leads en la puerta y teclado. Datos inventados. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const EV = { id:'ev1', ciudadId:'c1', ciudad:'Ciudad Prueba', fecha:HOY, sede:'Salón Prueba', tieneInscripciones:true, liq:2, ant:2, pend:0 };
const persona = (id, nombre, tel) => ({ id, nombre, telefono_principal:tel, telefono_alternativo:null });
const base = () => ({
  eventos: [{ id:'ev1', recepcion_cerrada_en:null, recepcion_cerrada_por:null }],
  precios: [
    { id:'pr1', nombre:'Subir a VIP', clave:'subir_vip', precio:500, activo:true, orden:1 },
    { id:'pr2', nombre:'Uniforme', clave:null, precio:null, activo:true, orden:2 },
  ],
  inscripciones: [
    { id:'a', evento_id:'ev1', anticipo:1400, restante:500, precio_pactado:1900, liquidado:false, estatus_id:11, paquete:'VIP', asesor_id:'u2', notas_migracion:null, asistencia:null, asistencia_en:null, estatus_antes_de_cierre:null,
      personas:persona('pa','Ana Arce Prueba','0000001111'), pagos:[{ monto:1400, fecha:'2026-09-01', banco:'BBVA', forma_pago:null, concepto:'curso' }] },
    { id:'b', evento_id:'ev1', anticipo:1400, restante:0, precio_pactado:1400, liquidado:true, estatus_id:12, paquete:'BASICO', asesor_id:'u2', notas_migracion:null, asistencia:null, asistencia_en:null, estatus_antes_de_cierre:null,
      personas:persona('pb','Bea Bustos Prueba','0000002222'), pagos:[] },
    { id:'c', evento_id:'ev1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO', asesor_id:'u1', notas_migracion:'Nota previa', asistencia:null, asistencia_en:null, estatus_antes_de_cierre:null,
      personas:persona('pc','Carla Cruz Prueba','0000003333'), pagos:[] },
    { id:'d', evento_id:'ev1', anticipo:1400, restante:0, precio_pactado:1400, liquidado:true, estatus_id:12, paquete:'BASICO', asesor_id:'u1', notas_migracion:null, asistencia:'llego', asistencia_en:'2026-09-25T15:00:00Z', estatus_antes_de_cierre:null,
      personas:persona('pd','Dora Díaz Prueba','0000004444'), pagos:[{ monto:1400, fecha:HOY, banco:'Efectivo', forma_pago:'Efectivo', concepto:'curso' }] },
    { id:'e', evento_id:'ev1', anticipo:500, restante:900, precio_pactado:1400, liquidado:false, estatus_id:6, paquete:'BASICO', asesor_id:'u1', notas_migracion:null, asistencia:null, asistencia_en:null, estatus_antes_de_cierre:null,
      personas:persona('pe','Eva Estrada Prueba','0000005555'), pagos:[] },
  ],
  leads: [
    { id:'l1', evento_id:'ev1', estatus_id:1, asesor_id:'u2', paquete:'BASICO', pago_reportado_monto:700, pago_reportado_banco:'Azteca', pago_reportado_fecha:'2026-09-20',
      fecha_compromiso_pago:'2026-09-20', personas:persona('pl','Lucía Luna Prueba','0000006666'), estatus:{ id:1, clave:'pago_por_confirmar' } },
  ],
});

(async () => {
  const h = await abrirHub({ ancho:1366, alto:768, tablas:base() });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  const abrir = async (tablas) => {
    await p.evaluate(([t, ev]) => { window.__tablas = t; window.__ops = []; return abrirRecepcion(ev); }, [tablas || base(), EV]);
    await p.waitForTimeout(200);
  };
  const updates = tabla => h.ops(tabla || 'inscripciones', 'update');
  const sel = () => p.evaluate(() => rec?.sel);
  const tecla = async k => { await p.keyboard.press(k); await p.waitForTimeout(80); };
  const fuera = () => p.evaluate(() => document.activeElement.blur());

  h.paso('1. Abre con contadores y la lista de quien falta');
  await abrir();
  check(await p.isVisible('#recepcion'), 'se ve la Recepción');
  check((await txt('#recKpiLlegaron .v')) === '1/4', 'llegaron 1/4 (Eva “no va” no cuenta): ' + await txt('#recKpiLlegaron .v'));
  check((await txt('#recKpiCobrado .v')) === '$1,400', 'cobrado hoy $1,400 (el pago de hoy de Dora)');
  check(await p.evaluate(() => document.activeElement.id) === 'recBuscar', 'el cursor ya está en el buscador');
  const filas = await p.$$eval('#recLista .rec-fila .nom', els => els.map(e => e.textContent));
  check(filas.join('|') === 'Ana Arce Prueba|Bea Bustos Prueba|Carla Cruz Prueba', 'Faltan: Ana, Bea, Carla: ' + filas.join('|'));
  check((await txt('#recFiltros')).includes('Leads 1'), 'hay filtro de Leads');
  await h.captura('recepcion-computadora.png');

  h.paso('2. Buscar por apellido o teléfono');
  await p.fill('#recBuscar', 'arce');
  check((await p.$$('#recLista .rec-fila')).length === 1 && await sel() === 'i:a', 'solo Ana');
  await p.fill('#recBuscar', '4444');
  check(await sel() === 'i:d', 'por teléfono encuentra a Dora aunque ya llegó');
  await p.fill('#recBuscar', 'luna');
  check(await sel() === 'l:l1', 'encuentra al lead');
  await p.fill('#recBuscar', 'arce');
  await tecla('Enter');
  check(await p.evaluate(() => document.activeElement.id) !== 'recBuscar', 'Enter sale del buscador');
  check((await txt('#recPanel')).includes('Debe') && (await txt('#recCobrar')).includes('Liquida $500'), 'Ana: Debe $500 y botón Liquida $500');
  check((await txt('#recPanel')).includes('BBVA'), 'muestra cómo pagó el anticipo');

  h.paso('3. Sin forma de pago no cobra');
  await tecla('p');
  check((await txt('#recNota')).includes('Elige la forma de pago'), 'pide la forma de pago');
  check((await h.ops('pagos', 'insert')).length === 0, 'no registró nada');

  h.paso('4. 1 = Efectivo, P = cobra, pasa a la siguiente');
  await tecla('1');
  check(await p.getAttribute('[data-rec-forma="Efectivo"]', 'class').then(c => c.includes('on')), 'Efectivo marcado');
  await tecla('p');
  await p.waitForTimeout(150);
  let pg = await h.ops('pagos', 'insert');
  check(pg.length === 1 && Array.isArray(pg[0]) && pg[0].length === 1, 'un solo insert de pagos');
  const p0 = pg[0][0];
  check(p0.monto === 500 && p0.concepto === 'curso' && p0.forma_pago === 'Efectivo' && p0.banco === 'Efectivo' && p0.fecha === (await p.evaluate(() => hoyISO())) && p0.inscripcion_id === 'a' && p0.confirmado_por === 'u1', 'pago $500 efectivo de Ana: ' + JSON.stringify(p0));
  let up = (await updates()).find(u => 'anticipo' in u);
  check(up && up.anticipo === 1900 && up.restante === 0 && up.liquidado === true && up.estatus_id === 12 && up.asistencia === 'llego' && up.asistencia_por === 'u1', 'Ana liquidada, Pagó el curso y llegó: ' + JSON.stringify(up));
  check((await txt('#recKpiLlegaron .v')) === '2/4' && (await txt('#recKpiCobrado .v')) === '$1,900', 'contadores 2/4 y $1,900');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'pago_registrado' && a.detalle.includes('$500') && a.detalle.includes('efectivo')), 'queda en Actividad');
  await p.waitForTimeout(900);
  check(await sel() === 'i:b', 'pasó sola a Bea: ' + await sel());
  check(await p.evaluate(() => document.activeElement.id) === 'recBuscar' && await p.inputValue('#recBuscar') === '', 'buscador limpio y listo');

  h.paso('5. Liquidada que llega: L marca llegada');
  await fuera();
  check((await txt('#recPanel')).includes('Marcar llegada'), 'Bea: botón Marcar llegada');
  await h.limpiarOps();
  await tecla('l');
  await p.waitForTimeout(150);
  up = await updates();
  check(up.length === 1 && up[0].asistencia === 'llego' && !('anticipo' in up[0]) && !('estatus_id' in up[0]), 'solo la llegada: ' + JSON.stringify(up));
  check((await txt('#recKpiLlegaron .v')) === '3/4', 'llegaron 3/4');
  await p.waitForTimeout(800);
  check(await sel() === 'i:c', 'pasó a Carla');

  h.paso('6. VIP + uniforme sin precio: se pone el precio y se cobra todo junto');
  await fuera();
  await tecla('v');
  check((await txt('#recCobrar')).includes('$1,200'), 'con VIP: Liquida $1,200');
  await tecla('u');
  check(await p.isVisible('#recPrecioExtra'), 'pide el precio del uniforme');
  await p.fill('#recPrecioExtra', '350');
  await p.press('#recPrecioExtra', 'Enter');
  await p.waitForTimeout(200);
  check((await updates('precios')).some(u => u.precio === 350 && u.actualizado_por === 'u1'), 'el precio quedó en Precios para todos');
  check((await txt('#recCobrar')).includes('$1,550') && (await txt('#recPanel')).includes('Uniforme $350'), 'total $1,550 con el desglose');
  await tecla('2');
  await h.limpiarOps();
  await tecla('p');
  await p.waitForTimeout(200);
  pg = (await h.ops('pagos', 'insert'))[0] || [];
  check(pg.length === 2 && pg[0].monto === 1200 && pg[0].concepto === 'curso' && pg[1].monto === 350 && pg[1].concepto === 'Uniforme' && pg.every(x => x.forma_pago === 'Tarjeta'), 'curso $1,200 + uniforme $350 en tarjeta: ' + JSON.stringify(pg));
  up = (await updates()).find(u => 'paquete' in u);
  check(up && up.paquete === 'VIP' && up.precio_pactado === 1900 && up.anticipo === 1900 && up.restante === 0 && up.liquidado === true && up.estatus_id === 12, 'Carla sube a VIP y queda liquidada: ' + JSON.stringify(up));
  check((await txt('#recKpiLlegaron .v')) === '4/4' && (await txt('#recKpiCobrado .v')) === '$3,450', 'llegaron 4/4, cobrado $3,450');

  h.paso('7. Quitar una llegada pide confirmación');
  await p.evaluate(() => { rec.filtro = 'todas'; seleccionarRecepcion('i:d'); });
  await p.click('#recQuitarLlegada');
  await p.waitForTimeout(100);
  check(await p.isVisible('#modalConfirmar.open'), 'pregunta');
  await h.limpiarOps();
  await p.click('#confirmarSi');
  await p.waitForTimeout(150);
  check((await updates()).some(u => u.asistencia === null), 'quitó la llegada');

  h.paso('8. Comentario se guarda solo');
  await h.limpiarOps();
  await p.fill('#recComent', 'Trae a su hija');
  await p.waitForTimeout(800);
  check((await updates()).some(u => u.notas_migracion === 'Trae a su hija'), 'guardó el comentario');
  check((await txt('#recComentEstado')).includes('✓ Guardado'), 'dice ✓ Guardado');

  h.paso('9. Si falla el pago, no se da por cobrado; Reintentar');
  await abrir();
  await p.evaluate(() => { seleccionarRecepcion('i:a'); rec.forma = 'Efectivo'; pintarPanelRecepcion(); });
  await h.fallar(op => op.tabla === 'pagos' && op.tipo === 'insert');
  await p.click('#recCobrar');
  await p.waitForTimeout(200);
  check((await txt('#recPanel')).includes('El cobro NO se hizo') && await p.isVisible('#recReintentar'), 'avisa y ofrece Reintentar');
  check((await updates()).length === 0 && (await txt('#recKpiCobrado .v')) === '$1,400', 'no tocó el saldo ni el contador');
  await h.fallar(null);
  await p.click('#recReintentar');
  await p.waitForTimeout(200);
  check((await updates()).some(u => u.liquidado === true), 'Reintentar cobra');

  h.paso('10. Si el pago entra pero el saldo no, avisa y NO ofrece reintentar');
  await abrir();
  await p.evaluate(() => { seleccionarRecepcion('i:c'); rec.forma = 'Efectivo'; pintarPanelRecepcion(); });
  await h.fallar(op => op.tabla === 'inscripciones' && op.tipo === 'update');
  await p.click('#recCobrar');
  await p.waitForTimeout(300);
  check((await txt('#recPanel')).includes('SÍ se registró') && !(await p.isVisible('#recReintentar')), 'dice que sí se registró, sin Reintentar');
  await h.fallar(null);

  h.paso('11. Leads en la puerta');
  await abrir();
  await p.click('[data-rec-filtro="leads"]');
  check(await sel() === 'l:l1', 'lista de leads');
  check((await txt('#recPanel')).includes('Reportó $700') && (await txt('#recLead')).includes('Registrar pago'), 'sin permiso: Registrar pago');
  await p.evaluate(() => { PERMISOS_ACCION_CACHE = { 'Logística': new Set(['confirmar_pagos']) }; pintarPanelRecepcion(); });
  check((await txt('#recLead')).includes('Confirmar pago e inscribir'), 'con permiso: Confirmar pago e inscribir');
  await p.evaluate(() => { PERMISOS_ACCION_CACHE = {}; });

  h.paso('12. Cerrar recepción: quien falta pasa a No llegó');
  const t = base();
  t.inscripciones[0].asistencia = null;   // Ana debe y no llegó
  await abrir(t);
  await h.limpiarOps();
  await p.click('#recCerrar');
  await p.waitForTimeout(100);
  const aviso = await txt('#confirmarAviso');
  check(aviso.includes('3') && aviso.includes('No llegó') && aviso.includes('Ana Arce Prueba'), 'resumen con quiénes: ' + aviso);
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  up = await updates();
  const deAna = up.find(u => u.estatus_id === 14);
  check(deAna && deAna.asistencia === 'no_llego' && deAna.estatus_antes_de_cierre === 11, 'a quien debe: No llegó (14) y guarda su estatus 11: ' + JSON.stringify(up));
  const deBea = up.find(u => u.estatus_antes_de_cierre === 12);
  check(deBea && deBea.asistencia === 'no_llego' && !('estatus_id' in deBea), 'liquidada que no llegó conserva su estatus');
  check(!up.some(u => u.estatus_antes_de_cierre === 6), 'Eva (no va al curso) no se toca');
  check((await updates('eventos')).some(u => u.recepcion_cerrada_en && u.recepcion_cerrada_por === 'u1'), 'el evento queda cerrado');
  check(await p.isVisible('#recAvisoCerrada') && !(await p.isVisible('#recCerrar')), 'aviso de cerrada y sin botón de cerrar');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'recepcion_cerrada'), 'queda en Actividad');
  const filasA = await h.filas('inscripciones');
  check(filasA.find(i => i.id === 'a').estatus_id === 14 && filasA.find(i => i.id === 'c').estatus_id === 14, 'Ana y Carla en No llegó');

  h.paso('13. Llega tarde: recupera su estatus');
  await p.evaluate(() => { rec.filtro = 'todas'; seleccionarRecepcion('i:a'); });
  await fuera();
  await h.limpiarOps();
  await tecla('l');
  await p.waitForTimeout(150);
  up = await updates();
  check(up.some(u => u.asistencia === 'llego' && u.estatus_id === 11 && u.estatus_antes_de_cierre === null), 'Ana vuelve a su estatus 11: ' + JSON.stringify(up));

  h.paso('14. Reabrir regresa a todas');
  await h.limpiarOps();
  await p.click('#recReabrir');
  await p.waitForTimeout(100);
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  up = await updates();
  check(up.some(u => u.asistencia === null && u.estatus_id === 12) && up.some(u => u.asistencia === null && u.estatus_id === 11), 'Bea a 12 y Carla a 11: ' + JSON.stringify(up));
  check((await updates('eventos')).some(u => u.recepcion_cerrada_en === null), 'el evento se reabre');

  h.paso('15. Cobranza ya no muestra a No llegó ni Perdió anticipo');
  const cob = await p.evaluate(async () => {
    window.__tablas.cursos = [{ id:'cur1', nombre:CURSO_ACTIVO_NOMBRE }]; cursoActivoIdCache = undefined;
    window.__tablas.inscripciones = [
      { id:'x1', liquidado:false, restante:500, estatus:{ id:11, clave:'anticipo_vigente' }, personas:{ nombre:'Uno' }, eventos:{ fecha:'2026-09-30', curso_id:'cur1' } },
      { id:'x2', liquidado:false, restante:500, estatus:{ id:14, clave:'no_llego' }, personas:{ nombre:'Dos' }, eventos:{ fecha:'2026-09-30', curso_id:'cur1' } },
      { id:'x3', liquidado:false, restante:500, estatus:{ id:15, clave:'perdio_anticipo' }, personas:{ nombre:'Tres' }, eventos:{ fecha:'2026-09-30', curso_id:'cur1' } },
    ];
    const ok = await cargarCobranza();
    return ok ? cobDatos.inscritas.map(i => i.id).join(',') : 'no cargó';
  });
  check(cob === 'x1', 'Cobranza solo con la que sí debe: ' + cob);

  h.paso('16. Teclado: Ctrl+K y Esc');
  await abrir();
  await fuera();
  await tecla('Control+k');
  check(await p.evaluate(() => document.activeElement.id) === 'recBuscar', 'Ctrl+K enfoca el buscador');
  await p.fill('#recBuscar', 'bea');
  await tecla('Escape');
  check(await p.inputValue('#recBuscar') === '' && (await p.$$('#recLista .rec-fila')).length === 3, 'Esc limpia la búsqueda');

  h.paso('17. Entrar desde la hoja del día y volver');
  await p.evaluate(() => cerrarRecepcion());
  check(!(await p.isVisible('#recepcion')), 'se cierra');
  await p.evaluate(ev => { calendarioDias[ev.fecha] = [ev]; abrirSheetCalendario(ev.fecha); }, EV);
  await p.waitForTimeout(200);
  check(await p.isVisible('[data-recepcion-evt="0"]'), 'botón Entrar a recepción en la hoja');
  await p.evaluate(t => { window.__tablas = t; }, base());
  await p.click('[data-recepcion-evt="0"]');
  await p.waitForTimeout(250);
  check(await p.isVisible('#recepcion') && (await txt('#recCiudad')).includes('Ciudad Prueba'), 'abre la Recepción del curso');
  await p.click('#recVolver');
  check(!(await p.isVisible('#recepcion')), '← Calendario la cierra');

  h.paso('18. Laptop y celular');
  await abrir();
  check(await p.evaluate(() => { const r = document.getElementById('recepcion'); return r.scrollHeight <= window.innerHeight + 1; }), 'en 1366×768 cabe sin scroll de página');
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.getElementById('recepcion').scrollWidth <= window.innerWidth + 1), 'en celular sin scroll horizontal');
  await h.captura('recepcion-celular.png');

  await h.terminar();
})();
