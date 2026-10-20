/* Academia Glam fase 1c: acceso de las alumnas (retirar con adeudo, devolver al ponerse al corriente),
   aviso al bloc, candidatas con inscripción y "ya liquidó", y configuración de la generación.
   Las funciones de la base (agl_*) se simulan con window.__rpc; lo que revisa la base (7 días de atraso,
   un aviso por mensualidad, cerrar avisos al pagar, permisos) se probó aparte contra Supabase. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const hoy = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ayer = new Date(Date.now() - 864e5).toISOString();

const mensual = (id, nombre, extra) => ({ id, alumna_id:'a' + id, plan_id:'pm', vendedor_id:'u2', estado:'activa', notas:null, creado_en:hoy,
  alumna_nombre:nombre, alumna_telefono:'5512345678', plan_nombre:'Chef repostero mensual', meses:24, precio_mensual:799,
  pagadas:2, por_confirmar:0, atrasadas:0, proxima_numero:3, proxima_vence:mas(20), generacion_id:'g5',
  pendiente_id:'p' + id, pendiente_numero:3, pendiente_vence:mas(20), pendiente_monto:799, modalidad:'mensual', total:null, abonado:0,
  abonos_por_confirmar:0, fecha_promesa:null, acceso_dado_en:ayer, acceso_retirado_en:null, ultimo_seguimiento_tipo:null, ultimo_seguimiento_en:null, ...extra });
const SUSC = [
  mensual('s1', 'Alumna Debe Nueve', { atrasadas:1, proxima_vence:mas(-9), pendiente_vence:mas(-9) }),
  mensual('s2', 'Alumna Debe Cinco', { atrasadas:1, proxima_vence:mas(-5), pendiente_vence:mas(-5) }),
  mensual('s3', 'Alumna Al Corriente Sin Acceso', { acceso_dado_en:null, acceso_retirado_en:ayer }),
  mensual('s4', '<img src=x onerror="window.__xss=1"> Retirada Debe', { acceso_dado_en:null, acceso_retirado_en:ayer, atrasadas:1, pendiente_vence:mas(-12) }),
  mensual('s5', 'Alumna Al Dia Con Acceso'),
];
const COBROS = [
  { mensualidad_id:'ps1', suscripcion_id:'s1', numero:3, vence:mas(-9), monto:799, estado:'pendiente', meses:24, vendedor_id:'u2',
    alumna_nombre:'Alumna Debe Nueve', alumna_telefono:'5512345678', plan_nombre:'Chef repostero mensual' },
];
const PLANES = [
  { id:'pm', nombre:'Chef repostero mensual', modalidad:'mensual', precio_mensual:799, precio_total:null, meses:24, dia_cobro:'primer_pago', dia_fijo:null, activo:true },
  { id:'pu', nombre:'Chef repostero pago único', modalidad:'abonos', precio_mensual:333.21, precio_total:7997, meses:24, dia_cobro:'primer_pago', dia_fijo:null, activo:true },
  { id:'pd', nombre:'Diplomado 6 meses (poner precio)', modalidad:'mensual', precio_mensual:1, precio_total:null, meses:6, dia_cobro:'primer_pago', dia_fijo:null, activo:false },
];
const cand = (id, nombre, abonado, inscripcion, pagadas) => ({ alumna_id:id, nombre, telefono:'5511111111', vendedor_texto:null, vendedor_propuesto:null,
  pagadas, por_revisar:0, proxima_numero:pagadas + 1, ultimo_pago:null, decision:null, abonado, inscripcion, liquida_desde:6997 });

(async () => {
  const equipo = [...EQUIPO_EJEMPLO, { id:'u3', nombre:'Admin Prueba', es_vendedor:true, rol:'Gerente', es_admin:true }];
  const h = await abrirHub({ tablas:{ vista_agl_cobros:COBROS, vista_agl_cuentas:[], vista_agl_abonos_por_confirmar:[], vista_agl_suscripciones:SUSC,
      academia_glam_mensualidades:[], academia_glam_abonos:[], academia_glam_seguimientos:[], academia_glam_planes:PLANES,
      academia_glam_generaciones:[{ generacion_id:'g5', tipo:'mensualidades', liquida_desde:6997, columna_inscripcion:'INSCRIPCION O PAGO UNICO' }] },
    usuario:{ id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }, equipo });
  const { p, check } = h;
  await p.evaluate(() => {
    window.__llamadas = [];
    const original = sb.rpc;
    sb.rpc = (fn, args) => { window.__llamadas.push({ fn, args }); return original(fn, args); };
    window.__rpc.agl_retirar_acceso = () => null;
    window.__rpc.agl_dar_acceso = () => null;
    window.__rpc.agl_revisar_accesos = () => ({ creados:0, cerrados:0 });
    window.__rpc.agl_activar = () => 'nueva';
    window.__rpc.agl_activar_abonos = () => 'nueva';
    window.__rpc.agl_config_generacion = () => null;
    window.__rpc.agl_generaciones = () => [{ generacion_id:'g5', nombre:'5ª generación mensual', orden:5, alumnas:3, paga_por_mes:true, confirmado:true,
      columnas:['MENS 1', 'MENS 2'], disponibles:['INSCRIPCION O PAGO UNICO', 'MENS 1', 'MENS 2'], activadas:0 }];
    window.__rpc.agl_candidatas_v3 = () => [
      { alumna_id:'c1', nombre:'Candidata Liquido', telefono:'5511111111', vendedor_texto:null, vendedor_propuesto:null, pagadas:0, por_revisar:0,
        proxima_numero:1, ultimo_pago:null, decision:null, abonado:0, inscripcion:6997, liquida_desde:6997 },
      { alumna_id:'c2', nombre:'Candidata Abonando', telefono:'5511111111', vendedor_texto:null, vendedor_propuesto:null, pagadas:1, por_revisar:0,
        proxima_numero:2, ultimo_pago:null, decision:null, abonado:1000, inscripcion:500, liquida_desde:6997 },
      { alumna_id:'c3', nombre:'Candidata Mensual', telefono:'5511111111', vendedor_texto:null, vendedor_propuesto:null, pagadas:2, por_revisar:0,
        proxima_numero:3, ultimo_pago:null, decision:null, abonado:1598, inscripcion:500, liquida_desde:6997 },
    ];
  });
  const llamadas = fn => p.evaluate(f => window.__llamadas.filter(l => l.fn === f), fn);
  const abrir = async tab => { await p.evaluate(t => { agl.tab = t; setActiveSection('academia_glam'); renderAcademiaGlam(); }, tab); await p.waitForTimeout(300); };
  const confirmar = async motivo => {
    await p.waitForSelector('#modalConfirmar.open');
    if(motivo !== undefined) await p.fill('#confirmarMotivo', motivo);
    await p.click('#confirmarSi'); await p.waitForTimeout(300);
  };

  h.paso('1. Cobros: retirar y devolver acceso');
  await abrir('cobros');
  const grupos = await p.$$eval('.agl-grupo', g => g.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(grupos.some(t => t.startsWith('⛔ Deben 7 días o más y tienen acceso') && t.endsWith(' 1')), 'grupo "retirar acceso" con la de 9 días (' + grupos.join(' | ') + ')');
  check(grupos.some(t => t.startsWith('↩️ Se pusieron al corriente') && t.endsWith(' 1')), 'grupo "devolver acceso" solo con la que está al corriente');
  const txt = await p.textContent('#agl-cobros');
  check(txt.includes('9 días con acceso') && !txt.includes('Alumna Debe Cinco Vende') && !txt.includes('5 días con acceso'), 'la de 5 días todavía no sale para retirar');
  check(await p.$('[data-agl-retirar="s1"]') !== null && await p.$('[data-agl-retirar="s2"]') === null && await p.$('[data-agl-retirar="s5"]') === null, 'solo se retira a quien lleva 7 días o más');
  check(await p.$('[data-agl-acceso="s3"]') !== null && await p.$('[data-agl-acceso="s4"]') === null, 'se devuelve a la que se puso al corriente, no a la que sigue debiendo');
  check(!(await p.evaluate(() => window.__xss)), 'los nombres se escapan');
  await h.captura('academia-glam-acceso-cobros.png');

  await p.click('[data-agl-retirar="s1"]');
  await confirmar('No contesta');
  const ra = (await llamadas('agl_retirar_acceso'))[0]?.args;
  check(ra && ra.p_suscripcion === 's1' && ra.p_nota === 'No contesta', 'retira el acceso con su motivo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'agl_retirar_acceso' && a.detalle.includes('No contesta')), 'queda en la actividad');
  await p.click('[data-agl-retirar="s1"]');
  await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarNo'); await p.waitForTimeout(200);
  check((await llamadas('agl_retirar_acceso')).length === 1, 'cancelar no retira');

  await p.click('[data-agl-acceso="s3"]');
  await confirmar();
  check((await llamadas('agl_dar_acceso'))[0]?.args?.p_suscripcion === 's3', 'devuelve el acceso');

  h.paso('2. Registrar el pago desde la fila de acceso');
  await p.click('#agl-cobros [data-agl-pagar-susc="s1"]');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open') && agl.pago?.mensualidad_id === 'ps1'), 'abre el pago de la mensualidad que debe');
  await p.evaluate(() => document.getElementById('modalAglPago').classList.remove('open'));

  h.paso('3. Ficha de una mensual: acceso y seguimiento');
  await p.click('[data-agl-ficha="s1"]');
  await p.waitForTimeout(300);
  const ficha = await p.textContent('#aglFichaCuerpo');
  check(ficha.includes('🔓 Acceso dado') && ficha.includes('Seguimiento'), 'muestra el acceso y su seguimiento');
  check(await p.$('#aglFichaCuerpo [data-agl-retirar="s1"]') !== null, 'desde la ficha se puede retirar el acceso');
  await h.captura('academia-glam-acceso-ficha.png');
  await p.evaluate(() => { document.getElementById('modalAglFicha').classList.remove('open'); agl.ficha = null; });
  await p.click('[data-agl-ficha="s3"]');
  await p.waitForTimeout(300);
  check((await p.textContent('#aglFichaCuerpo')).includes('⛔ Acceso retirado') && await p.$('#aglFichaCuerpo [data-agl-acceso="s3"]') !== null, 'la ficha de una retirada al corriente ofrece devolverlo');
  await p.evaluate(() => { document.getElementById('modalAglFicha').classList.remove('open'); agl.ficha = null; });

  h.paso('4. Aviso del bloc: "Ir →" abre la ficha');
  await p.evaluate(() => { NOTAS = [{ id:'n1', texto:'⛔ Retirar acceso', enlace:{ vista:'academia_glam', etiqueta:'Abrir su ficha', agl_susc:'s1', agl_mens:'ps1' } }]; irAEnlaceNota('n1'); });
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.getElementById('modalAglFicha').classList.contains('open') && agl.ficha?.id === 's1'), 'abre la ficha de la alumna');
  await p.evaluate(() => { document.getElementById('modalAglFicha').classList.remove('open'); agl.ficha = null; });

  h.paso('5. Revisar accesos al entrar');
  await p.evaluate(() => { window.__llamadas = []; return aglRevisarAccesos(); });
  check((await llamadas('agl_revisar_accesos')).length === 1, 'quien ve a todas revisa los accesos');
  await p.evaluate(() => { window.__llamadas = []; usuarioActual = { ...usuarioActual, es_admin:false, rol:'Ventas' }; PERMISOS_ACCION_CACHE = {}; return aglRevisarAccesos(); });
  check((await llamadas('agl_revisar_accesos')).length === 0, 'una vendedora no');

  h.paso('6. Permisos en pantalla');
  await abrir('cobros');
  check(await p.$('#agl-cobros [data-agl-retirar]') === null && await p.$('#agl-cobros [data-agl-acceso]') === null, 'la vendedora no retira ni devuelve acceso');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, rol:'Cobranza' }; PERMISOS_ACCION_CACHE = { Cobranza:new Set(['ver_todo_academia_glam']) }; });
  await abrir('cobros');
  check(await p.$('#agl-cobros [data-agl-retirar="s1"]') !== null && await p.$('#agl-cobros [data-agl-pagar-susc]') === null, 'Cobranza retira el acceso pero no registra el pago');
  await p.evaluate(() => { usuarioActual = { id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }; });

  h.paso('7. Candidatas: inscripción, "ya liquidó" y "ya tiene acceso"');
  await abrir('alumnas');
  const fila = i => `[data-agl-cand="${i}"]`;
  const t0 = await p.textContent(fila(0)), t1 = await p.textContent(fila(1));
  check(t0.includes('✅ Liquidó') && t0.includes('$6,997 de inscripción'), 'marca a la que ya liquidó y muestra la inscripción');
  check(!t1.includes('✅ Liquidó') && t1.includes('$500 de inscripción'), 'la que va abonando no sale como liquidada');
  check(!(await p.$(`${fila(0)} [data-agl-c="acceso"]`)), 'sin plan no pide acceso');
  await p.selectOption(`${fila(0)} [data-agl-c="plan"]`, 'pu');
  await p.selectOption(`${fila(1)} [data-agl-c="plan"]`, 'pu');
  await p.selectOption(`${fila(2)} [data-agl-c="plan"]`, 'pm');
  check(await p.inputValue(`${fila(0)} [data-agl-c="total"]`) === '6997' && await p.inputValue(`${fila(0)} [data-agl-c="previo"]`) === '6997'
        && await p.isChecked(`${fila(0)} [data-agl-c="acceso"]`), 'la que liquidó: su total es lo que pagó y queda con acceso');
  check(await p.inputValue(`${fila(1)} [data-agl-c="total"]`) === '7997' && await p.inputValue(`${fila(1)} [data-agl-c="previo"]`) === '1500'
        && !(await p.isChecked(`${fila(1)} [data-agl-c="acceso"]`)), 'la que va abonando: total del plan, la inscripción cuenta como abono y sin acceso');
  check(await p.isChecked(`${fila(2)} [data-agl-c="acceso"]`), 'la mensual queda con acceso');
  await h.captura('academia-glam-acceso-candidatas.png');
  // Al escribir lo abonado se recalcula la casilla sin perder lo demás.
  await p.fill(`${fila(1)} [data-agl-c="previo"]`, '7997');
  await p.fill(`${fila(1)} [data-agl-c="fecha"]`, mas(3));
  check(await p.isChecked(`${fila(1)} [data-agl-c="acceso"]`) && await p.inputValue(`${fila(1)} [data-agl-c="fecha"]`) === mas(3), 'si ya abonó el total se propone el acceso y no se pierde la fecha');
  await p.fill(`${fila(1)} [data-agl-c="previo"]`, '1500');
  await p.press(`${fila(1)} [data-agl-c="previo"]`, 'Tab');
  await p.check(`${fila(1)} [data-agl-c="acceso"]`);
  for(const i of [0, 1, 2]) await p.check(`${fila(i)} [data-agl-sel]`);
  await p.fill(`${fila(2)} [data-agl-c="fecha"]`, mas(5));
  await p.press(`${fila(2)} [data-agl-c="fecha"]`, 'Tab');
  await p.click('#aglActivar');
  check((await p.textContent('#aglActivarAviso')).includes('todavía no liquida') && (await llamadas('agl_activar_abonos')).length === 0, 'no deja dar acceso a quien no ha liquidado');
  await p.uncheck(`${fila(1)} [data-agl-c="acceso"]`);
  await p.click('#aglActivar');
  await p.waitForTimeout(500);
  const ab = await llamadas('agl_activar_abonos'), me = await llamadas('agl_activar');
  const a1 = ab.find(x => x.args.p_alumna === 'c1')?.args, a2 = ab.find(x => x.args.p_alumna === 'c2')?.args, a3 = me[0]?.args;
  check(a1 && a1.p_total === 6997 && a1.p_abonado_previo === 6997 && a1.p_con_acceso === true, 'activa a la que liquidó con su total y acceso');
  check(a2 && a2.p_total === 7997 && a2.p_abonado_previo === 1500 && a2.p_con_acceso === false && a2.p_fecha_promesa === mas(3), 'activa a la que abona sin acceso y con su promesa');
  check(a3 && a3.p_alumna === 'c3' && a3.p_proxima_numero === 3 && a3.p_proxima_fecha === mas(5) && a3.p_con_acceso === true, 'activa a la mensual con acceso');

  h.paso('8. Generación: "liquidó desde" y columna de inscripción');
  await abrir('planes');
  const gen = '[data-agl-gen="g5"]';
  check((await p.textContent(gen)).includes('liquidó desde $6,997') && (await p.textContent(gen)).includes('inscripción: INSCRIPCION O PAGO UNICO'), 'muestra cómo se lee la generación');
  check((await p.textContent('#agl-planes tbody')).includes('Diplomado 6 meses (poner precio)') && (await p.textContent('#agl-planes tbody')).includes('Desactivado'), 'el plan sin precio queda desactivado');
  await p.fill(`${gen} [data-agl-gliq]`, '7997');
  await p.press(`${gen} [data-agl-gliq]`, 'Tab');
  await p.selectOption(`${gen} [data-agl-gins]`, '');
  await p.click(`${gen} [data-agl-gguardar]`);
  await p.waitForTimeout(300);
  const cg = (await llamadas('agl_config_generacion'))[0]?.args;
  check(cg && cg.p_liquida_desde === 7997 && cg.p_columna_inscripcion === null && cg.p_tipo === 'mensualidades', 'guarda "liquidó desde" y la columna de inscripción');
  await h.captura('academia-glam-acceso-generacion.png');

  h.paso('9. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await abrir('cobros');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'Cobros sin scroll de lado');
  await h.captura('academia-glam-acceso-celular.png');

  await h.terminar();
})();
