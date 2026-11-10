/* Cursos con "fecha por definir" (10 nov 2026, Jared: "les vendimos sin tener fecha, solo que podamos poner la ciudad").
   - En los selectores de curso sale "+ Otra ciudad · fecha por definir…": se elige ciudad y gira y el Hub crea (o usa)
     su curso por definir (curso_por_definir); queda "Ciudad B · fecha por definir".
   - Se registra el pago y se inscribe igual. Si se cancela, el selector regresa a vacío.
   - Cobranza: nunca "Curso ya pasó"; si ya pagó algo, lo que falta va a "Más adelante" y dice "fecha por definir".
   - Calendario: recuadro "Fecha por definir" con inscritas y leads; un administrador le pone fecha (curso_poner_fecha).
   Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ciudades = [{ id:'cA', nombre:'Ciudad A' }, { id:'cB', nombre:'Ciudad B' }];
const ev = { id:'ev1', fecha:mas(60), fecha_por_definir:false, ciudad_id:'cA', curso_id:'cur1', sede:'Salón', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const evPD = { id:'evPD', fecha:null, fecha_por_definir:true, ciudad_id:'cB', curso_id:'cur1', creado_en:new Date().toISOString(), ciudades:{ id:'cB', nombre:'Ciudad B' } };
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55500000' + id.slice(-2), telefono_alternativo:null });

(async () => {
  const h = await abrirHub({ tablas:{ pagos:[], interacciones:[], comprobantes:[], ciudades, eventos:[{ ...ev }],
      inscripciones:[
        { id:'i1', persona_id:'p1', evento_id:'evPD', anticipo:700, restante:700, liquidado:false, precio_pactado:1400, estatus_id:11, eventos:{ ...evPD } },
        { id:'i2', persona_id:'p2', evento_id:'evPD', anticipo:0, restante:1400, liquidado:false, precio_pactado:1400, estatus_id:1, eventos:{ ...evPD } }],
      leads:[{ id:'lx', persona_id:'p3', evento_id:'evPD', estatus_id:2 }] },
    usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Dueña', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(c => { CIUDADES = c; GIRAS = [{ id:'cur1', nombre:'CURSO PRUEBA', corto:'Pasteles' }]; window.renderBoard = async () => {}; return cargarPrecios(); }, ciudades);
  // La base: curso_por_definir crea el curso (y avisa a Jared); curso_poner_fecha le pone fecha
  await p.evaluate(pd => {
    window.__rpc.curso_por_definir = a => { if(!window.__tablas.eventos.some(e => e.id === 'evPD')) window.__tablas.eventos.push({ ...pd }); return 'evPD'; };
    window.__rpc.curso_poner_fecha = a => ({ ciudad:'Ciudad B', fecha:a.p_fecha, inscritas:2 });
  }, evPD);
  await p.evaluate(() => cargarEventosCalendario());

  h.paso('1. Registrar pago en una ciudad sin fecha');
  const lead = { id:'l1', persona_id:'p9', evento_id:null, ciudad_interes_id:'cB', paquete:'BASICO', asesor_id:'u2', creado_en:new Date().toISOString(),
    estatus:{ id:2 }, estatus_id:2, comentario:null, personas:persona('p9', 'Lead Ciudad Sin Fecha'), eventos:null, ciudades:{ nombre:'Ciudad B' } };
  await p.evaluate(l => { leadsCache = [l]; leadAbiertoId = l.id; abrirRegistrarPago(); }, lead);
  await p.waitForSelector('#modalRegistrarPago.open');
  check(await p.evaluate(() => [...document.querySelectorAll('#regPagoEvento option')].some(o => o.value === '__pordefinir')), 'el selector trae "+ Otra ciudad · fecha por definir…"');
  const elegir = () => p.evaluate(() => { const s = document.getElementById('regPagoEvento'); s.value = '__pordefinir'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  await elegir();
  await p.waitForSelector('#modalPorDefinir.open');
  check((await p.inputValue('#pdCiudad')) === 'cB', 'propone la ciudad del lead');
  await p.click('#closeModalPorDefinir');
  check((await p.evaluate(() => document.getElementById('regPagoEvento').value)) === '', 'si se cancela, el curso queda vacío');
  await elegir();
  await p.waitForSelector('#modalPorDefinir.open');
  await h.captura('por-definir-elegir.png');
  await p.click('#pdGuardar');
  await p.waitForTimeout(500);
  const sel = await p.evaluate(() => { const s = document.getElementById('regPagoEvento'); return { v:s.value, t:s.options[s.selectedIndex]?.textContent }; });
  check(sel.v === 'evPD' && sel.t.includes('Ciudad B') && sel.t.includes('fecha por definir'), 'queda "Ciudad B · fecha por definir"');
  check((await h.ops('rpc:curso_por_definir', 'rpc')).some(d => d.p_ciudad === 'cB' && d.p_curso === 'cur1'), 'la base crea (o usa) su curso por definir');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForTimeout(600);
  check((await h.ops('leads', 'update')).some(u => u.evento_id === 'evPD' && u.pago_reportado_monto > 0), 'el pago se registra en ese curso');

  h.paso('2. Confirmar e inscribir también lo ofrece');
  await p.evaluate(l => { leadsCache = [l]; leadAbiertoId = l.id; abrirModalInscribir(); }, { ...lead, evento_id:'evPD', pago_reportado_monto:700, pago_reportado_fecha:HOY, pago_reportado_por:'u2', pago_reportado_en:new Date().toISOString() });
  await p.waitForSelector('#modalInscribir.open');
  check((await p.evaluate(() => document.getElementById('inscribirEvento').value)) === 'evPD', 'su curso por definir viene elegido');
  await p.evaluate(() => document.getElementById('modalInscribir').classList.remove('open'));

  h.paso('3. Cobranza: nunca "ya pasó"; lo que falta, "Más adelante"');
  const r = await p.evaluate(pd => {
    const base = { anticipo:700, restante:700, precio_pactado:1400, personas:{ nombre:'X' }, pagos:[], estatus:{ clave:'anticipo_vigente' }, eventos:pd };
    cobDatos = { leads:[], inscritas:[{ ...base, id:'a' }] };
    cobDia = new Date().toLocaleDateString('en-CA');
    const it = itemsCobranza(true)[0];
    return { pasado:it.cursoPasado, grupo:grupoCobranza(it), fila:filaCobranza(it, grupoCobranza(it)), puerta:leadEnPuerta({ eventos:pd }) };
  }, evPD);
  check(!r.pasado && r.grupo === 'despues', 'con anticipo: "Más adelante", no "Curso ya pasó"');
  check(r.fila.includes('fecha por definir'), 'su renglón dice "curso con fecha por definir"');
  check(r.puerta, 'sus leads son de la gira que viene');

  h.paso('4. Calendario: "Fecha por definir" y Poner fecha');
  await p.evaluate(pd => { window.__tablas.eventos.forEach(e => { if(e.id === pd.id) Object.assign(e, pd); }); return renderPorDefinir(['cur1']); }, evPD);
  await p.waitForTimeout(300);
  const txt = await p.textContent('#calPorDefinir');
  check(txt.includes('Fecha por definir · 1') && txt.includes('Ciudad B') && txt.includes('2 inscritas (1 con pago)') && txt.includes('1 lead'), 'la ciudad con sus inscritas y leads');
  await p.evaluate(() => document.getElementById('view-calendario').classList.add('active'));
  await p.evaluate(() => { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('view-calendario').classList.add('active'); });
  await h.captura('por-definir-calendario.png');
  await p.fill('[data-pd-fecha]', mas(45));
  await p.click('[data-pd-poner]');
  await p.waitForSelector('#modalConfirmar.open');
  await h.limpiarOps();
  await p.click('#confirmarSi');
  await p.waitForTimeout(500);
  check((await h.ops('rpc:curso_poner_fecha', 'rpc')).some(d => d.p_evento === 'evPD' && d.p_fecha === mas(45)), 'un administrador le pone fecha');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'curso_fecha_puesta'), 'queda en la actividad');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); abrirPorDefinir(document.getElementById('regPagoEvento')); });
  await p.waitForSelector('#modalPorDefinir.open');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('por-definir-celular.png');

  await h.terminar();
})();
