/* Auditoría de dinero y embudos (23 oct 2026): una sola definición de "lo que está en puerta" y una sola
   clasificación de pago por inscrita (situacionPagoInsc = situacion_pago de la base), la 🧹 Bandeja de
   limpieza y los candados (pago doble y "Pago por confirmar" sin datos). Datos de ejemplo. */
const { abrirHub, ESTATUS_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ESTATUS = [...ESTATUS_EJEMPLO, { id:9, clave:'algo_esta_mal', etiqueta:'Algo está mal' }];
const ev = (id, dias, ciudad) => ({ id, fecha:mas(dias), curso_id:'cur1', ciudad_id:ciudad, sede:'Salón', recepcion_cerrada_en:null,
  ciudades:{ id:ciudad, nombre:'Ciudad ' + ciudad }, cursos:{ nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF' } });
const EVENTOS = [ev('evA', 60, 'cA'), ev('evB', 70, 'cB'), ev('evP', -5, 'cP')];
const evDe = id => EVENTOS.find(e => e.id === id);
let n = 0;
const insc = (nombre, evId, extra) => ({ id:'i' + (++n), persona_id:'pi' + n, evento_id:evId, anticipo:700, restante:700, precio_pactado:1400, liquidado:false,
  estatus_id:11, asistencia:null, paquete:'BASICO', asesor_id:'u2', fecha_proximo_pago:null, estatus_antes_de_cierre:null, notas_migracion:null,
  personas:{ id:'pi' + n, nombre, telefono_principal:'55000000' + String(n).padStart(2, '0') }, estatus:{ id:11, clave:'anticipo_vigente' },
  eventos:evDe(evId), pagos:[{ monto:700, verificacion:'confirmado' }], ...extra });
const lead = (id, nombre, extra) => ({ id, persona_id:'p' + id, estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:null, eventos:null,
  creado_en:new Date().toISOString(), comentario:null, personas:{ id:'p' + id, nombre, telefono_principal:'5511111111' }, ...extra });

const INSCRITAS = [
  insc('Con Pago Por Confirmar', 'evA', { pagos:[{ monto:700, verificacion:'por_confirmar' }] }),
  insc('Liquidada Por Confirmar', 'evA', { anticipo:1400, restante:0, liquidado:true, estatus_id:12, estatus:{ id:12, clave:'pagado' },
    pagos:[{ monto:700, verificacion:'confirmado' }, { monto:700, verificacion:'por_confirmar' }] }),
  insc('Curso Ya Paso Debe', 'evP'),
  insc('Hay Que Verificar', 'evB', { estatus_id:9, estatus:{ id:9, clave:'algo_esta_mal' } }),
  insc('No Va Ya', 'evA', { estatus_id:6, estatus:{ id:6, clave:'no_va_al_curso' } }),
  insc('Ya Inscrita Sin Reporte', 'evA', { persona_id:'plYa', anticipo:1400, restante:0, liquidado:true, estatus_id:12, estatus:{ id:12, clave:'pagado' } }),
  insc('Ya Inscrita Con Reporte', 'evB', { persona_id:'plYaPC', anticipo:1400, restante:0, liquidado:true, estatus_id:12, estatus:{ id:12, clave:'pagado' } }),
];
const LEADS = [
  lead('lOk', 'Lead De La Gira'),
  lead('lFuera', 'Lead Ciudad Fuera', { ciudad_interes_id:'cZ' }),
  lead('lSin', 'Lead Sin Ciudad', { ciudad_interes_id:null }),
  lead('lPasado', 'Lead Curso Pasado', { evento_id:'evP', eventos:evDe('evP') }),
  lead('lYa', 'Lead Ya Inscrita', { evento_id:'evA', eventos:evDe('evA') }),
  lead('lYaPC', 'Lead Ya Inscrita Reporto', { evento_id:'evB', eventos:evDe('evB'), estatus_id:1, estatus:{ id:1 },
    pago_reportado_monto:900, pago_reportado_en:new Date().toISOString() }),
  lead('lPC', 'Lead PC Sin Datos', { estatus_id:1, estatus:{ id:1 } }),
];
const BANDEJA = [
  { tipo:'ciudad_fuera', lead_id:'lFuera', inscripcion_id:null, nombre:'LEAD CIUDAD FUERA', telefono:'5511111111', asesor_id:'u2', detalle:'Su ciudad (Ciudad Z) no está en la gira que viene' },
  { tipo:'pc_sin_datos', lead_id:'lPC', inscripcion_id:null, nombre:'LEAD PC SIN DATOS', telefono:'5511111111', asesor_id:'u2', detalle:'En "Pago por confirmar" sin los datos del pago' },
  { tipo:'sin_ciudad', lead_id:'lSin', inscripcion_id:null, nombre:'LEAD SIN CIUDAD', telefono:'5511111111', asesor_id:null, detalle:'Lead abierto sin ciudad ni curso' },
  { tipo:'pago_doble', lead_id:null, inscripcion_id:'i1', nombre:'CON PAGO POR CONFIRMAR', telefono:'5500000001', asesor_id:'u2', detalle:'Pago de $700 del 12/10 capturado 2 veces con 2 min de diferencia' },
];

(async () => {
  const h = await abrirHub({ estatus:ESTATUS, tablas:{
      cursos:[{ id:'cur1', nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF' }], eventos:EVENTOS,
      inscripciones:INSCRITAS, leads:LEADS, pagos:[], interacciones:[] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(async bandeja => {
    window.__rpc.bandeja_limpieza = () => bandeja;
    cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA', 'cB'];
    setActiveSection('cobranza');
    await renderCobranza();
  }, BANDEJA);
  await p.waitForTimeout(600);
  const grupo = g => p.$$eval(`#cobG-${g} .cob-fila .cob-nombre`, xs => xs.map(x => x.textContent));
  const todos = async () => (await p.$$eval('#cobGrupos .cob-fila .cob-nombre', xs => xs.map(x => x.textContent))).join(' | ');

  h.paso('1. Una sola clasificación de pago (Hub = base)');
  const casos = await p.evaluate(() => {
    const c = (estatus, extra) => situacionPagoInsc({ anticipo:0, precio_pactado:1400, liquidado:false, estatus:{ clave:estatus }, pagos:[], ...extra });
    return [c('no_va_al_curso'), c('perdio_anticipo'), c('anticipo_vigente', { asistencia:'no_llego' }), c('algo_esta_mal', { anticipo:700 }),
      c('pagado', { anticipo:1400, liquidado:true, pagos:[{ verificacion:'por_confirmar' }] }), c('pagado', { anticipo:1400, liquidado:true }),
      c('anticipo_vigente', { anticipo:1400 }), c('anticipo_vigente', { anticipo:700 }), c('no_vence_pago')].join(',');
  });
  check(casos === 'no_va,no_va,no_llego,verificar,por_confirmar,liquidada,liquidada,anticipo,sin_pago', 'misma tabla de verdad que situacion_pago (' + casos + ')');

  h.paso('2. Cobranza: inscritas con pago por confirmar van a 🟣');
  const conf = await grupo('confirmar');
  check(conf.some(t => t.includes('Con Pago Por Confirmar') && t.includes('Inscrita · pago por confirmar')), 'la inscrita con su pago por confirmar está en 🟣 (antes se quedaba como si nada)');
  check(conf.some(t => t.includes('Liquidada Por Confirmar')), 'también la que ya no debe pero su pago aún no se confirma');
  await p.evaluate(() => { document.getElementById('cobG-confirmar').open = true; });
  const filaPC = await p.textContent('#cobG-confirmar .cob-fila[data-cob-id="i1"]');
  check(filaPC.includes('🏦 $700 por confirmar') && filaPC.includes('debe $700') && filaPC.includes('confírmalo en su ficha'), 'dice cuánto falta confirmar y cuánto debe');
  check(!(await todos()).includes('No Va Ya'), 'las que no van no salen');

  h.paso('3. Curso ya pasó · debe, aparte');
  const pasado = await grupo('pasado');
  check(pasado.length === 1 && pasado[0].includes('Curso Ya Paso Debe') && !(await grupo('vencidos')).some(t => t.includes('Curso Ya Paso')), 'va a ⏳ "Curso ya pasó · debe", no a Vencidos');
  check((await p.textContent('#cobG-pasado summary')).includes('Curso ya pasó · debe'), 'con su letrero');
  check((await p.textContent('.cob-fila[data-cob-id="i4"]')).includes('⚠ Verificar antes de cobrar'), 'la marcada "algo está mal" dice Verificar antes de cobrar');

  h.paso('4. Solo leads de la gira que viene, sin contar doble');
  const t = await todos();
  check(t.includes('Lead De La Gira'), 'el lead de una ciudad que se visita sí sale');
  check(!t.includes('Lead Ciudad Fuera') && !t.includes('Lead Sin Ciudad') && !t.includes('Lead Curso Pasado'), 'fuera: ciudad que no se visita, sin ciudad y curso pasado');
  check(!t.includes('Lead Ya Inscrita Sin Reporte') && !/Lead Ya Inscrita(?! Reporto)/.test(t), 'el lead de alguien ya inscrita en ese curso no cuenta doble');
  const yaPC = conf.find(x => x.includes('Lead Ya Inscrita Reporto'));
  check(yaPC && yaPC.includes('Lead · ya inscrita'), 'pero si reportó un pago se queda en 🟣 (ese dinero aún no está en su ficha)');
  await h.captura('gira-en-puerta-cobranza.png');

  h.paso('5. 🧹 Bandeja de limpieza');
  const resumen = await p.textContent('#cobBandeja summary');
  check(resumen.includes('Bandeja de limpieza') && resumen.includes('4 por revisar') && resumen.includes('💰 2 con dinero de por medio'), 'cuenta lo que hay y lo que trae dinero: ' + resumen.trim().replace(/\s+/g, ' '));
  const tipos = await p.$$eval('#cobBandeja [data-bj-tipo]', xs => xs.map(x => x.dataset.bjTipo + (x.open ? ':abierto' : '')));
  check(tipos.join(',') === 'pc_sin_datos:abierto,pago_doble:abierto,ciudad_fuera,sin_ciudad', 'lo de dinero va primero y abierto: ' + tipos.join(','));
  await p.evaluate(() => { const b = document.querySelector('#cobBandeja .cob-bandeja'); b.open = true; b.scrollIntoView(); });
  await h.captura('gira-en-puerta-bandeja.png');
  await p.click('#cobBandeja [data-bj-lead="lPC"]');
  await p.waitForSelector('#modalLead.open');
  check((await p.textContent('#modalLeadNombre')).includes('Lead PC Sin Datos'), '"Abrir" abre la ficha del lead');

  h.paso('6. Candado: "Pago por confirmar" sin datos del pago');
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open'); if(!leadsCache.some(l => l.id === 'lOk')) leadsCache.push(window.__tablas.leads.find(l => l.id === 'lOk')); return abrirModalLead('lOk'); });
  await p.selectOption('#modalEstatusSelect', '1');
  await h.limpiarOps();
  await p.click('#guardarLead');
  await p.waitForTimeout(300);
  check((await h.ops('leads', 'update')).length === 0 && (await p.textContent('#toast')).includes('💜 Registrar pago'), 'no deja: pide 💜 Registrar pago');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('7. Candado: el mismo pago dos veces');
  await p.evaluate(() => { window.__tablas.pagos = [{ id:'pgX', inscripcion_id:'i4', monto:700, fecha:'2026-10-12', hora:'09:52:22', verificacion:'confirmado' }]; });
  await p.evaluate(() => abrirModalInscripcion('i4'));
  await p.waitForTimeout(300);
  await p.fill('#modalPagoMonto', '700');
  await p.fill('#modalPagoFecha', '2026-10-12');
  await h.limpiarOps();
  await p.click('#guardarInscPago');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('ya tiene un pago de $700') && (await p.textContent('#modalConfirmar')).includes('09:52'), 'pregunta: ya tiene un pago igual');
  await h.captura('gira-en-puerta-pago-doble.png');
  await p.click('#confirmarNo');
  await p.waitForTimeout(300);
  check((await h.ops('pagos', 'insert')).length === 0, 'si no es otro pago, no se registra');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'pago_doble_evitado'), 'queda en la actividad');
  await p.fill('#modalPagoFecha', '2026-10-13');
  await p.click('#guardarInscPago');
  await p.waitForTimeout(400);
  check((await h.ops('pagos', 'insert')).length === 1, 'otro día sí se registra sin preguntar');

  h.paso('8. Calendario: misma clasificación');
  await p.evaluate(async () => { inicioGiraCache = null; window.__tablas.inscripciones = window.__tablas.inscripciones.filter(i => i.id !== 'i6' && i.id !== 'i7'); setActiveSection('calendario'); await renderCalendario(); });
  await p.waitForTimeout(300);
  const dA = await p.evaluate(f => { const e = (calendarioDias[f] || [])[0]; return e && [e.liq, e.ant, e.pend].join('/'); }, EVENTOS[0].fecha);
  check(dA === '0/2/0', 'la que no va no cuenta y la liquidada con pago por confirmar no sale liquidada (' + dA + ')');

  h.paso('9. Inicio: la gira que viene');
  await p.evaluate(async () => { window.__tablas.leads = window.__tablas.leads.map(l => ({ ...l })); await renderDashboard(); });
  await p.waitForTimeout(300);
  const kpis = await p.textContent('#dashKpis');
  check(kpis.includes('Leads abiertos de la gira') && kpis.includes('Inscritas de la gira') && !kpis.includes('Leads totales'), 'ya no cuenta "Leads totales" de toda la historia');
  const nLeads = await p.$eval('#dashKpis .kpi .v', x => x.textContent);
  check(nLeads === '4', 'solo cuenta los leads de la gira que viene (' + nLeads + ' de 7)');

  h.paso('10. Celular');
  await p.evaluate(async () => { setActiveSection('cobranza'); await renderCobranza(); });
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.evaluate(() => { const b = document.querySelector('#cobBandeja .cob-bandeja'); if(b){ b.open = true; b.scrollIntoView(); } });
  await h.captura('gira-en-puerta-celular.png');

  await h.terminar();
})();
