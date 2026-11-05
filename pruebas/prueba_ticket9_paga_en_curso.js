/* Ticket #9 (Cinthia, 5 nov 2026): una inscrita con anticipo que paga el resto en su curso salía "vencida" en Cobranza.
   Causa: al confirmar el pago e inscribir, "Fecha de pago de lo que falta" se llenaba con la fecha de su ANTICIPO.
   - Si paga algo al inscribir, esa casilla queda vacía (= se cobra el día del curso). Si no paga nada, se propone su fecha.
   - En la ficha, "Lo paga en su curso" quita la fecha de un toque (en Cobranza queda en "Más adelante"). Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'ev1', fecha:mas(90), curso_id:'cur1', sede:'Salón', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55300000' + id.slice(-2), telefono_alternativo:null });
const lead = (id, pid, nombre, extra) => ({ id, persona_id:pid, evento_id:'ev1', ciudad_interes_id:'cA', paquete:'BASICO', asesor_id:'u2', creado_en:new Date().toISOString(),
  estatus:{ id:2 }, estatus_id:2, comentario:null, personas:persona(pid, nombre), eventos:ev, ciudades:{ nombre:'Ciudad A' }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{ pagos:[], interacciones:[], eventos:[{ id:'ev1', recepcion_cerrada_en:null }],
      inscripciones:[{ id:'i1', persona_id:'p09', evento_id:'ev1', anticipo:700, restante:700, liquidado:false, precio_pactado:1400, paquete:'BASICO',
        asesor_id:'u2', fecha_proximo_pago:mas(-6), notas_migracion:null, asistencia:null, estatus_id:11, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' },
        personas:persona('p09', 'Alumna Paga En Curso'), eventos:{ ...ev }, pagos:[] }] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(e => { GIRAS = [{ id:'cur1', nombre:'CURSO PRUEBA' }]; EVENTOS_CAL = [e]; window.renderBoard = async () => {}; window.renderCalendario = async () => {}; return cargarPrecios(); }, ev);

  h.paso('1. Al inscribir con su anticipo, lo que falta queda sin fecha');
  await p.evaluate(l => { leadsCache = [l]; leadAbiertoId = l.id; abrirModalInscribir(); }, lead('l1', 'p01', 'Lead Paga Anticipo', { fecha_compromiso_pago:HOY }));
  await p.waitForSelector('#modalInscribir.open');
  check((await p.inputValue('#inscribirPagado')) === '700' && (await p.inputValue('#inscribirProximo')) === '', 'paga $700: la fecha de lo que falta NO es la de su anticipo');
  await p.fill('#inscribirPagado', '0');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check((await p.inputValue('#inscribirProximo')) === HOY, 'si no paga nada, sí se propone la fecha que prometió');
  await p.fill('#inscribirPagado', '700');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check((await p.inputValue('#inscribirProximo')) === '', 'y si vuelve a poner que paga, se quita');
  await h.limpiarOps();
  await p.click('#guardarInscribir');
  await p.waitForTimeout(600);
  const ins = (await h.ops('inscripciones', 'insert'))[0];
  check(ins && ins.anticipo === 700 && ins.fecha_proximo_pago === null, 'se inscribe sin fecha de pago (se cobra el día del curso)');
  await p.evaluate(() => { document.getElementById('modalInscribir').classList.remove('open'); cerrarModalInscripcion?.(); });

  h.paso('2. "Lo paga en su curso" en la ficha');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  check(await p.isVisible('#inscPagaEnCurso'), 'con fecha de pago, sale el botón');
  await h.captura('ticket9-paga-en-curso.png');
  await h.limpiarOps();
  await p.click('#inscPagaEnCurso');
  await p.waitForTimeout(500);
  check((await h.ops('inscripciones', 'update')).some(u => u.fecha_proximo_pago === null), 'quita la fecha');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'fecha_cobro_movida' && a.detalle.includes('día del curso')), 'queda en la actividad');
  check(!(await p.isVisible('#inscPagaEnCurso')) && (await p.textContent('#inscProximoPagoHint')).includes('Sin fecha'), 'ya sin fecha: el botón se va y dice que se cobra el día del curso');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('3. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(() => { window.__tablas.inscripciones[0].fecha_proximo_pago = '2030-01-01'; return abrirModalInscripcion('i1'); });
  await p.waitForTimeout(500);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('ticket9-paga-en-curso-celular.png');

  await h.terminar();
})();
