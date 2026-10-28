/* Fecha de pago de las inscritas (28 oct 2026, caso de una alumna que dará su abono el 03/11): la fecha de pago de una
   inscrita vive en su ficha, que es lo que lee Cobranza.
   - Cobranza: las inscritas sin pago y sin fecha ya no se esconden en "Más adelante": tienen su grupo, abierto.
   - Inscribir sin pago pide la fecha de pago (obligatoria); con anticipo, la del resto es opcional.
   - La pestaña Lead de una inscrita avisa que su fecha va en su ficha (la base la pasa sola: trigger
     promesa_de_inscrita_a_su_ficha, probado contra la base). Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55000000' + id.slice(-2), telefono_alternativo:null });
const ev = (id, dias) => ({ id, fecha:mas(dias), curso_id:'cur1', sede:'Salón', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad ' + id } });
const insc = (id, pid, nombre, extra) => ({ id, persona_id:pid, evento_id:'ev1', anticipo:0, restante:1400, liquidado:false, precio_pactado:1400, paquete:'BASICO',
  asesor_id:'u2', fecha_proximo_pago:null, notas_migracion:null, asistencia:null, estatus_id:11, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' },
  personas:persona(pid, nombre), eventos:ev('ev1', 80), pagos:[], ...extra });
const lead = (id, pid, nombre, extra) => ({ id, persona_id:pid, evento_id:'ev1', ciudad_interes_id:'cA', paquete:'BASICO', asesor_id:'u2', creado_en:new Date().toISOString(),
  estatus:{ id:2 }, estatus_id:2, comentario:null, personas:persona(pid, nombre), eventos:ev('ev1', 80), ciudades:{ nombre:'Ciudad ev1' }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{
      inscripciones:[
        insc('i1', 'p01', 'Inscrita Sin Pago Sin Fecha'),
        insc('i2', 'p02', 'Inscrita Sin Pago Con Fecha', { fecha_proximo_pago:mas(5) }),
        insc('i3', 'p03', 'Inscrita Con Anticipo', { anticipo:700, restante:700 }),
        insc('i6', 'p06', 'Inscrita Con Su Lead'),
      ],
      leads:[lead('l6', 'p06', 'Inscrita Con Su Lead', { estatus:{ id:12 }, estatus_id:12, de_inscrita:true })],
      pagos:[], interacciones:[], eventos:[{ id:'ev1', recepcion_cerrada_en:null }] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(async () => { cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA']; setActiveSection('cobranza'); await renderCobranza(); });
  await p.waitForTimeout(500);
  const grupo = g => p.$$eval(`#cobG-${g} .cob-fila .cob-nombre`, xs => xs.map(x => x.textContent));

  h.paso('1. Cobranza: las inscritas sin pago y sin fecha ya no se esconden');
  const sinpago = await grupo('sinpago');
  check(sinpago.length === 2 && sinpago.some(t => t.includes('Inscrita Sin Pago Sin Fecha')) && sinpago.some(t => t.includes('Inscrita Con Su Lead')), 'tienen su grupo: ' + sinpago.join(' | '));
  check(await p.$eval('#cobG-sinpago', d => d.open) && (await p.textContent('#cobG-sinpago summary')).includes('Inscritas sin pago · sin fecha'), 'abierto de entrada, sin filtrar');
  check(!(await grupo('despues')).some(t => t.includes('Sin Pago Sin Fecha')), 'ya no está en "Más adelante"');
  check((await grupo('semana')).some(t => t.includes('Inscrita Sin Pago Con Fecha')), 'con su fecha de pago sale en su día (esta semana)');
  check((await grupo('curso')).some(t => t.includes('Inscrita Con Anticipo')), 'con anticipo y sin fecha, como antes: se cobra en el curso');
  await h.captura('fecha-pago-cobranza.png');

  h.paso('2. Inscribir sin pago pide la fecha de pago');
  await p.evaluate(([l, hoy]) => {
    EVENTOS_CAL.push({ id:'ev1', fecha:hoy, curso_id:'cur1', ciudad_id:'cA', ciudades:{ nombre:'Ciudad ev1' }, sede:'Salón' });
    leadsCache.push(l); window.renderBoard = async () => {}; window.renderCalendario = async () => {};
    leadAbiertoId = l.id; abrirModalInscribir();
  }, [lead('l5', 'p05', 'Lead Nueva', { fecha_compromiso_pago:null, evento_id:'ev1' }), mas(80)]);
  await p.waitForSelector('#modalInscribir.open');
  await p.selectOption('#inscribirEvento', 'ev1').catch(() => {});
  await p.fill('#inscribirPagado', '0');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check(await p.isVisible('#inscribirProximo') && (await p.textContent('#inscribirProximoLabel')).includes('obligatoria'), 'sin pago: la fecha de pago es obligatoria');
  await h.captura('fecha-pago-inscribir.png');
  await h.limpiarOps();
  await p.click('#guardarInscribir');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'insert')).length === 0 && (await p.textContent('#toast')).includes('Pon la fecha de pago'), 'sin fecha no inscribe y lo explica');
  await p.fill('#inscribirProximo', mas(-2));
  await p.click('#guardarInscribir');
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'insert')).length === 0 && (await p.textContent('#toast')).includes('ya pasó'), 'una fecha que ya pasó tampoco');
  await p.fill('#inscribirProximo', mas(6));
  await p.click('#guardarInscribir');
  await p.waitForTimeout(500);
  const ins = (await h.ops('inscripciones', 'insert'))[0];
  check(ins && ins.anticipo === 0 && ins.fecha_proximo_pago === mas(6), 'con fecha se inscribe y la fecha queda en su ficha (' + JSON.stringify(ins && { a:ins.anticipo, f:ins.fecha_proximo_pago }) + ')');
  await p.evaluate(() => { cerrarModalInscripcion(); document.getElementById('modalLead').classList.remove('open'); });

  h.paso('3. Con anticipo: la fecha del resto es opcional; liquidada: no se pide');
  await p.evaluate(l => { leadsCache.push(l); leadAbiertoId = l.id; abrirModalInscribir(); }, lead('l7', 'p07', 'Lead Con Anticipo'));
  await p.waitForSelector('#modalInscribir.open');
  await p.fill('#inscribirPagado', '700'); await p.dispatchEvent('#inscribirPagado', 'input');
  check(await p.isVisible('#inscribirProximo') && !(await p.textContent('#inscribirProximoLabel')).includes('obligatoria'), 'con anticipo: "Fecha de pago de lo que falta", opcional');
  await p.fill('#inscribirPagado', '1400'); await p.dispatchEvent('#inscribirPagado', 'input');
  check(!(await p.isVisible('#inscribirProximo')), 'liquidada: no se pide');
  await p.evaluate(() => document.getElementById('modalInscribir').classList.remove('open'));

  h.paso('4. Pestaña Lead de una inscrita');
  await p.evaluate(() => { leadsCache.push(window.__tablas.leads[0]); return abrirModalLead('l6'); });
  await p.waitForTimeout(600);
  const aviso = await p.textContent('#leadAvisoInscrita');
  check(await p.isVisible('#leadAvisoInscrita') && aviso.includes('Ya está inscrita en este curso') && aviso.includes('se pasa sola a su ficha'), 'avisa que su fecha va en su ficha');
  await h.captura('fecha-pago-lead-de-inscrita.png');
  await p.click('#leadAvisoInscrita [data-ft]');
  await p.waitForTimeout(500);
  check(await p.evaluate(() => modalInscId === 'i6' && !document.getElementById('modalLead').classList.contains('open')), '"Abrir su ficha" la abre');
  await p.evaluate(() => cerrarModalInscripcion());
  await p.evaluate(l => { leadsCache.push(l); return abrirModalLead(l.id); }, lead('l8', 'p08', 'Lead Normal'));
  await p.waitForTimeout(500);
  check(!(await p.isVisible('#leadAvisoInscrita')), 'en un lead normal no sale');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(async () => { document.getElementById('modalLead').classList.remove('open'); await renderCobranza(); });
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('fecha-pago-celular.png');

  await h.terminar();
})();
