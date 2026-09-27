/* ⭐ VIP: marcar el paquete en el lead (nuevo y ficha), etiqueta en el
   tablero, VIP primero en Recepción y "Cambiar a VIP" en la ficha. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const P = (id, nombre) => ({ id, nombre, telefono_principal:'00000000' + id.slice(-2), telefono_alternativo:null });
const ins = (id, extra) => ({ id, evento_id:'ev1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:null, asistencia:null, estatus_antes_de_cierre:null, pagos:[], ...extra });
const LEAD = { id:'l1', evento_id:'ev1', estatus_id:2, estatus:{ id:2, clave:'no_vence_pago', etiqueta:'Aún no vence su pago' }, asesor_id:'u2', paquete:null,
  personas:P('pl1', 'Lucía Lead Prueba'), eventos:null, cursos:null, ciudades:null };

(async () => {
  const h = await abrirHub({ ancho:1366, alto:768, tablas:{
    eventos:[{ id:'ev1', recepcion_cerrada_en:null }],
    precios:[{ id:'pr1', nombre:'Subir a VIP', clave:'subir_vip', precio:500, activo:true, orden:1 }],
    inscripciones:[
      ins('a', { personas:P('pa1', 'Ana Básica Prueba') }),
      ins('b', { personas:P('pb2', 'Zoe Vip Prueba'), paquete:'VIP', precio_pactado:1900, restante:1200 }),
      ins('c', { personas:P('pc3', 'Carla Vip Llegó Prueba'), paquete:'VIP', precio_pactado:1900, anticipo:1900, restante:0, liquidado:true, estatus_id:12, asistencia:'llego' }),
    ],
    leads:[{ ...LEAD, id:'l2', paquete:'VIP', personas:P('pl2', 'Luz Lead Vip Prueba') }],
    personas:[], pagos:[],
  } });
  const { p, check } = h;
  const txt = s => p.textContent(s);

  h.paso('1. Ficha del lead: marcar VIP se guarda solo');
  await p.evaluate(lead => { leadsCache = [lead]; return abrirModalLead('l1'); }, LEAD);
  await p.waitForTimeout(200);
  check(await p.getAttribute('#leadPaquete [data-paq="BASICO"]', 'class').then(c => c.includes('active')), 'sin paquete se ve Básico');
  await h.limpiarOps();
  await p.click('#leadPaquete [data-paq="VIP"]');
  await p.waitForTimeout(150);
  check((await h.ops('leads', 'update')).some(u => u.paquete === 'VIP' && Object.keys(u).length === 1), 'guardó solo el paquete');
  check((await txt('#leadPaqueteEstado')).includes('✓ Guardado'), '✓ Guardado');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'paquete_cambiado' && a.detalle.includes('⭐ VIP')), 'Actividad');
  await h.limpiarOps();
  await p.click('#leadPaquete [data-paq="VIP"]');
  await p.waitForTimeout(100);
  check((await h.ops('leads', 'update')).length === 0, 'tocar el mismo no guarda otra vez');
  await h.fallar(op => op.tabla === 'leads' && op.tipo === 'update');
  await p.click('#leadPaquete [data-paq="BASICO"]');
  await p.waitForTimeout(150);
  check((await txt('#leadPaqueteEstado')).includes('No se guardó') && await p.getAttribute('#leadPaquete [data-paq="VIP"]', 'class').then(c => c.includes('active')), 'si falla, avisa y regresa a VIP');
  await h.fallar(null);
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('2. Tablero: etiqueta ⭐ VIP');
  const tl = await p.evaluate(l => tarjetaLead({ ...l, paquete:'VIP' }), LEAD);
  const ti = await p.evaluate(() => tarjetaInscrito({ id:'x', paquete:'VIP', personas:{ nombre:'X' }, restante:0, anticipo:1900, precio_pactado:1900, estatus:{ id:12 } }));
  const tb = await p.evaluate(l => tarjetaLead(l), LEAD);
  check(tl.includes('badge-vip') && ti.includes('badge-vip') && !tb.includes('badge-vip'), 'lead e inscrita VIP con ⭐; Básico sin');

  h.paso('3. Nuevo lead con paquete VIP');
  await p.evaluate(() => document.getElementById('btnNuevoLead').click());
  await p.waitForTimeout(150);
  check(await p.getAttribute('#nuevoPaquete [data-paq="BASICO"]', 'class').then(c => c.includes('active')), 'arranca en Básico');
  await p.fill('#nuevoNombre', 'Nueva Vip Prueba');
  await p.fill('#nuevoTelefono', '0000000099');
  await p.click('#nuevoPaquete [data-paq="VIP"]');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(400);
  const nl = (await h.ops('leads', 'insert'))[0];
  check(nl && nl.paquete === 'VIP', 'el lead se crea VIP: ' + JSON.stringify(nl));
  await p.evaluate(() => document.getElementById('modalNuevo').classList.remove('open'));

  h.paso('4. Recepción: VIP que faltan hasta arriba');
  await p.evaluate(hoy => abrirRecepcion({ id:'ev1', ciudad:'Ciudad Prueba', fecha:hoy, sede:'S' }), HOY);
  await p.waitForTimeout(250);
  let lista = await p.$$eval('#recLista > *', els => els.map(e => e.classList.contains('rec-grupo') ? '[' + e.textContent.trim() + ']' : e.dataset.recKey));
  check(lista.join() === '[⭐ VIP · pasan primero (1)],i:b,[Las demás],i:a', 'Faltan: Zoe VIP arriba con su encabezado: ' + lista.join());
  check(await p.isVisible('#recKpiVip') && (await txt('#recKpiVip .v')).includes('1/2'), 'contador ⭐ 1/2 llegaron: ' + await txt('#recKpiVip'));
  check((await txt('#recPanel')).includes('⭐ VIP'), 'la ficha de Zoe dice ⭐ VIP');
  check(await p.$eval('[data-rec-key="i:b"]', e => e.classList.contains('vip') && e.textContent.includes('⭐')), 'fila resaltada con ⭐');
  await p.click('[data-rec-filtro="todas"]');
  lista = await p.$$eval('#recLista .rec-fila', els => els.map(e => e.dataset.recKey));
  check(lista.slice(0, 2).sort().join() === 'i:b,l:l2' && lista.indexOf('i:c') > 1, 'Todas: VIP que faltan (y el lead VIP) arriba; la VIP que ya llegó en su orden: ' + lista.join());
  await p.click('[data-rec-filtro="vip"]');
  lista = await p.$$eval('#recLista .rec-fila', els => els.map(e => e.dataset.recKey)).then(x => x.sort());
  check(lista.join() === 'i:b,i:c,l:l2', 'filtro ⭐ VIP: ' + lista.join());

  h.paso('5. Al llegar, sale del grupo de arriba');
  await p.click('[data-rec-filtro="faltan"]');
  await p.evaluate(() => { seleccionarRecepcion('i:b'); document.activeElement.blur(); });
  await p.keyboard.press('l');
  await p.waitForTimeout(300);
  check((await txt('#recKpiVip .v')).includes('2/2'), 'contador ⭐ 2/2');
  check(!(await p.$('.rec-grupo.vip')), 'ya no hay VIP pendientes arriba');
  await p.evaluate(() => cerrarRecepcion());

  h.paso('6. Ficha de la inscrita: Cambiar a VIP (+$500)');
  await p.evaluate(() => { window.__tablas.inscripciones = [{ id:'f1', anticipo:1400, restante:0, precio_pactado:1400, liquidado:true, estatus_id:12, paquete:'BASICO', asesor_id:'u2', notas_migracion:'Nota',
    personas:{ id:'pf', nombre:'Fany Ficha Prueba', telefono_principal:'0000000077' }, eventos:{ fecha:'2026-10-20', sede:'S', ciudades:{ nombre:'Ciudad' } }, pagos:[] }];
    window.__ops = []; return abrirModalInscripcion('f1'); });
  await p.waitForTimeout(200);
  check((await txt('#cobroVipCaja')).includes('Cambiar a VIP (+$500)'), 'botón con el precio de Precios');
  await p.click('#btnCambiarVip');
  await p.waitForTimeout(100);
  check((await txt('#confirmarAviso')).includes('$1,900') && (await txt('#confirmarAviso')).includes('$500'), 'confirma con el precio nuevo y lo que falta');
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  const up = (await h.ops('inscripciones', 'update'))[0];
  check(up && up.paquete === 'VIP' && up.precio_pactado === 1900 && up.restante === 500 && up.liquidado === false && up.estatus_id === 11 && up.notas_migracion.includes('CAMBIO A VIP'),
    'VIP, precio $1,900, debe $500, sale de Pagó el curso y deja rastro: ' + JSON.stringify(up));
  check((await txt('#cobroVipCaja')).includes('Paquete VIP') && (await txt('#cobroResumen')).includes('$500'), 'la ficha ya dice VIP y que debe $500');
  await p.evaluate(() => cerrarModalInscripcion());
  await p.evaluate(() => { window.__tablas.inscripciones[0].paquete = 'VIP'; return abrirModalInscripcion('f1'); });
  await p.waitForTimeout(200);
  check(!(await p.$('#btnCambiarVip')), 'si ya es VIP no ofrece el botón');
  await h.captura('vip-ficha.png');
  await p.evaluate(() => cerrarModalInscripcion());

  await p.evaluate(hoy => { window.__tablas.inscripciones = [
    { id:'a', evento_id:'ev1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO', asistencia:null, pagos:[], personas:{ id:'1', nombre:'Ana Básica Prueba', telefono_principal:'0' } },
    { id:'b', evento_id:'ev1', anticipo:700, restante:1200, precio_pactado:1900, liquidado:false, estatus_id:11, paquete:'VIP', asistencia:null, pagos:[], personas:{ id:'2', nombre:'Zoe Vip Prueba', telefono_principal:'0' } },
    { id:'d', evento_id:'ev1', anticipo:1900, restante:0, precio_pactado:1900, liquidado:true, estatus_id:12, paquete:'VIP', asistencia:null, pagos:[], personas:{ id:'3', nombre:'Dana Vip Prueba', telefono_principal:'0' } }];
    return abrirRecepcion({ id:'ev1', ciudad:'Ciudad Prueba', fecha:hoy, sede:'S' }); }, HOY);
  await p.waitForTimeout(250);
  await h.captura('vip-recepcion.png');
  await h.terminar();
})();
