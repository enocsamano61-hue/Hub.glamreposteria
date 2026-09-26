/* 🏦 Pagos por confirmar: marcar al cobrar o después, revisar en Recepción
   o en la ficha, "no llegó" regresa la deuda, aviso al cerrar, Cobranza y
   Calendario. Datos inventados. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const EV = { id:'ev1', ciudadId:'c1', ciudad:'Ciudad Prueba', fecha:HOY, sede:'Salón', tieneInscripciones:true };
const P = (id, nombre) => ({ id, nombre, telefono_principal:'00000000' + id.slice(-2), telefono_alternativo:null });
const ins = (id, extra) => ({ id, evento_id:'ev1', anticipo:1400, restante:500, precio_pactado:1900, liquidado:false, estatus_id:11, paquete:'VIP',
  asesor_id:'u2', notas_migracion:null, asistencia:null, asistencia_en:null, estatus_antes_de_cierre:null, pagos:[], ...extra });
const base = () => ({
  eventos:[{ id:'ev1', recepcion_cerrada_en:null }],
  precios:[{ id:'pr1', nombre:'Subir a VIP', clave:'subir_vip', precio:500, activo:true, orden:1 }],
  inscripciones:[
    ins('a', { personas:P('pa1','Ana Arce Prueba') }),
    ins('c', { personas:P('pc3','Carla Cruz Prueba'), anticipo:700, restante:700, precio_pactado:1400, paquete:'BASICO' }),
  ],
  leads:[], pagos:[],
});

(async () => {
  const h = await abrirHub({ ancho:1366, alto:768, tablas:base() });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  const tecla = async k => { await p.keyboard.press(k); await p.waitForTimeout(80); };
  const fuera = () => p.evaluate(() => document.activeElement.blur());
  const insc = id => p.evaluate(x => rec.inscritas.find(i => i.id === x), id);

  h.paso('1. Recepción: Transferencia + 🏦 al cobrar');
  await p.evaluate(ev => abrirRecepcion(ev), EV);
  await p.waitForTimeout(200);
  check(!(await p.isVisible('#recKpiPC')), 'sin pendientes no se ve el contador 🏦');
  await p.evaluate(() => seleccionarRecepcion('i:a'));
  await fuera();
  await tecla('3');
  check(await p.isVisible('#recMarcarPC') && !(await p.getAttribute('#recMarcarPC', 'class')).includes(' on'), 'la etiqueta 🏦 existe y no viene marcada');
  await tecla('b');
  check((await p.getAttribute('#recMarcarPC', 'class')).includes('on'), 'B la marca');
  await h.limpiarOps();
  await tecla('p');
  await p.waitForTimeout(200);
  const ins1 = (await h.ops('pagos', 'insert'))[0]?.[0];
  check(ins1 && ins1.verificacion === 'por_confirmar' && ins1.forma_pago === 'Transferencia' && /^\d\d:\d\d:\d\d$/.test(ins1.hora), 'pago por confirmar, con forma y hora: ' + JSON.stringify(ins1));
  check((await h.ops('inscripciones', 'update')).some(u => u.liquidado === true && u.asistencia === 'llego'), 'la alumna pasa y queda liquidada');
  check(await p.isVisible('#recKpiPC') && (await txt('#recKpiPC')).includes('1') && (await txt('#recKpiPC')).includes('$500'), 'contador 🏦 1 ($500): ' + await txt('#recKpiPC'));
  check(await p.evaluate(() => rec.marcarPC) === false, 'la etiqueta se apaga para la siguiente');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.detalle.includes('🏦 por confirmar')), 'Actividad lo dice');

  h.paso('2. Sin la etiqueta, el pago queda confirmado');
  await p.waitForTimeout(900);
  await p.evaluate(() => seleccionarRecepcion('i:c'));
  await fuera();
  await h.limpiarOps();
  await tecla('p');
  await p.waitForTimeout(200);
  check((await h.ops('pagos', 'insert'))[0]?.[0]?.verificacion === 'confirmado', 'confirmado (la forma de pago se quedó en Transferencia)');

  h.paso('3. Filtro 🏦 y lista resaltada');
  await p.waitForTimeout(900);
  await p.click('#recKpiPC');
  await p.waitForTimeout(100);
  const filas = await p.$$eval('#recLista .rec-fila', els => els.map(e => e.dataset.recKey + (e.classList.contains('pc') ? '*' : '')));
  check(filas.join() === 'i:a*', 'solo Ana, resaltada: ' + filas.join());
  check(await p.isVisible('.pc-caja') && (await txt('.pc-caja')).includes('Transferencia'), 'la ficha muestra el pago pendiente');

  h.paso('4. ✓ Ya llegó al banco');
  await h.limpiarOps();
  await p.click('[data-pc-ok]');
  await p.waitForTimeout(150);
  const upOk = (await h.ops('pagos', 'update'))[0];
  check(upOk && upOk.verificacion === 'confirmado' && upOk.verificado_por === 'u1' && upOk.verificado_en, 'confirmado con quién y cuándo');
  check(!(await p.isVisible('#recKpiPC')), 'el contador desaparece');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'pago_verificado'), 'Actividad');

  h.paso('5. Marcar después y ✗ No llegó');
  await p.evaluate(() => { rec.filtro = 'todas'; seleccionarRecepcion('i:c'); });
  check(await p.isVisible('[data-pc-marcar]'), 'ofrece marcar el pago de hoy');
  await h.limpiarOps();
  await p.click('[data-pc-marcar]');
  await p.waitForTimeout(150);
  check((await h.ops('pagos', 'update'))[0]?.verificacion === 'por_confirmar', 'quedó por confirmar');
  const cobradoAntes = await txt('#recKpiCobrado .v');
  await h.limpiarOps();
  await p.click('[data-pc-no]');
  await p.waitForTimeout(100);
  check(await p.isVisible('#modalConfirmar.open'), 'pregunta antes');
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  check((await h.ops('pagos', 'update'))[0]?.verificacion === 'no_llego', 'el pago queda como no llegó (no se borra)');
  check((await h.ops('pagos', 'delete')).length === 0, 'no se borró nada');
  const upNo = (await h.ops('inscripciones', 'update'))[0];
  check(upNo && upNo.anticipo === 700 && upNo.restante === 700 && upNo.liquidado === false && upNo.estatus_id === 11 && upNo.notas_migracion.includes('PAGO NO LLEGÓ AL BANCO'),
    'vuelve a deber $700, sale de Pagó el curso y queda anotado: ' + JSON.stringify(upNo));
  check((await txt('#recKpiCobrado .v')) !== cobradoAntes && (await txt('#recKpiCobrado .v')) === '$500', 'cobrado hoy ya no cuenta ese pago: ' + cobradoAntes + ' → ' + await txt('#recKpiCobrado .v'));
  check((await txt('#recPanel')).includes('$ DEBE $700'), 'la alumna vuelve a deber');

  h.paso('6. Cerrar recepción avisa lo pendiente');
  await p.evaluate(() => { const a = rec.inscritas.find(i => i.id === 'a'); a.pagos.find(x => x.monto === 500).verificacion = 'por_confirmar'; pintarRecepcion(); });
  await p.click('#recCerrar');
  await p.waitForTimeout(100);
  check((await txt('#confirmarAviso')).includes('por confirmar'), 'el resumen avisa: ' + (await txt('#confirmarAviso')).slice(-120));
  await p.click('#confirmarNo');
  await p.evaluate(() => cerrarRecepcion());

  h.paso('7. Ficha: confirmar un pago pendiente');
  await p.evaluate(() => { window.__tablas.inscripciones = [{ id:'f1', anticipo:1900, restante:0, precio_pactado:1900, liquidado:true, estatus_id:12, asesor_id:'u2', notas_migracion:null,
    personas:{ id:'pf', nombre:'Fany Ficha Prueba', telefono_principal:'0000000077' }, eventos:{ fecha:'2026-09-20', sede:'S', ciudades:{ nombre:'Ciudad Ficha' } },
    pagos:[{ id:'pg1', monto:500, fecha:'2026-09-20', hora:'11:05:00', banco:'Transferencia', forma_pago:'Transferencia', concepto:'curso', verificacion:'por_confirmar' },
           { id:'pg2', monto:350, fecha:'2026-09-20', hora:'11:06:00', banco:'Transferencia', forma_pago:'Transferencia', concepto:'Uniforme', verificacion:'por_confirmar' }] }];
    window.__ops = []; return abrirModalInscripcion('f1'); });
  await p.waitForTimeout(200);
  check((await p.$$('#fichaPorConfirmar .pc-pago')).length === 2, 'la ficha muestra los 2 pendientes');
  await p.click('#fichaPorConfirmar [data-pc-ok="pg1"]');
  await p.waitForTimeout(150);
  check((await h.ops('pagos', 'update')).some(u => u.verificacion === 'confirmado'), 'confirmado desde la ficha');
  check((await p.$$('#fichaPorConfirmar .pc-pago')).length === 1, 'queda 1');

  h.paso('8. Ficha: el uniforme no llegó → no cambia el saldo del curso');
  await h.limpiarOps();
  await p.click('#fichaPorConfirmar [data-pc-no="pg2"]');
  await p.waitForTimeout(100);
  check((await txt('#confirmarAviso')).includes('Uniforme'), 'el aviso dice que es el uniforme');
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  const upU = (await h.ops('inscripciones', 'update'))[0];
  check(upU && !('anticipo' in upU) && upU.notas_migracion.includes('cobrarlo de nuevo'), 'solo queda anotado para cobrarlo: ' + JSON.stringify(upU));
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('9. Ficha: cobrar con 🏦 y Depósito / OXXO');
  await p.evaluate(() => { const i = window.__tablas.inscripciones[0]; Object.assign(i, { anticipo:1400, restante:500, liquidado:false, estatus_id:11, pagos:[] }); window.__ops = []; return abrirModalInscripcion('f1'); });
  await p.waitForTimeout(200);
  check(!(await p.getAttribute('#cobroPorConfirmar', 'class')).includes('activo'), 'la etiqueta empieza apagada');
  await p.click('#cobroFormas [data-forma="Depósito / OXXO"]');
  await p.click('#cobroPorConfirmar');
  await p.click('#guardarInscPago');
  await p.waitForTimeout(200);
  const pf = (await h.ops('pagos', 'insert'))[0];
  check(pf && pf.monto === 500 && pf.forma_pago === 'Depósito / OXXO' && pf.verificacion === 'por_confirmar' && /^\d\d:\d\d/.test(pf.hora), 'abono por confirmar en depósito: ' + JSON.stringify(pf));

  h.paso('10. Cobranza junta los pendientes de todos los cursos');
  await p.evaluate(async () => {
    window.__tablas.pagos = [
      { id:'x1', monto:500, fecha:'2026-09-20', hora:'10:00:00', forma_pago:'Transferencia', concepto:'curso', verificacion:'por_confirmar', inscripciones:{ id:'f1', personas:{ nombre:'Fany Ficha Prueba' }, eventos:{ fecha:'2026-09-20', ciudades:{ nombre:'Ciudad Ficha' } } } },
      { id:'x2', monto:300, fecha:'2026-09-21', hora:'12:00:00', forma_pago:'Depósito / OXXO', concepto:'curso', verificacion:'por_confirmar', inscripciones:{ id:'f2', personas:{ nombre:'Gina Dos Prueba' }, eventos:{ fecha:'2026-09-21', ciudades:{ nombre:'Otra Ciudad' } } } },
      { id:'x3', monto:900, fecha:'2026-09-21', verificacion:'confirmado', inscripciones:{ id:'f3', personas:{ nombre:'No Sale' } } },
    ];
    setActiveSection('cobranza');
  });
  await p.waitForTimeout(400);
  const bloque = await txt('#cobPorConfirmar');
  check(bloque.includes('2') && bloque.includes('$800') && bloque.includes('Gina Dos Prueba') && !bloque.includes('No Sale'), 'bloque 🏦 con 2 pagos y $800: ' + bloque.replace(/\s+/g, ' ').slice(0, 160));
  await p.click('[data-cob-pc="f1"]');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('modalInscripcion').classList.contains('open')), 'Revisar abre la ficha');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('11. Calendario marca 🏦 en el curso');
  await p.evaluate(async hoy => {
    window.__tablas.cursos = [{ id:'cur1', nombre:CURSO_ACTIVO_NOMBRE }];
    window.__tablas.eventos = [{ id:'ev1', fecha:hoy, ciudad_id:'c1', curso_id:'cur1', sede:'S', recepcion_cerrada_en:null, ciudades:{ nombre:'Ciudad Prueba' }, cursos:{ nombre:'x' } }];
    window.__tablas.inscripciones = [{ id:'a', evento_id:'ev1', anticipo:1900, restante:0, precio_pactado:1900, liquidado:true, estatus_id:12, asistencia:'llego' }];
    window.__tablas.pagos = [{ id:'z1', verificacion:'por_confirmar', inscripciones:{ evento_id:'ev1' } }];
    cursoActivoIdCache = undefined; inicioGiraCache = null;
    setActiveSection('calendario'); await renderCalendario();
  }, HOY);
  await p.waitForTimeout(200);
  const tarjeta = (await p.innerText(`.cal-tarjeta[data-key="${HOY}"]`)).replace(/\s+/g, ' ');
  check(tarjeta.includes('🏦 1'), 'la tarjeta muestra 🏦 1: ' + tarjeta);
  await p.click(`.cal-tarjeta[data-key="${HOY}"]`);
  await p.waitForTimeout(200);
  check((await txt('#sheetEventos')).includes('por confirmar'), 'la hoja del día también');
  await h.captura('por-confirmar-calendario.png');

  await h.terminar();
})();
