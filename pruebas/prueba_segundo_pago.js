/* Segundo pago prometido (6 nov 2026, sugerencia de una vendedora): en "Registrar pago" del lead, además de lo que
   pagó, la fecha de su segundo pago y cuánto va a dar, para no cambiar de herramienta.
   - Registrar pago: "Su segundo pago" con fecha, cantidad (vacío = todo lo que le falta) y cuánto le falta.
   - Confirmar e inscribir: vienen llenas con su segundo pago; si no paga nada, la fecha es la de su anticipo.
   - Ficha de la inscrita: "Va a dar" junto a la fecha de pago; "Lo paga en su curso" quita las dos.
   - Cobranza y el semáforo: "va a dar $X" en su fecha (misma función montoPromesaInsc). Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'ev1', fecha:mas(90), curso_id:'cur1', sede:'Salón', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55400000' + id.slice(-2), telefono_alternativo:null });
const lead = (id, pid, nombre, extra) => ({ id, persona_id:pid, evento_id:'ev1', ciudad_interes_id:'cA', paquete:'BASICO', asesor_id:'u2', creado_en:new Date().toISOString(),
  estatus:{ id:2 }, estatus_id:2, comentario:null, personas:persona(pid, nombre), eventos:ev, ciudades:{ nombre:'Ciudad A' }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{ pagos:[], interacciones:[], comprobantes:[], eventos:[{ id:'ev1', recepcion_cerrada_en:null }],
      inscripciones:[{ id:'i1', persona_id:'p09', evento_id:'ev1', anticipo:700, restante:700, liquidado:false, precio_pactado:1400, paquete:'BASICO',
        asesor_id:'u2', fecha_proximo_pago:mas(8), monto_proximo_pago:300, notas_migracion:null, asistencia:null, estatus_id:11,
        estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' }, personas:persona('p09', 'Alumna Con Promesa'), eventos:{ ...ev }, pagos:[] }] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(e => { GIRAS = [{ id:'cur1', nombre:'CURSO PRUEBA' }]; EVENTOS_CAL = [e]; window.renderBoard = async () => {}; window.renderCalendario = async () => {}; return cargarPrecios(); }, ev);

  h.paso('1. Registrar pago trae "Su segundo pago"');
  await p.evaluate(l => { leadsCache = [l]; leadAbiertoId = l.id; abrirRegistrarPago(); }, lead('l1', 'p01', 'Lead Que Abona', { monto_anticipo:700 }));
  await p.waitForSelector('#modalRegistrarPago.open');
  check(await p.isVisible('#regPagoFecha2') && await p.isVisible('#regPagoMonto2'), 'fecha y cantidad del segundo pago, en la misma ventana');
  check((await p.textContent('#regPagoFalta2')).includes('Le faltan $700'), 'dice cuánto le falta con lo que está pagando');
  await p.fill('#regPagoFecha2', mas(10));
  await p.fill('#regPagoMonto2', '300');
  await p.dispatchEvent('#regPagoMonto2', 'input');
  check((await p.textContent('#regPagoFalta2')).includes('le quedan $400'), 'si da menos, dice cuánto le queda');
  await h.captura('segundo-pago-registrar.png');
  await p.fill('#regPagoMonto2', '900');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForTimeout(400);
  check((await h.ops('leads', 'update')).length === 0 && (await p.textContent('#toast')).includes('más de lo que le falta'), 'más de lo que le falta: no guarda y dice por qué');
  await p.fill('#regPagoMonto2', '300');
  await p.click('#guardarRegistrarPago');
  await p.waitForTimeout(600);
  const up = (await h.ops('leads', 'update'))[0];
  check(up && up.segundo_pago_fecha === mas(10) && Number(up.segundo_pago_monto) === 300 && up.pago_reportado_monto === 700, 'se guarda en el lead con su pago reportado');
  check(up && up.comentario.includes('Segundo pago: $300'), 'y queda en su nota');

  h.paso('2. Al confirmar, Cobranza lo encuentra listo');
  const rep = lead('l2', 'p02', 'Lead Reportada', { fecha_compromiso_pago:mas(1), pago_reportado_monto:700, pago_reportado_fecha:HOY, pago_reportado_banco:'BANCO',
    pago_reportado_por:'u2', pago_reportado_en:new Date().toISOString(), segundo_pago_fecha:mas(10), segundo_pago_monto:300 });
  await p.evaluate(l => { leadsCache = [l]; leadAbiertoId = l.id; abrirModalInscribir(); }, rep);
  await p.waitForSelector('#modalInscribir.open');
  check((await p.inputValue('#inscribirProximo')) === mas(10) && (await p.inputValue('#inscribirProximoMonto')) === '300', 'fecha y cantidad de su segundo pago, ya llenas');
  await p.fill('#inscribirPagado', '0');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check((await p.inputValue('#inscribirProximo')) === mas(1) && !(await p.isVisible('#inscribirProximoMonto')), 'si no paga nada, la fecha es la de su anticipo (sin cantidad)');
  await p.fill('#inscribirPagado', '700');
  await p.dispatchEvent('#inscribirPagado', 'input');
  check((await p.inputValue('#inscribirProximo')) === mas(10), 'y regresa a su segundo pago');
  await p.fill('#inscribirProximoMonto', '300');
  await h.limpiarOps();
  await p.click('#guardarInscribir');
  await p.waitForTimeout(700);
  const ins = (await h.ops('inscripciones', 'insert'))[0];
  check(ins && ins.fecha_proximo_pago === mas(10) && Number(ins.monto_proximo_pago) === 300, 'la inscripción queda con su próximo pago y cuánto va a dar');
  await p.evaluate(() => { document.getElementById('modalInscribir').classList.remove('open'); cerrarModalInscripcion?.(); });

  h.paso('3. Ficha de la inscrita: "Va a dar"');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  check((await p.inputValue('#inscProximoMonto')) === '300' && (await p.textContent('#inscProximoPagoHint')).includes('va a dar $300 de los $700'), 'junto a la fecha: cuánto va a dar de lo que debe');
  await h.captura('segundo-pago-ficha.png');
  await h.limpiarOps();
  await p.fill('#inscProximoMonto', '500');
  await p.dispatchEvent('#inscProximoMonto', 'change');
  await p.waitForTimeout(400);
  check((await h.ops('inscripciones', 'update')).some(u => Number(u.monto_proximo_pago) === 500), 'se cambia ahí mismo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'promesa_monto_movida'), 'queda en la actividad');
  await h.limpiarOps();
  await p.click('#inscPagaEnCurso');
  await p.waitForTimeout(400);
  check((await h.ops('inscripciones', 'update')).some(u => u.fecha_proximo_pago === null && u.monto_proximo_pago === null), '"Lo paga en su curso" quita la fecha y la cantidad');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('4. Cobranza y el semáforo cobran lo prometido');
  const r = await p.evaluate(f => {
    const base = { id:'x', restante:700, anticipo:700, precio_pactado:1400, eventos:{ fecha:'2030-01-01' }, personas:{ nombre:'X' }, pagos:[], estatus:{ clave:'anticipo_vigente' } };
    cobDatos = { leads:[], inscritas:[{ ...base, fecha_proximo_pago:f, monto_proximo_pago:300 }] };
    const it = itemsCobranza(true)[0];
    return { monto:it.monto, queEs:it.queEs, sinFecha:montoPromesaInsc({ ...base, monto_proximo_pago:300 }), deMas:montoPromesaInsc({ ...base, fecha_proximo_pago:f, monto_proximo_pago:900 }) };
  }, mas(8));
  check(r.monto === 300 && r.queEs === 'va a dar', 'su renglón dice "va a dar $300"');
  check(r.sinFecha === 700 && r.deMas === 700, 'sin fecha, o si prometió más de lo que debe, se cobra lo que debe');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(l => { leadsCache = [l]; leadAbiertoId = l.id; abrirRegistrarPago(); }, lead('l3', 'p03', 'Lead Celular', {}));
  await p.waitForSelector('#modalRegistrarPago.open');
  await p.fill('#regPagoFecha2', mas(10));
  await p.dispatchEvent('#regPagoFecha2', 'change');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.evaluate(() => document.getElementById('regPagoSegundo').scrollIntoView());
  await h.captura('segundo-pago-celular.png');

  await h.terminar();
})();
