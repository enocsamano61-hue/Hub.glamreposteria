/* Monto del anticipo prometido (30 oct 2026, pedido de Jared): cuánto dijo el lead que va a dar, además de la fecha.
   - "+ Nuevo lead" y la ficha del lead: casilla "Monto del anticipo" con botón "$700"; vacío = todavía no lo sabe.
   - Registrar pago arranca con lo prometido y, si registran menos, lo dice (no lo impide).
   - Cobranza → Completar datos: "Leads con fecha de anticipo pero sin monto", se llena ahí mismo.
   - La tarjeta del tablero dice "Anticipo <fecha> · $monto". Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'A', fecha:mas(60), curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const lead = (id, nombre, extra) => ({ id, persona_id:'p' + id, estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:'A', eventos:ev,
  creado_en:new Date().toISOString(), personas:{ id:'p' + id, nombre, telefono_principal:'55111111' + id.slice(-2).padStart(2, '0') }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{ inscripciones:[], pagos:[], interacciones:[], personas:[], mensajes_predeterminados:[],
      leads:[
        lead('l1', 'Lead Promete Quinientos', { fecha_compromiso_pago:mas(2), monto_anticipo:500 }),
        lead('l2', 'Lead Sin Monto', { fecha_compromiso_pago:mas(1), monto_anticipo:null }),
        lead('l3', 'Lead Sin Fecha', { fecha_compromiso_pago:null, monto_anticipo:null }) ] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true },
    equipo:[{ id:'u1', nombre:'Cobranza Prueba', es_vendedor:false, rol:'Cobranza' }, { id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  await p.evaluate(e => { cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA']; EVENTOS_CAL = [e];
    window.__rpc.glamy_buscar_persona = () => ({ encontradas:0, personas:[] }); }, ev);

  h.paso('1. Nuevo lead: casilla con botón $700');
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(400);
  const nuevo = async () => { await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open'); };
  await nuevo();
  check(await p.isVisible('#nuevoMontoAnticipo') && (await p.inputValue('#nuevoMontoAnticipo')) === '', 'la casilla sale vacía (no se da por hecho que dará $700)');
  await p.fill('#nuevoTelefono', '5522220001');
  await p.fill('#nuevoNombre', 'Lead Nueva Setecientos');
  await p.fill('#nuevoFechaAnticipo', mas(3));
  await p.click('#modalNuevo [data-monto-rapido="nuevoMontoAnticipo"]');
  check((await p.inputValue('#nuevoMontoAnticipo')) === '700', 'un toque en "$700" lo escribe');
  await h.captura('monto-anticipo-nuevo.png');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(600);
  let ins = (await h.ops('leads', 'insert'))[0];
  check(ins && Number(ins.monto_anticipo) === 700 && ins.fecha_compromiso_pago === mas(3), 'se guarda con su fecha y su monto');

  await nuevo();
  check((await p.inputValue('#nuevoMontoAnticipo')) === '', 'el formulario empieza limpio');
  await p.fill('#nuevoTelefono', '5522220002');
  await p.fill('#nuevoNombre', 'Lead Abonito');
  await p.fill('#nuevoMontoAnticipo', '350');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(600);
  ins = (await h.ops('leads', 'insert'))[0];
  check(ins && Number(ins.monto_anticipo) === 350, 'otro monto (abonos): se guarda el que escriban');

  await nuevo();
  await p.fill('#nuevoTelefono', '5522220003');
  await p.fill('#nuevoNombre', 'Lead No Sabe');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(600);
  ins = (await h.ops('leads', 'insert'))[0];
  check(ins && ins.monto_anticipo === null, 'vacío: se guarda sin monto (no frena el alta)');

  await nuevo();
  await p.fill('#nuevoTelefono', '5522220004');
  await p.fill('#nuevoNombre', 'Lead Monto Raro');
  await p.fill('#nuevoMontoAnticipo', '0');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(400);
  check((await h.ops('leads', 'insert')).length === 0 && (await p.textContent('#toast')).includes('mayor a $0'), 'en $0 no guarda y dice por qué');
  await p.evaluate(() => document.getElementById('modalNuevo').classList.remove('open'));

  h.paso('2. La tarjeta del tablero dice cuánto');
  check((await p.textContent('#board')).includes('$500'), '"Anticipo <fecha> · $500"');

  h.paso('3. Ficha del lead: se ve y se corrige');
  await p.evaluate(() => abrirModalLead('l1'));
  await p.waitForTimeout(500);
  check((await p.inputValue('#modalMontoAnticipo')) === '500', 'trae lo que prometió');
  await p.fill('#modalMontoAnticipo', '400');
  await h.limpiarOps();
  await p.click('#guardarLead');
  await p.waitForTimeout(500);
  check((await h.ops('leads', 'update')).some(u => Number(u.monto_anticipo) === 400), 'al guardar se corrige');
  await p.evaluate(() => { window.__tablas.leads.find(l => l.id === 'l1').monto_anticipo = 500; document.getElementById('modalLead').classList.remove('open'); });

  h.paso('4. Registrar pago arranca con lo prometido y avisa si es menos');
  await p.evaluate(() => { leadsCache.find(l => l.id === 'l1').monto_anticipo = 500; return abrirModalLead('l1'); });
  await p.waitForTimeout(500);
  await p.click('#btnRegistrarPago');
  await p.waitForSelector('#modalRegistrarPago.open');
  check((await p.inputValue('#regPagoMonto')) === '500' && (await p.textContent('#regPagoPrometido')).includes('Prometió dar $500'), 'arranca con $500 y lo dice');
  await p.fill('#regPagoMonto', '200');
  check((await p.textContent('#regPagoPrometido')).includes('Prometió $500; estás registrando $200') && (await p.textContent('#regPagoPrometido')).includes('Se puede'), 'si registra menos, lo dice sin impedirlo');
  await h.captura('monto-anticipo-registrar-pago.png');
  await p.evaluate(() => { document.getElementById('modalRegistrarPago').classList.remove('open'); document.getElementById('modalLead').classList.remove('open'); });
  await p.evaluate(() => abrirModalLead('l3'));
  await p.waitForTimeout(500);
  await p.click('#btnRegistrarPago');
  await p.waitForSelector('#modalRegistrarPago.open');
  check((await p.inputValue('#regPagoMonto')) === '700' && (await p.textContent('#regPagoPrometido')) === '', 'sin monto prometido: $700 de siempre, sin aviso');
  await p.evaluate(() => { document.getElementById('modalRegistrarPago').classList.remove('open'); document.getElementById('modalLead').classList.remove('open'); });

  h.paso('5. Completar datos: leads con fecha y sin monto');
  // Solo los leads de ejemplo (los que se crearon arriba no traen datos completos en el simulador)
  await p.evaluate(async () => { window.__tablas.leads = window.__tablas.leads.filter(l => ['l1', 'l2', 'l3'].includes(l.id)); setActiveSection('cobranza'); await renderCobranza(); });
  await p.waitForTimeout(400);
  await p.click('#cobTabs [data-cob-tab="datos"]');
  await p.waitForTimeout(600);
  const caja = () => p.textContent('#cobVistaDatos');
  check((await caja()).includes('Leads con fecha de anticipo pero sin monto · 1') && (await caja()).includes('Lead Sin Monto'), 'sale quien tiene fecha y no monto');
  check(!(await caja()).includes('Lead Promete Quinientos') && !(await caja()).includes('Lead Sin Fecha'), 'no sale quien ya tiene monto ni quien no tiene fecha');
  await h.captura('monto-anticipo-completar.png');
  await h.limpiarOps();
  await p.click('[data-cd-k="m"][data-cd-id="l2"] [data-monto-rapido]');
  await p.waitForTimeout(500);
  check((await h.ops('leads', 'update')).some(u => Number(u.monto_anticipo) === 700), 'un toque en "$700" lo guarda');
  check(!(await caja()).includes('Lead Sin Monto'), 'y el renglón sale');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'lead_actualizado' && a.detalle.includes('anticipo prometido $700')), 'queda en la actividad');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(async () => { window.__tablas.leads.find(l => l.id === 'l2').monto_anticipo = null; await renderCobranza(); return cdCargar(); });
  await p.waitForTimeout(500);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('monto-anticipo-celular.png');

  await h.terminar();
})();
