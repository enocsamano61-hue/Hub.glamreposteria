/* Cobranza → Completar datos (30 oct 2026): una lista de lo que falta (inscritas sin fecha de pago, inscritas sin
   vendedora, leads sin curso) que se llena ahí mismo, renglón por renglón; al completarse el renglón sale y queda
   en la actividad. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = (id, dias, ciudad) => ({ id, fecha:mas(dias), curso_id:'cur1', ciudad_id:'c' + id, ciudades:{ id:'c' + id, nombre:ciudad || 'Ciudad ' + id } });
const insc = (id, nombre, extra) => ({ id, persona_id:'p' + id, anticipo:0, restante:1400, liquidado:false, precio_pactado:1400, paquete:'BASICO', asesor_id:'u2', fecha_proximo_pago:null,
  personas:{ id:'p' + id, nombre, telefono_principal:'5500000000' }, estatus:{ id:2, clave:'no_vence_pago', etiqueta:'x' }, eventos:ev('A', 60), ...extra });
const lead = (id, nombre, extra) => ({ id, persona_id:'p' + id, estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:null, creado_en:new Date().toISOString(),
  personas:{ id:'p' + id, nombre, telefono_principal:'5511111111' }, ciudades:{ nombre:'Ciudad A' }, ...extra });

(async () => {
  const inscripciones = [
    insc('i1', 'Sin Fecha Uno'), insc('i2', 'Sin Fecha Dos'),
    insc('i3', 'Sin Vendedora', { asesor_id:null, anticipo:700, restante:700, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' } }),
    insc('i4', 'Ya No Va Sin Vend', { asesor_id:null, estatus:{ id:6, clave:'no_va_al_curso', etiqueta:'x' } }),
  ];
  const h = await abrirHub({ tablas:{ inscripciones, pagos:[], interacciones:[],
      leads:[lead('l1', 'Lead Sin Curso'), lead('l2', 'Lead Con Curso', { evento_id:'A' })] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true }, equipo:[{ id:'u1', nombre:'Cobranza Prueba', es_vendedor:false, rol:'Cobranza' }, { id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  await p.evaluate(async () => {
    cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA'];
    EVENTOS_CAL = [{ id:'A', fecha:window.__f60, ciudad_id:'cA', ciudades:{ nombre:'Ciudad A' } }, { id:'B', fecha:window.__f90, ciudad_id:'cB', ciudades:{ nombre:'Ciudad B' } }];
    setActiveSection('cobranza'); await renderCobranza();
  }).catch(() => {});
  await p.evaluate(([a, b]) => { window.__f60 = a; window.__f90 = b; EVENTOS_CAL = [{ id:'A', fecha:a, ciudad_id:'cA', ciudades:{ nombre:'Ciudad A' } }, { id:'B', fecha:b, ciudad_id:'cB', ciudades:{ nombre:'Ciudad B' } }];
    setActiveSection('cobranza'); return renderCobranza(); }, [mas(60), mas(90)]);
  await p.waitForTimeout(400);
  await p.click('#cobTabs [data-cob-tab="datos"]');
  await p.waitForTimeout(500);
  const caja = () => p.textContent('#cobVistaDatos');

  h.paso('1. Una sola lista de lo que falta');
  let t = await caja();
  check(t.includes('Inscritas sin fecha de pago · 2') && t.includes('Inscritas sin vendedora · 1') && t.includes('Leads sin curso · 1'), 'tres bloques con su cuenta');
  check(t.includes('Sin Fecha Uno') && t.includes('Sin Vendedora') && t.includes('Lead Sin Curso') && !t.includes('Ya No Va') && !t.includes('Lead Con Curso'), 'solo a quien le falta (no a quien ya no va ni a quien ya tiene curso)');
  check(t.includes('4 por completar'), 'el total');
  await h.captura('cobranza-completar.png');

  h.paso('2. Fecha de pago');
  await h.limpiarOps();
  await p.fill('[data-cd-id="i1"] [data-cd-fecha]', mas(5));
  await p.waitForTimeout(500);
  const up = (await h.ops('inscripciones', 'update')).pop();
  check(up && up.fecha_proximo_pago === mas(5), 'guarda la fecha en su ficha');
  check(!(await caja()).includes('Sin Fecha Uno') && (await caja()).includes('Inscritas sin fecha de pago · 1'), 'el renglón sale');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'fecha_cobro_movida'), 'y queda en la actividad');

  h.paso('3. Vendedora');
  await h.limpiarOps();
  await p.selectOption('[data-cd-id="i3"] [data-cd-vend]', 'u2');
  await p.waitForTimeout(500);
  check((await h.ops('inscripciones', 'update')).pop()?.asesor_id === 'u2', 'guarda la vendedora');
  check(!(await caja()).includes('Inscritas sin vendedora'), 'el bloque desaparece al quedar vacío');

  h.paso('4. Curso del lead');
  const opts = await p.$$eval('[data-cd-id="l1"] [data-cd-curso] optgroup', gs => gs.map(g => g.label + ':' + g.querySelectorAll('option').length));
  check(opts.join() === 'De su ciudad:1,Otros cursos:1', 'primero los cursos de su ciudad: ' + opts.join());
  await h.limpiarOps();
  await p.selectOption('[data-cd-id="l1"] [data-cd-curso]', 'A');
  await p.waitForTimeout(500);
  const ul = (await h.ops('leads', 'update')).pop();
  check(ul && ul.evento_id === 'A' && ul.ciudad_interes_id === 'cA', 'guarda el curso y su ciudad');

  h.paso('5. Cuando todo está completo (menos la que queda sin fecha)');
  await p.fill('[data-cd-id="i2"] [data-cd-fecha]', mas(6));
  await p.waitForTimeout(500);
  check((await caja()).includes('Todo completo'), 'dice "Todo completo"');
  await h.captura('cobranza-completar-listo.png');

  h.paso('6. Celular');
  await p.evaluate(() => { cd.sinFecha = [{ id:'x', nombre:'Alguien', donde:'Ciudad · 1 ene', debe:1400, vendedor:'' }]; cdPintar(); });
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('cobranza-completar-celular.png');

  await h.terminar();
})();
