/* Ticket #1: lead de alguien que YA está inscrita en ese curso.
   - Confirmar el pago reportado ya no lo deja atorado en "Pago por confirmar": cierra el lead en
     "Inscrita (anticipo confirmado)" y abre su ficha. Si la ficha no tiene ese pago, queda escrito
     para revisarlo; si ya lo tiene, no se escribe nada (no se duplica dinero).
   - Reportar un pago en el lead de una inscrita avisa y lleva a su ficha.
   Datos de ejemplo, sin personas reales. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55000000' + id.slice(-2), telefono_alternativo:null });
const insc = (id, personaId, nombre, extra) => ({ id, persona_id:personaId, evento_id:'ev1', anticipo:700, restante:700, precio_pactado:1400,
  liquidado:false, estatus_id:11, paquete:'BASICO', asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:null,
  personas:persona(personaId, nombre), eventos:{ fecha:HOY, sede:'Salón', ciudad_id:'c1', ciudades:{ nombre:'Ciudad Prueba' } }, pagos:[], ...extra });
const lead = (id, personaId, nombre, extra) => ({ id, persona_id:personaId, evento_id:'ev1', ciudad_interes_id:'c1', paquete:'BASICO', asesor_id:'u2',
  estatus:{ id:1 }, estatus_id:1, comentario:null, personas:persona(personaId, nombre), pago_reportado_monto:700, pago_reportado_fecha:HOY,
  pago_reportado_banco:'BBVA', pago_reportado_por:'u2', pago_reportado_en:new Date().toISOString(), ...extra });

(async () => {
  const h = await abrirHub({ tablas:{
      inscripciones:[
        insc('i1', 'p01', 'Alumna Con Pago', { pagos:[{ id:'pg1', monto:700, fecha:'2026-10-09', verificacion:'confirmado' }] }),
        insc('i2', 'p02', 'Alumna Sin Pago', { anticipo:0, restante:1400 }),
        insc('i3', 'p03', 'Alumna Reporta', { anticipo:0, restante:1400 }),
      ],
      leads:[], interacciones:[], pagos:[], eventos:[{ id:'ev1', recepcion_cerrada_en:null }],
    },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(([l1, l2, l3, hoy]) => {
    EVENTOS_CAL.push({ id:'ev1', fecha:hoy, ciudad_id:'c1', ciudades:{ nombre:'Ciudad Prueba' }, sede:'Salón' });
    leadsCache.push(l1, l2, l3);
    window.renderBoard = async () => {};   // el tablero no es lo que se prueba aquí
  }, [lead('l1', 'p01', 'Alumna Con Pago'), lead('l2', 'p02', 'Alumna Sin Pago', { pago_reportado_monto:900 }),
      lead('l3', 'p03', 'Alumna Reporta', { estatus:{ id:2 }, estatus_id:2, pago_reportado_en:null, pago_reportado_monto:null }), HOY]);
  const confirmar = async leadId => {
    await p.evaluate(id => { leadAbiertoId = id; abrirModalInscribir(); }, leadId);
    await p.waitForSelector('#modalInscribir.open');
    await h.limpiarOps();
    await p.click('#guardarInscribir');
    await p.waitForTimeout(500);
  };

  h.paso('1. Confirmar: ya inscrita y el pago ya está en su ficha');
  await confirmar('l1');
  const up1 = (await h.ops('leads', 'update')).pop();
  check(up1 && up1.estatus_id === 12 && up1.comentario.includes('ya estaba inscrita'), 'el lead se cierra en "Inscrita (anticipo confirmado)" con nota');
  check((await h.ops('inscripciones', 'insert')).length === 0 && (await h.ops('pagos', 'insert')).length === 0, 'no crea otra inscripción ni otro pago');
  check(await p.evaluate(() => document.getElementById('modalInscripcion').classList.contains('open') && modalInscId === 'i1'), 'abre su ficha');
  check(await p.inputValue('#modalPagoMonto') === '' && (await p.textContent('#toast')).includes('ya está en su ficha'), 'el pago ya estaba: no se escribe nada y lo dice');
  check((await h.ops('interacciones', 'insert')).some(i => i.lead_id === 'l1') && (await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'lead_ya_inscrita'),
        'queda en el historial y en la actividad');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('2. Confirmar: ya inscrita y su ficha NO tiene ese pago → se registra el abono');
  await confirmar('l2');
  check((await h.ops('leads', 'update')).pop()?.estatus_id === 12, 'cierra el lead');
  const pg = (await h.ops('pagos', 'insert'))[0];
  check(pg && pg.inscripcion_id === 'i2' && pg.monto === 900 && pg.verificacion === 'confirmado' && pg.banco === 'BBVA' && pg.confirmado_por === 'u1',
        'quien confirma ya lo vio en el banco: el abono queda registrado como confirmado (' + JSON.stringify(pg) + ')');
  const upI = (await h.ops('inscripciones', 'update')).pop();
  check(upI && upI.anticipo === 900 && upI.restante === 500 && upI.liquidado === false && upI.estatus_id === 11, 'su saldo baja: pagó $900, debe $500');
  check((await p.textContent('#toast')).includes('registré el abono de $900') && (await p.textContent('#toast')).includes('Debe $500'), 'avisa cuánto queda debiendo');
  check(await p.inputValue('#modalPagoMonto') === '', 'no queda nada pendiente de escribir en la ficha');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'pago_confirmado' && a.detalle.includes('abono a su inscripción')), 'queda en la actividad como pago confirmado');
  await h.captura('lead-ya-inscrita-ficha.png');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('3. Reportar un pago en el lead de una inscrita');
  await p.evaluate(() => { leadAbiertoId = 'l3'; abrirRegistrarPago(); });
  await p.waitForSelector('#modalRegistrarPago.open');
  await p.fill('#regPagoMonto', '500');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('Ya está inscrita en ese curso'), 'avisa que ya está inscrita');
  await h.captura('lead-ya-inscrita-aviso.png');
  await p.click('#confirmarNo');
  await p.waitForTimeout(200);
  check((await h.ops('leads', 'update')).length === 0, 'cancelar no cambia nada');
  check((await h.ops('pagos', 'insert')).length === 0, 'reportar (sin confirmar) no registra el abono');
  await p.click('#guardarRegistrarPago');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(500);
  const up3 = (await h.ops('leads', 'update')).pop();
  check(up3 && up3.estatus_id === 12 && !('pago_reportado_monto' in up3), 'no queda "Pago por confirmar": se cierra el lead');
  check(await p.evaluate(() => modalInscId === 'i3') && await p.inputValue('#modalPagoMonto') === '500', 'abre su ficha con el pago escrito');

  h.paso('4. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('lead-ya-inscrita-celular.png');

  await h.terminar();
})();
