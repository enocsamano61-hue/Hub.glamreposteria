/* Academia Glam fase 1b: "liquidar con abonos", fecha prometida, seguimiento, acceso y ficha de la alumna.
   Las funciones de la base (agl_*) se simulan con window.__rpc; las vistas se pasan como tablas ya planas.
   Lo que revisa la base (permisos, saldo, sobrepago, acceso solo al liquidar) se probó aparte contra Supabase. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const hoy = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const inicioMes = hoy.slice(0, 8) + '01';

const cuenta = (id, nombre, extra) => ({ suscripcion_id:id, alumna_id:'a' + id, vendedor_id:'u2', total:30000, fecha_promesa:null, acceso_dado_en:null,
  alumna_nombre:nombre, alumna_telefono:'5512345678', plan_nombre:'Chef repostero pago único', abonado:10000, por_confirmar:0, saldo:20000,
  ultimo_seguimiento_tipo:null, ultimo_seguimiento_en:null, ultimo_seguimiento_nota:null, ...extra });
const CUENTAS = [
  cuenta('k1', 'ALUMNA VENCIDA', { fecha_promesa:mas(-2), ultimo_seguimiento_tipo:'no_contesto', ultimo_seguimiento_en:new Date().toISOString() }),
  cuenta('k2', 'Alumna Promete Hoy', { fecha_promesa:hoy }),
  cuenta('k3', 'Alumna De La Semana', { fecha_promesa:mas(4), vendedor_id:'u1' }),
  cuenta('k4', '<img src=x onerror="window.__xss=1"> Sin Fecha', { fecha_promesa:null }),
  cuenta('k5', 'Alumna Liquido', { abonado:30000, saldo:0 }),
  cuenta('k6', 'Alumna Lejana', { fecha_promesa:mas(20) }),
];
const POR_CONF = [{ abono_id:'b9', suscripcion_id:'k3', monto:2000, fecha:hoy, forma_pago:'Transferencia', vendedor_id:'u1', alumna_nombre:'Alumna De La Semana', alumna_telefono:'5512345678', plan_nombre:'Chef repostero pago único' }];
const ABONOS = [
  { id:'b1', suscripcion_id:'k1', monto:10000, fecha:mas(-40), forma_pago:null, estado:'confirmado', previa:true, nota:'Abonado antes de usar el Hub (Excel)', registrado_por:'u3' },
  { id:'b2', suscripcion_id:'k1', monto:1500, fecha:mas(-5), forma_pago:'Efectivo', estado:'no_llego', previa:false, nota:'No llegó (lo registró Admin Prueba)', registrado_por:'u3' },
  { id:'b3', suscripcion_id:'k2', monto:3000, fecha:inicioMes, forma_pago:'Efectivo', estado:'confirmado', previa:false, nota:null, registrado_por:'u3' },
];
const SEGS = [
  { id:'g1', suscripcion_id:'k1', tipo:'no_contesto', nota:'<b>Le marqué</b> 2 veces', fecha_promesa:null, creado_por:'u1', creado_en:new Date().toISOString() },
  { id:'g2', suscripcion_id:'k1', tipo:'promesa', nota:null, fecha_promesa:mas(-2), creado_por:'u1', creado_en:new Date(Date.now() - 5 * 864e5).toISOString() },
];
const susc = (id, extra) => ({ id, alumna_id:'a' + id, plan_id:'pa', vendedor_id:'u2', estado:'activa', notas:null, creado_en:hoy, alumna_nombre:'ALUMNA VENCIDA',
  alumna_telefono:'5512345678', plan_nombre:'Chef repostero pago único', meses:24, precio_mensual:1250, pagadas:0, por_confirmar:0, atrasadas:0,
  proxima_numero:null, proxima_vence:null, generacion_id:'g26', pendiente_id:null, pendiente_numero:null, pendiente_vence:null, pendiente_monto:null,
  modalidad:'abonos', total:30000, abonado:10000, abonos_por_confirmar:0, fecha_promesa:mas(-2), acceso_dado_en:null, ultimo_seguimiento_tipo:'no_contesto', ultimo_seguimiento_en:null, ...extra });
const SUSC = [
  susc('k1'),
  susc('k5', { alumna_nombre:'Alumna Liquido', abonado:30000, fecha_promesa:null }),
  susc('m1', { alumna_nombre:'Alumna Mensual', plan_id:'pm', plan_nombre:'Hobbie mensual', meses:6, precio_mensual:800, pagadas:2, modalidad:'mensual', total:null,
    abonado:0, fecha_promesa:null, proxima_numero:3, proxima_vence:mas(10), pendiente_id:'mm3', pendiente_numero:3, pendiente_vence:mas(10), pendiente_monto:800 }),
];
const MENS = [
  { id:'mm1', suscripcion_id:'m1', numero:1, vence:mas(-50), monto:800, estado:'pagada', previa:true, pagado_en:mas(-50), monto_pagado:null, forma_pago:null, nota:null },
  { id:'mm2', suscripcion_id:'m1', numero:2, vence:mas(-20), monto:800, estado:'pagada', previa:false, pagado_en:mas(-19), monto_pagado:800, forma_pago:'Efectivo', nota:null },
  { id:'mm3', suscripcion_id:'m1', numero:3, vence:mas(10), monto:800, estado:'pendiente', previa:false, pagado_en:null, monto_pagado:null, forma_pago:null, nota:null },
];
const PLANES = [
  { id:'pa', nombre:'Chef repostero pago único', modalidad:'abonos', precio_mensual:1250, precio_total:30000, meses:24, dia_cobro:'primer_pago', dia_fijo:null, activo:true },
  { id:'pm', nombre:'Hobbie mensual', modalidad:'mensual', precio_mensual:800, precio_total:null, meses:6, dia_cobro:'primer_pago', dia_fijo:null, activo:true },
];

(async () => {
  const equipo = [...EQUIPO_EJEMPLO, { id:'u3', nombre:'Admin Prueba', es_vendedor:true, rol:'Gerente', es_admin:true }];
  const h = await abrirHub({ tablas:{ vista_agl_cobros:[], vista_agl_cuentas:CUENTAS, vista_agl_abonos_por_confirmar:POR_CONF, academia_glam_abonos:ABONOS,
      academia_glam_seguimientos:SEGS, vista_agl_suscripciones:SUSC, academia_glam_mensualidades:MENS, academia_glam_planes:PLANES,
      academia_glam_generaciones:[{ generacion_id:'g26', tipo:'abonos' }] },
    usuario:{ id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }, equipo });
  const { p, check } = h;
  await p.evaluate(() => {
    window.__llamadas = [];
    const original = sb.rpc;
    sb.rpc = (fn, args) => { window.__llamadas.push({ fn, args }); return original(fn, args); };
    window.__rpc.agl_registrar_abono = ({ p_por_confirmar }) => p_por_confirmar ? 'por_confirmar' : 'confirmado';
    window.__rpc.agl_registrar_pago = () => 'pagada';
    window.__rpc.agl_confirmar_abono = ({ p_llego }) => p_llego ? 'confirmado' : 'no_llego';
    window.__rpc.agl_seguimiento = () => 'sid';
    window.__rpc.agl_dar_acceso = () => null;
    window.__rpc.agl_activar_abonos = () => 'nueva';
    window.__rpc.agl_activar = () => 'nueva';
    window.__rpc.agl_guardar_plan = () => 'pid';
    window.__rpc.agl_generaciones = () => [{ generacion_id:'g26', nombre:'Academia 2026', orden:7, alumnas:371, paga_por_mes:true, confirmado:true, columnas:['ANT', 'ANT2'], disponibles:['ANT', 'ANT2'], activadas:0 }];
    window.__rpc.agl_candidatas_v3 = () => [
      { alumna_id:'c1', nombre:'Candidata Abonos', telefono:'5511111111', vendedor_texto:null, vendedor_propuesto:null, pagadas:2, por_revisar:0, proxima_numero:3, ultimo_pago:'ANT2: 05 SEP', decision:null, abonado:4000 },
    ];
  });
  const llamadas = fn => p.evaluate(f => window.__llamadas.filter(l => l.fn === f), fn);
  const abrir = async tab => { await p.evaluate(t => { agl.tab = t; setActiveSection('academia_glam'); renderAcademiaGlam(); }, tab); await p.waitForTimeout(300); };

  h.paso('1. Cobros: promesas de abono por grupo');
  await abrir('cobros');
  const grupos = await p.$$eval('.agl-grupo', g => g.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(grupos.join('|') === 'Atrasadas y promesas vencidas 1|Hoy 1|Por confirmar 1|Esta semana 1|Deben y no tienen fecha prometida 1|Liquidaron: dar acceso 1',
        'vencidas, hoy, por confirmar, semana, sin fecha y dar acceso (' + grupos.join('|') + ')');
  const txt = await p.textContent('#agl-cobros');
  check(!txt.includes('Alumna Lejana'), 'una promesa a más de 7 días no estorba');
  check(txt.includes('Prometió hace 2 días') && txt.includes('Prometió hoy') && txt.includes('Sin fecha prometida'), 'dice cuándo prometió');
  check(txt.includes('Debe $20,000') && txt.includes('de $30,000'), 'muestra lo que debe y el total');
  check(txt.includes('No contestó · hoy'), 'muestra el último seguimiento');
  // El arnés ignora gte/lte: "cobrado este mes" suma el abono de $3,000 y la mensualidad de $800 que pagó la alumna mensual
  const k = await p.$$eval('.agl-kpi', ks => ks.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(k[0].endsWith('1') && k[1].endsWith('1') && k[2].endsWith('1') && k[3].includes('$3,800'), 'indicadores con abonos y lo cobrado del mes (' + k.join(' | ') + ')');
  check(await p.$('#agl-cobros img') === null && await p.evaluate(() => !window.__xss), 'el nombre se escapa');
  await h.captura('academia-glam-abonos-cobros.png');

  h.paso('2. Registrar un abono (con la siguiente fecha prometida)');
  await p.click('[data-agl-abonar="k2"]');
  check(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open')), 'abre el formulario');
  check((await p.textContent('#aglPagoSub')).includes('debe $20,000 de $30,000') && await p.isVisible('#aglPagoPromesa'), 'dice lo que debe y pide la próxima fecha prometida');
  await p.fill('#aglPagoMonto', '25000');
  check((await p.textContent('#aglPagoAviso')).includes('más de lo que debe'), 'avisa si es más de lo que debe');
  await p.click('#aglPagoGuardar');
  check((await llamadas('agl_registrar_abono')).length === 0, 'y no lo manda');
  await p.fill('#aglPagoMonto', '20000');
  check((await p.textContent('#aglPagoAviso')).includes('liquida'), 'avisa que con ese abono liquida');
  await p.fill('#aglPagoMonto', '5000');
  await p.fill('#aglPagoPromesa', mas(-1));
  await p.click('#aglPagoGuardar');
  check((await llamadas('agl_registrar_abono')).length === 0 && (await p.textContent('#toast')).includes('pasado'), 'la próxima fecha no puede ser en el pasado');
  await p.fill('#aglPagoPromesa', mas(15));
  await p.check('#aglPagoPorConfirmar');
  await p.click('#aglPagoGuardar');
  await p.waitForTimeout(300);
  const ab = (await llamadas('agl_registrar_abono'))[0]?.args;
  check(ab && ab.p_suscripcion === 'k2' && ab.p_monto === 5000 && ab.p_por_confirmar === true && ab.p_nueva_promesa === mas(15) && ab.p_fecha === hoy, 'manda el abono con su nueva promesa');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'agl_abono'), 'queda en la bitácora');

  h.paso('3. Abono por confirmar: llegó / no llegó');
  await p.click('[data-agl-ab-llego="b9"]');
  await p.waitForTimeout(300);
  check((await llamadas('agl_confirmar_abono'))[0]?.args.p_llego === true, '"Llegó" confirma');
  await p.click('[data-agl-ab-nollego="b9"]');
  check((await p.textContent('#confirmarAviso')).includes('no llegó'), '"No llegó" pide confirmación y explica que se conserva');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await llamadas('agl_confirmar_abono'))[1]?.args.p_llego === false, 'y lo marca');

  h.paso('4. Seguimiento');
  await p.click('[data-agl-seg="k4"]');
  check(await p.evaluate(() => document.getElementById('modalAglSeg').classList.contains('open')) && (await p.textContent('#aglSegSub')).includes('sin fecha prometida'), 'abre el seguimiento');
  check((await p.$$eval('#aglSegTipo option', o => o.map(x => x.textContent))).length === 5, 'cinco tipos: llamada, WhatsApp, no contestó, prometió fecha y nota');
  await p.selectOption('#aglSegTipo', 'promesa');
  await p.click('#aglSegGuardar');
  check((await llamadas('agl_seguimiento')).length === 0 && (await p.textContent('#toast')).includes('fecha que prometió'), '"Prometió fecha" exige la fecha');
  await p.fill('#aglSegFecha', mas(3));
  await p.fill('#aglSegNota', 'Dice que el viernes');
  await p.click('#aglSegGuardar');
  await p.waitForTimeout(300);
  const sg = (await llamadas('agl_seguimiento'))[0]?.args;
  check(sg && sg.p_suscripcion === 'k4' && sg.p_tipo === 'promesa' && sg.p_fecha_promesa === mas(3) && sg.p_nota === 'Dice que el viernes', 'guarda el seguimiento con la nueva fecha');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'agl_seguimiento'), 'queda en la bitácora');

  h.paso('5. Dar acceso al liquidar');
  await p.click('[data-agl-acceso="k5"]');
  check((await p.textContent('#confirmarTitulo')).includes('acceso'), 'pide confirmar que ya se dio acceso');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await llamadas('agl_dar_acceso'))[0]?.args.p_suscripcion === 'k5', 'lo registra');
  check(await p.$('[data-agl-abonar="k5"]') === null, 'a quien ya liquidó no se le ofrece registrar abono');

  h.paso('6. Ficha de la alumna (abonos)');
  await p.click('[data-agl-ficha="k1"]');
  await p.waitForTimeout(300);
  const ficha = (await p.textContent('#aglFichaCuerpo')).replace(/\s+/g, ' ');
  check(await p.evaluate(() => document.getElementById('modalAglFicha').classList.contains('open')), 'abre la ficha');
  check(ficha.includes('$30,000') && ficha.includes('$10,000') && ficha.includes('$20,000'), 'total, abonado y lo que debe');
  check(ficha.includes('del Excel') && ficha.includes('no llegó') && ficha.includes('lo registró Admin Prueba'), 'abonos con el del Excel y el que no llegó');
  check(ficha.includes('No contestó') && ficha.includes('Recepción Prueba') && ficha.includes('<b>Le marqué</b>'), 'seguimiento con quién lo hizo y la nota escapada');
  check(await p.$('#aglFichaCuerpo b b') === null, 'nada se interpreta como HTML');
  await h.captura('academia-glam-ficha.png');
  await p.click('#aglFichaCuerpo [data-agl-abonar="k1"]');
  check(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open')), 'desde la ficha se registra un abono');
  await p.fill('#aglPagoMonto', '1000');
  await p.click('#aglPagoGuardar');
  await p.waitForTimeout(400);
  check((await llamadas('agl_registrar_abono')).some(l => l.args.p_suscripcion === 'k1' && l.args.p_monto === 1000), 'y se guarda');
  check(await p.evaluate(() => document.getElementById('modalAglFicha').classList.contains('open')), 'la ficha sigue abierta, al día');
  await p.click('#closeAglFicha');

  h.paso('7. Ficha de una alumna mensual');
  await abrir('alumnas');
  const filaK1 = (await p.textContent('[data-agl-susc="k1"]')).replace(/\s+/g, ' ');
  check(filaK1.includes('Liquidar con abonos') && filaK1.includes('$10,000 de $30,000') && filaK1.includes('Debe $20,000') && filaK1.includes('Prometió hace 2 días'), 'en Alumnas: avance en pesos y la promesa');
  check((await p.textContent('[data-agl-susc="k5"]')).includes('Liquidó'), 'la que liquidó dice "Liquidó"');
  await p.click('[data-agl-ficha="m1"]');
  await p.waitForTimeout(300);
  const fm = (await p.textContent('#aglFichaCuerpo')).replace(/\s+/g, ' ');
  check(fm.includes('2 de 6 mensualidades pagadas') && fm.includes('pagada antes del Hub') && fm.includes('Mensualidad 3'), 'mensualidades, incluida la previa');
  await p.click('#aglFichaCuerpo [data-agl-wa-cuenta="m1"]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('modalWhats').classList.contains('open')), 'el WhatsApp de una alumna mensual funciona');
  await p.evaluate(() => { document.getElementById('modalWhats').classList.remove('open'); document.getElementById('modalAglFicha').classList.remove('open'); });

  h.paso('8. Activar una candidata con plan de abonos');
  const datos = () => p.textContent('[data-agl-cand="0"]');
  await p.selectOption('[data-agl-cand="0"] [data-agl-c="plan"]', 'pa');
  check(await p.inputValue('[data-agl-cand="0"] [data-agl-c="total"]') === '30000' && await p.inputValue('[data-agl-cand="0"] [data-agl-c="previo"]') === '4000', 'pide total (el del plan) y lo ya abonado (del Excel)');
  check((await datos()).includes('$4,000') && (await datos()).includes('2 abonos'), 'en una generación de abonos "Lleva" es en pesos');
  await p.check('[data-agl-cand="0"] [data-agl-sel]');
  await p.fill('[data-agl-cand="0"] [data-agl-c="previo"]', '40000');
  await p.press('[data-agl-cand="0"] [data-agl-c="previo"]', 'Tab');
  await p.click('#aglActivar');
  check((await p.textContent('#aglActivarAviso')).includes('debe ir de $0') && (await llamadas('agl_activar_abonos')).length === 0, 'lo ya abonado no puede ser más que el total');
  await p.fill('[data-agl-cand="0"] [data-agl-c="previo"]', '4000');
  await p.fill('[data-agl-cand="0"] [data-agl-c="fecha"]', mas(6));
  await p.press('[data-agl-cand="0"] [data-agl-c="fecha"]', 'Tab');
  await p.click('#aglActivar');
  await p.waitForTimeout(400);
  const aa = (await llamadas('agl_activar_abonos'))[0]?.args;
  check(aa && aa.p_alumna === 'c1' && aa.p_plan === 'pa' && aa.p_total === 30000 && aa.p_abonado_previo === 4000 && aa.p_fecha_promesa === mas(6), 'activa con total, lo ya abonado y la promesa');
  check((await llamadas('agl_activar')).length === 0, 'no usa la activación mensual');

  h.paso('9. Plan de abonos en Planes');
  await abrir('planes');
  const filasP = await p.$$eval('#agl-planes tbody tr', f => f.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(filasP[0].includes('Liquidar con abonos') && filasP[0].includes('$30,000 total') && filasP[1].includes('$800 al mes'), 'la tabla distingue modalidad y precio');
  await p.selectOption('#aglPlanModalidad', 'abonos');
  check(await p.$('#aglPlanTotal') !== null && await p.$('#aglPlanPrecio') === null && await p.$('#aglPlanDiaTipo') === null, 'en abonos pide el total, no el precio al mes ni el día');
  await p.fill('#aglPlanNombre', 'Hobbie pago único'); await p.fill('#aglPlanMeses', '6');
  await p.click('#aglPlanGuardar');
  check((await llamadas('agl_guardar_plan')).length === 0 && (await p.textContent('#toast')).includes('precio total'), 'exige el total');
  await p.fill('#aglPlanTotal', '4500');
  await p.click('#aglPlanGuardar');
  await p.waitForTimeout(300);
  const gp = (await llamadas('agl_guardar_plan'))[0]?.args;
  check(gp && gp.p_modalidad === 'abonos' && gp.p_precio_total === 4500 && gp.p_precio === null && gp.p_meses === 6, 'crea el plan de abonos');

  h.paso('10. Permisos en pantalla');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, es_admin:false, rol:'Cobranza' }; PERMISOS_ACCION_CACHE = { Cobranza:new Set(['ver_todo_academia_glam']) }; });
  await abrir('cobros');
  check(await p.$('#agl-cobros [data-agl-abonar]') === null && await p.$('#agl-cobros [data-agl-ab-llego]') === null, 'Cobranza sin "Cobrar en Academia": no registra ni confirma abonos');
  check(await p.$('[data-agl-seg="k1"]') !== null && await p.$('[data-agl-acceso="k5"]') !== null, 'pero sí da seguimiento y acceso');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, id:'u2', rol:'Ventas', es_admin:false }; PERMISOS_ACCION_CACHE = {}; });
  await abrir('cobros');
  check(await p.$('#agl-cobros [data-agl-seg="k1"]') !== null && await p.$('#agl-cobros [data-agl-acceso]') === null, 'la vendedora da seguimiento a las suyas, sin dar acceso');

  h.paso('11. Celular');
  await p.evaluate(() => { usuarioActual = { id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }; });
  await p.setViewportSize({ width:390, height:800 });
  await abrir('cobros');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'Cobros sin scroll de lado');
  await h.captura('academia-glam-abonos-celular.png');
  await p.click('[data-agl-ficha="k1"]');
  await p.waitForTimeout(300);
  await h.captura('academia-glam-ficha-celular.png');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'la ficha cabe en el celular');

  await h.terminar();
})();
