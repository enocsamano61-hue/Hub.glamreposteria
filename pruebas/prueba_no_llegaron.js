/* No llegaron (fase 4): estados, filtros, acceso online, sí fue, perdió
   anticipo (y deshacer), mover de curso, WhatsApp y cobrar. Datos inventados. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const dia = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = (id, ciudad, fecha) => ({ id, fecha, sede:'Salón', curso_id:'cur1', ciudades:{ id:'c-' + id, nombre:ciudad } });
const P = (id, nombre, tel) => ({ id, nombre, telefono_principal:tel, telefono_alternativo:null });
const fila = (id, extra) => ({ id, anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:null, asistencia:null, estatus_antes_de_cierre:null, acceso_online_en:null, acceso_online_por:null, ...extra });
const EV_A = ev('evA', 'Ciudad Alfa', dia(-3)), EV_B = ev('evB', 'Ciudad Beta', dia(-20)), EV_F = ev('evF', 'Ciudad Futura', dia(10));
const base = () => ({
  cursos: [{ id:'cur1', nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF' }],
  inscripciones: [
    fila('r1', { evento_id:'evA', eventos:EV_A, personas:P('p1','Rita Uno Prueba','0000000001') }),
    fila('r2', { evento_id:'evA', eventos:EV_A, estatus_id:14, asistencia:'no_llego', estatus_antes_de_cierre:11, personas:P('p2','Rosa Dos Prueba','0000000002') }),
    fila('r3', { evento_id:'evA', eventos:EV_A, estatus_id:14, asistencia:'no_llego', estatus_antes_de_cierre:11, acceso_online_en:'2026-09-20T10:00:00Z', acceso_online_por:'u1', personas:P('p3','Ruth Tres Prueba','0000000003') }),
    fila('r4', { evento_id:'evB', eventos:EV_B, estatus_id:15, estatus_antes_de_cierre:11, personas:P('p4','Raquel Cuatro Prueba','0000000004') }),
    fila('r5', { evento_id:'evF', eventos:EV_F, personas:P('p5','Regina Futura Prueba','0000000005') }),
    fila('r6', { evento_id:'evB', eventos:EV_B, liquidado:true, restante:0, anticipo:1400, estatus_id:12, personas:P('p6','Reyna Pagada Prueba','0000000006') }),
    fila('r7', { evento_id:'evB', eventos:EV_B, asistencia:'llego', personas:P('p7','Rocío Llegó Prueba','0000000007') }),
    fila('r8', { evento_id:'evB', eventos:EV_B, asesor_id:'u1', anticipo:500, restante:900, personas:P('p8','Renata Ocho Prueba','0000000008') }),
  ],
});

(async () => {
  const h = await abrirHub({ tablas:base() });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  const upd = () => h.ops('inscripciones', 'update');
  const filas = () => p.$$eval('#nlBody tr[data-nl-id]', trs => trs.map(t => t.dataset.nlId));
  const chip = async id => (await txt(`[data-nl-estado="${id}"] b`)).trim();
  const elegir = async id => { await p.click(`#nlBody tr[data-nl-id="${id}"]`); await p.waitForTimeout(80); };
  const accion = async a => { await p.click(`[data-nl-acc="${a}"]`); await p.waitForTimeout(150); };
  const abrir = async () => {
    await p.evaluate(t => { window.__tablas = t; window.__ops = []; cursoActivoIdCache = undefined; EVENTOS_CAL = [t.__evF]; nl.estado = 'pendientes'; }, { ...base(), __evF:{ ...EV_F, ciudad_id:'c-evF' } });
    await p.evaluate(() => setActiveSection('nollegaron'));
    await p.waitForTimeout(250);
  };

  h.paso('1. La sección calcula los estados sin marcar a nadie');
  await abrir();
  check(await p.isVisible('#view-nollegaron'), 'se abre');
  check(await p.isVisible('#desktopNav [data-view="nollegaron"]'), 'está en el menú');
  check(await chip('pendientes') === '3' && await chip('revisar') === '2' && await chip('nollego') === '1' && await chip('online') === '1' && await chip('perdio') === '1' && await chip('todas') === '5',
    'conteos 3/2/1/1/1/5: ' + (await txt('#nlChips')));
  check((await filas()).sort().join() === 'r1,r2,r8', 'pendientes: r1, r2, r8 (sin futura, liquidada ni la que llegó): ' + (await filas()).join());
  check((await txt('#nlResumen')).includes('3') && (await txt('#nlResumen')).includes('$1,900'), 'resumen con anticipos: ' + await txt('#nlResumen'));
  check((await upd()).length === 0, 'abrir no cambia nada en la base');
  await h.captura('no-llegaron-computadora.png');

  h.paso('2. Filtros');
  await p.selectOption('#nlCiudad', 'c-evB');
  check((await filas()).join() === 'r8', 'por ciudad');
  await p.selectOption('#nlCiudad', '');
  await p.selectOption('#nlVendedor', 'u1');
  check((await filas()).join() === 'r8', 'por vendedor');
  await p.selectOption('#nlVendedor', '');
  await p.fill('#nlBuscar', 'rosa');
  check((await filas()).join() === 'r2', 'por nombre');
  await p.fill('#nlBuscar', '0008');
  check((await filas()).join() === 'r8', 'por teléfono');
  await p.fill('#nlBuscar', '');
  await p.click('[data-nl-estado="todas"]');
  check((await filas()).length === 5, 'Todas: 5');
  await p.click('[data-nl-estado="pendientes"]');

  h.paso('3. Acceso online dado');
  await elegir('r2');
  await h.limpiarOps();
  await accion('online');
  let u = (await upd())[0];
  check(u && u.acceso_online_en && u.acceso_online_por === 'u1' && u.notas_migracion.includes('ACCESO ONLINE DADO'), 'marca fecha, quién y deja rastro: ' + JSON.stringify(u));
  check(await chip('pendientes') === '2' && await chip('online') === '2', 'sale de pendientes');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'acceso_online_dado'), 'Actividad');

  h.paso('4. Quitar acceso online pide confirmación');
  await p.click('[data-nl-estado="online"]');
  await elegir('r3');
  await h.limpiarOps();
  await accion('online');
  check(await p.isVisible('#modalConfirmar.open'), 'pregunta');
  await p.click('#confirmarSi'); await p.waitForTimeout(150);
  u = (await upd())[0];
  check(u && u.acceso_online_en === null, 'quitado');
  check(await chip('nollego') === '1', 'Ruth regresa a No llegó');

  h.paso('5. Sí fue al curso (por revisar)');
  await p.click('[data-nl-estado="revisar"]');
  await elegir('r1');
  await h.limpiarOps();
  await accion('sifue');
  u = (await upd())[0];
  check(u && u.asistencia === 'llego' && !('estatus_id' in u), 'solo marca que llegó');
  check(!(await filas()).includes('r1'), 'sale de la lista');

  h.paso('6. Perdió anticipo con motivo, y deshacer');
  await elegir('r8');
  await h.limpiarOps();
  await accion('perdio');
  check(await p.isVisible('#modalConfirmar.open') && (await txt('#confirmarAviso')).includes('$500'), 'pregunta con el monto');
  await p.fill('#confirmarMotivo', 'Ya no contestó');
  await p.click('#confirmarSi'); await p.waitForTimeout(150);
  u = (await upd())[0];
  check(u && u.estatus_id === 15 && u.estatus_antes_de_cierre === 11 && u.notas_migracion.includes('PERDIÓ ANTICIPO (Ya no contestó)'), 'estatus 15, guarda el 11 y el motivo: ' + JSON.stringify(u));
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'anticipo_perdido' && a.detalle.includes('Ya no contestó')), 'Actividad con motivo');
  await p.click('[data-nl-estado="perdio"]');
  await elegir('r8');
  await h.limpiarOps();
  await accion('deshacerPerdio');
  await p.click('#confirmarSi'); await p.waitForTimeout(150);
  u = (await upd())[0];
  check(u && u.estatus_id === 11 && u.estatus_antes_de_cierre === null, 'regresa a 11');

  h.paso('7. Perdió anticipo desde "No llegó" regresa a No llegó');
  await p.click('[data-nl-estado="nollego"]');
  await elegir('r3');
  await h.limpiarOps();
  await accion('perdio');
  await p.click('#confirmarSi'); await p.waitForTimeout(150);
  u = (await upd())[0];
  check(u && u.estatus_id === 15 && !('estatus_antes_de_cierre' in u), 'no pisa el estatus guardado del cierre');
  await p.click('[data-nl-estado="perdio"]');
  await elegir('r3');
  await h.limpiarOps();
  await accion('deshacerPerdio');
  await p.click('#confirmarSi'); await p.waitForTimeout(150);
  u = (await upd())[0];
  check(u && u.estatus_id === 14, 'regresa a No llegó (14)');

  h.paso('8. Mover a otro curso');
  await abrir();
  await elegir('r2');
  await accion('mover');
  check(await p.isVisible('#nlMoverCaja'), 'aparece el selector de curso');
  await p.fill('#nlMoverSelectBuscar', 'futura');
  await p.waitForTimeout(100);
  await p.click('#nlMoverCaja .bc-item:has-text("Ciudad Futura")');
  await p.waitForTimeout(100);
  check(await p.evaluate(() => document.getElementById('nlMoverSelect').value) === 'evF', 'eligió Ciudad Futura con el buscador');
  await h.limpiarOps();
  await p.click('#nlMoverOk'); await p.waitForTimeout(100);
  check(await p.isVisible('#modalConfirmar.open') && (await txt('#confirmarAviso')).includes('Ciudad Futura'), 'confirma el cambio');
  await p.click('#confirmarSi'); await p.waitForTimeout(150);
  u = (await upd())[0];
  check(u && u.evento_id === 'evF' && u.estatus_id === 11 && u.asistencia === null && u.estatus_antes_de_cierre === null && u.notas_migracion.includes('MOVIDA de Ciudad Alfa'), 'nuevo curso, vuelve a su estatus y deja rastro: ' + JSON.stringify(u));
  check(!(await filas()).includes('r2'), 'sale de No llegaron');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'inscripcion_movida'), 'Actividad');
  await h.limpiarOps();
  await elegir('r1');
  await accion('mover');
  await p.keyboard.press('Escape');
  await p.click('#nlDetalle h3');
  await p.click('#nlMoverOk'); await p.waitForTimeout(100);
  check(!(await p.isVisible('#modalConfirmar.open')) && (await upd()).length === 0, 'sin curso elegido no mueve');
  await p.click('#nlMoverCancelar');
  check(!(await p.isVisible('#nlMoverCaja')), 'Cancelar esconde el selector');

  h.paso('9. WhatsApp y Cobrar usan lo de siempre');
  await accion('whats');
  await p.waitForTimeout(200);
  check(await p.isVisible('#modalWhats.open'), 'abre el envío por WhatsApp');
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));
  await p.evaluate(() => { window.__tablas.inscripciones.find(i => i.id === 'r1').eventos = { fecha:'2026-09-20', sede:'Salón', ciudades:{ nombre:'Ciudad Alfa' } }; });
  await accion('cobrar');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('modalInscripcion').classList.contains('open') && document.getElementById('modalInscripcion').classList.contains('solo-cobro')), 'abre el cobro de la ficha');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('10. Si la base falla, avisa y no cambia la lista');
  await abrir();
  await elegir('r2');
  await h.fallar(op => op.tabla === 'inscripciones' && op.tipo === 'update');
  await accion('online');
  check(await chip('pendientes') === '3', 'sigue igual');
  await h.fallar(null);

  h.paso('11. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(150);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sin scroll horizontal de página');
  await h.captura('no-llegaron-celular.png');

  await h.terminar();
})();
