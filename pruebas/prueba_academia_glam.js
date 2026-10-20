/* Academia Glam (fase 1): Cobros, Alumnas (con candidatas por activar) y Planes.
   Las funciones de la base (agl_*) se simulan con window.__rpc; las vistas se pasan como tablas ya planas.
   Lo que la base revisa de verdad (permisos, RLS, fechas) se probó aparte contra Supabase (ver la doc). */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const hoy = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(hoy + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const inicioMes = hoy.slice(0, 8) + '01';
const mesAnterior = (() => { const d = new Date(hoy + 'T12:00:00'); d.setMonth(d.getMonth() - 1, 15); return d.toLocaleDateString('en-CA'); })();

const base = { suscripcion_id:'s', meses:12, forma_pago:null, monto_pagado:null, pagado_en:null, alumna_telefono:'5512345678' };
const COBROS = [
  { ...base, mensualidad_id:'m1', numero:4, vence:mas(-3), monto:1200, estado:'pendiente', vendedor_id:'u2', alumna_id:'a1', alumna_nombre:'ALUMNA PRUEBA ATRASADA', plan_nombre:'Academia' },
  { ...base, mensualidad_id:'m2', numero:2, vence:hoy, monto:800, estado:'pendiente', vendedor_id:'u1', alumna_id:'a2', alumna_nombre:'alumna prueba de hoy', plan_nombre:'Hobbie', meses:6 },
  { ...base, mensualidad_id:'m3', numero:5, vence:mas(-1), monto:1200, estado:'por_confirmar', vendedor_id:'u2', alumna_id:'a3', alumna_nombre:'Alumna Por Confirmar', plan_nombre:'Academia', monto_pagado:1200, forma_pago:'Transferencia', pagado_en:hoy },
  { ...base, mensualidad_id:'m4', numero:7, vence:mas(3), monto:1200, estado:'pendiente', vendedor_id:null, alumna_id:'a4', alumna_nombre:'<img src=x onerror="window.__xss=1"> Alumna', plan_nombre:'Academia' },
  { ...base, mensualidad_id:'m5', numero:3, vence:mas(20), monto:1200, estado:'pendiente', vendedor_id:'u2', alumna_id:'a5', alumna_nombre:'Alumna Lejana', plan_nombre:'Academia' },
];
const COBRADO = [
  { monto_pagado:1200, pagado_en:inicioMes }, { monto_pagado:800, pagado_en:hoy }, { monto_pagado:5000, pagado_en:mesAnterior },
].map(x => ({ estado:'pagada', previa:false, ...x }));
const susc = (id, nombre, extra) => ({ id, alumna_id:'a' + id, plan_id:'p1', vendedor_id:'u2', estado:'activa', notas:null, creado_en:hoy, alumna_nombre:nombre,
  alumna_telefono:'5512345678', plan_nombre:'Academia', meses:12, precio_mensual:1200, pagadas:3, por_confirmar:0, atrasadas:0, proxima_numero:4, proxima_vence:mas(5), ...extra });
const SUSC = [
  susc('s1', 'ALUMNA UNO', { atrasadas:2, vendedor_id:'u2', pendiente_id:'mp0', pendiente_numero:4, pendiente_vence:mas(5), pendiente_monto:1200 }), susc('s2', 'Alumna Dos', { vendedor_id:null, plan_nombre:'Hobbie', precio_mensual:800, meses:6, pendiente_id:'mp1', pendiente_numero:4, pendiente_vence:mas(40), pendiente_monto:800 }),
  susc('s3', 'Alumna Tres', { estado:'pausada' }), susc('s4', '<b>Alumna</b> Cuatro', { estado:'baja', proxima_numero:null, proxima_vence:null }),
];
const PLANES = [
  { id:'p1', nombre:'Academia', modalidad:'mensual', precio_mensual:1200, precio_total:null, meses:12, dia_cobro:'primer_pago', dia_fijo:null, activo:true },
  { id:'p2', nombre:'Hobbie', modalidad:'mensual', precio_mensual:800, precio_total:null, meses:6, dia_cobro:'fijo', dia_fijo:5, activo:true },
  { id:'p3', nombre:'Plan viejo', modalidad:'mensual', precio_mensual:500, precio_total:null, meses:3, dia_cobro:'primer_pago', dia_fijo:null, activo:false },
];

(async () => {
  const equipo = [...EQUIPO_EJEMPLO, { id:'u3', nombre:'Admin Prueba', es_vendedor:true, rol:'Gerente', es_admin:true }];
  const h = await abrirHub({ tablas:{ vista_agl_cobros:COBROS, academia_glam_mensualidades:COBRADO, vista_agl_suscripciones:SUSC, academia_glam_planes:PLANES,
      academia_glam_generaciones:[{ generacion_id:'g1', tipo:'mensualidades' }, { generacion_id:'g25', tipo:'mensualidades' }, { generacion_id:'g26', tipo:'abonos' }] },
    usuario:{ id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }, equipo });
  const { p, check } = h;
  // Funciones de la base simuladas: guardan sus llamadas y pueden fallar a pedido.
  await p.evaluate(() => {
    window.__llamadas = []; window.__rpcError = {};
    const original = sb.rpc;
    sb.rpc = (fn, args) => {
      if(window.__rpcError[fn]) { window.__llamadas.push({ fn, args }); return Promise.resolve({ data:null, error:{ message:window.__rpcError[fn] } }); }
      window.__llamadas.push({ fn, args });
      return original(fn, args);
    };
    // Generaciones: Academia 2026 de pago mensual SIN confirmar, Academia 2025 confirmada y una vieja que no paga por mes.
    window.__gens = [
      { generacion_id:'g1', nombre:'1ª generación', orden:1, alumnas:116, paga_por_mes:false, confirmado:false, columnas:[], disponibles:['SEPTIEMBRE', 'OCTUBRE'], activadas:0 },
      { generacion_id:'g25', nombre:'Academia 2025', orden:6, alumnas:502, paga_por_mes:true, confirmado:true, columnas:['ANT', 'ANT2'], disponibles:['ANT', 'ANT2'], activadas:3 },
      { generacion_id:'g26', nombre:'Academia 2026', orden:7, alumnas:371, paga_por_mes:true, confirmado:false, columnas:['ANT', 'ANT2', 'ANT3'], disponibles:['ANT', 'ANT2', 'ANT3', 'INSCRIPCION'], activadas:0 },
    ];
    window.__rpc.agl_generaciones = () => JSON.parse(JSON.stringify(window.__gens));
    window.__rpc.agl_config_generacion = ({ p_generacion, p_paga_por_mes, p_columnas, p_confirmado, p_tipo }) => {
      Object.assign(window.__gens.find(g => g.generacion_id === p_generacion), { paga_por_mes:p_paga_por_mes, columnas:p_columnas, confirmado:p_confirmado });
      window.__tablas.academia_glam_generaciones.find(g => g.generacion_id === p_generacion).tipo = p_tipo;
      return null;
    };
    window.__rpc.agl_candidatas_v3 = ({ p_generacion }) => p_generacion === 'g26' ? [
      { alumna_id:'n1', nombre:'Nueva Uno', telefono:'5522222222', vendedor_texto:null, vendedor_propuesto:null, pagadas:2, por_revisar:1, proxima_numero:3, ultimo_pago:'ANT2: WPP HOY 26 SEP', decision:'por_contactar', abonado:3500 },
    ] : p_generacion === 'g25' ? [
      { alumna_id:'c1', nombre:'CANDIDATA UNO', telefono:'5511111111', vendedor_texto:'JARED WPP', vendedor_propuesto:'u3', pagadas:3, por_revisar:0, proxima_numero:4, ultimo_pago:'ANT2: 02 ABRIL HEY BANCO', decision:null },
      { alumna_id:'c2', nombre:'Candidata <b>Dos</b>', telefono:null, vendedor_texto:null, vendedor_propuesto:null, pagadas:0, por_revisar:0, proxima_numero:1, ultimo_pago:null, decision:null },
    ] : [];
    window.__rpc.agl_activar = () => 'nueva';
    const suscDe = id => window.__tablas.vista_agl_suscripciones.find(x => x.id === id);
    window.__rpc.agl_asignar_vendedor = ({ p_suscripcion, p_vendedor }) => { suscDe(p_suscripcion).vendedor_id = p_vendedor; return null; };
    window.__rpc.agl_cambiar_estado = ({ p_suscripcion, p_estado }) => { suscDe(p_suscripcion).estado = p_estado; return null; };
    window.__rpc.agl_guardar_plan = () => 'pid';
    window.__rpc.agl_registrar_pago = ({ p_mensualidad, p_por_confirmar }) => {
      const r = window.__tablas.vista_agl_cobros.find(x => x.mensualidad_id === p_mensualidad);
      if(r && p_por_confirmar) Object.assign(r, { estado:'por_confirmar' }); else if(r) window.__tablas.vista_agl_cobros = window.__tablas.vista_agl_cobros.filter(x => x !== r);
      return p_por_confirmar ? 'por_confirmar' : 'pagada';
    };
    window.__rpc.agl_confirmar_pago = ({ p_mensualidad, p_llego }) => {
      const r = window.__tablas.vista_agl_cobros.find(x => x.mensualidad_id === p_mensualidad);
      if(p_llego) window.__tablas.vista_agl_cobros = window.__tablas.vista_agl_cobros.filter(x => x !== r); else r.estado = 'pendiente';
      return p_llego ? 'pagada' : 'pendiente';
    };
  });
  const llamadas = fn => p.evaluate(f => window.__llamadas.filter(l => !f || l.fn === f), fn);
  const abrir = async tab => { await p.evaluate(t => { agl.tab = t; setActiveSection('academia_glam'); renderAcademiaGlam(); }, tab); await p.waitForTimeout(250); };

  h.paso('1. La sección existe, se reparte por rol y trae las pestañas');
  const secs = await p.evaluate(() => ({
    admin: seccionesPermitidas().includes('academia_glam'),
    ventas: (() => { const u = usuarioActual; usuarioActual = { ...u, rol:'Ventas', es_admin:false }; const r = seccionesPermitidas().includes('academia_glam'); usuarioActual = u; return r; })(),
    logistica: (() => { const u = usuarioActual; usuarioActual = { ...u, rol:'Logística', es_admin:false }; const r = seccionesPermitidas().includes('academia_glam'); usuarioActual = u; return r; })(),
    asignable: SECCIONES_ASIGNABLES_POR_ROL.some(s => s.id === 'academia_glam'),
    accion: ACCIONES_POR_ROL.some(a => a.id === 'ver_todo_academia_glam'),
  }));
  check(secs.admin && secs.ventas && !secs.logistica, 'la ven administradores y Ventas; Logística no');
  check(secs.asignable && secs.accion, 'se puede dar o quitar por rol y la acción "Ver todo" es reasignable');
  await abrir('cobros');
  check((await p.textContent('#view-academia_glam .ac-tabs')).includes('Cupones') && await p.$$eval('#view-academia_glam .ac-tab[disabled]', b => b.length) === 2, 'Cupones y Comisiones salen como "pronto"');

  h.paso('2. Cobros: indicadores y grupos');
  const k = await p.$$eval('.agl-kpi', ks => ks.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(k[0].endsWith('1') && k[1].endsWith('1') && k[2].endsWith('1'), 'hoy 1, esta semana 1, atrasadas 1 (' + k.join(' | ') + ')');
  check(k[3].includes('$2,000'), 'cobrado del mes suma solo este mes, sin el mes pasado (' + k[3] + ')');
  const grupos = await p.$$eval('.agl-grupo', g => g.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(grupos.length === 4 && grupos[0].startsWith('⚠️ Atrasadas') && grupos[1].startsWith('⏰ Hoy') && grupos[2].startsWith('🏦') && grupos[3].startsWith('📅'), 'atrasadas, hoy, por confirmar, esta semana (' + grupos.join(' | ') + ')');
  check(!(await p.textContent('#agl-cobros')).includes('Alumna Lejana'), 'lo que vence en más de 7 días no aparece');
  check((await p.textContent('#agl-cobros')).includes('3 días de atraso'), 'dice cuántos días de atraso');
  check(await p.$('#agl-cobros img') === null && await p.evaluate(() => !window.__xss), 'el nombre se escapa');
  check((await p.textContent('#agl-cobros')).includes('Alumna Prueba Atrasada'), 'los nombres salen con mayúscula inicial');
  await h.captura('academia-glam-cobros.png');

  h.paso('3. Filtros');
  await p.selectOption('#aglFiltroVend', 'u2');
  check(await p.$$eval('.agl-fila', f => f.length) === 2, 'por vendedora: solo las de ella');
  await p.selectOption('#aglFiltroVend', '_sin');
  check(await p.$$eval('.agl-fila', f => f.length) === 1, '"Sin vendedora" encuentra las que no tienen');
  await p.selectOption('#aglFiltroVend', '');
  await p.selectOption('#aglFiltroPlan', 'Hobbie');
  check(await p.$$eval('.agl-fila', f => f.length) === 1, 'por plan');
  await p.selectOption('#aglFiltroPlan', '');

  h.paso('4. Registrar un pago');
  await p.evaluate(() => { PERMISOS_ACCION_CACHE = { Gerente:new Set(['cobrar_academia']) }; });
  await p.evaluate(() => aglPintarCobros());
  check(await p.$$eval('[data-agl-pagar]', b => b.length) === 3, 'botón "Registrar pago" en las pendientes');
  check(await p.$$eval('[data-agl-llego]', b => b.length) === 1, 'y "✓ Llegó / ✗ No llegó" en la por confirmar');
  await p.click('[data-agl-pagar="m2"]');
  check(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open')), 'abre el formulario');
  check(await p.inputValue('#aglPagoMonto') === '800' && await p.inputValue('#aglPagoFecha') === hoy, 'con el monto del plan y la fecha de hoy');
  check((await p.textContent('#aglPagoSub')).includes('Mensualidad 2 de 6'), 'dice qué mensualidad es');
  await p.fill('#aglPagoMonto', '500');
  check((await p.textContent('#aglPagoAviso')).includes('menos de $800'), 'avisa si el monto es menor');
  await p.fill('#aglPagoMonto', '');
  await p.click('#aglPagoGuardar');
  check((await llamadas('agl_registrar_pago')).length === 0, 'sin monto no manda nada');
  await p.fill('#aglPagoMonto', '800');
  await p.selectOption('#aglPagoForma', 'Efectivo');
  await p.click('#aglPagoGuardar');
  await p.waitForTimeout(300);
  const pago = (await llamadas('agl_registrar_pago'))[0]?.args;
  check(pago && pago.p_mensualidad === 'm2' && pago.p_monto === 800 && pago.p_forma === 'Efectivo' && pago.p_fecha === hoy && pago.p_por_confirmar === false, 'manda el pago a la base');
  check(!(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open'))), 'cierra el formulario');
  check(!(await p.textContent('#agl-cobros')).includes('alumna prueba de hoy') && !(await p.textContent('#agl-cobros')).includes('Alumna Prueba De Hoy'), 'ya no aparece como pendiente');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'agl_pago'), 'queda en la bitácora');

  h.paso('5. Pago "por confirmar" y confirmarlo');
  await p.click('[data-agl-pagar="m4"]');
  await p.check('#aglPagoPorConfirmar');
  await p.click('#aglPagoGuardar');
  await p.waitForTimeout(300);
  check((await llamadas('agl_registrar_pago'))[1]?.args.p_por_confirmar === true, 'lo manda como por confirmar');
  check(await p.$$eval('[data-agl-llego]', b => b.length) === 2, 'ahora hay dos por confirmar');
  await p.click('[data-agl-llego="m3"]');
  await p.waitForTimeout(300);
  check((await llamadas('agl_confirmar_pago'))[0]?.args.p_llego === true, '"Llegó" confirma');
  await p.click('[data-agl-nollego="m4"]');
  check(await p.evaluate(() => document.getElementById('modalConfirmar').classList.contains('open')), '"No llegó" pide confirmación');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  const nl = (await llamadas('agl_confirmar_pago'))[1]?.args;
  check(nl && nl.p_mensualidad === 'm4' && nl.p_llego === false, 'y avisa que no llegó');
  check(await p.$$eval('[data-agl-pagar="m4"]', b => b.length) === 1, 'vuelve a pendiente');

  h.paso('6. Un error de la base se muestra y no rompe nada');
  await p.evaluate(() => { window.__rpcError.agl_registrar_pago = 'Para registrar pagos hace falta el permiso “Cobrar en Academia”'; });
  await p.click('[data-agl-pagar="m4"]');
  await p.click('#aglPagoGuardar');
  await p.waitForTimeout(300);
  check((await p.textContent('#toast')).includes('Cobrar en Academia'), 'muestra el motivo');
  check(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open')), 'el formulario sigue abierto para reintentar');
  await p.evaluate(() => { window.__rpcError = {}; document.getElementById('modalAglPago').classList.remove('open'); });

  h.paso('7. Sin permiso de cobrar: ve y manda WhatsApp, pero no registra pagos');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, rol:'Cobranza', es_admin:false }; PERMISOS_ACCION_CACHE = { Cobranza:new Set(['ver_todo_academia_glam']) }; aglPintarCobros(); });
  check(await p.$$eval('[data-agl-pagar], [data-agl-llego]', b => b.length) === 0, 'sin botones de cobrar');
  check(await p.$$eval('[data-agl-wa]', b => b.length) >= 2, 'con botón de WhatsApp');
  check(await p.$('#aglFiltroVend') !== null, 'Cobranza ve el filtro de vendedoras (ve a todas)');
  await p.click('[data-agl-wa]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('modalWhats').classList.contains('open')), 'abre el WhatsApp con los datos de la alumna');
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));

  h.paso('8. Una vendedora sin "ver todo": sin filtro de vendedoras ni candidatas');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, id:'u2', rol:'Ventas', es_admin:false }; PERMISOS_ACCION_CACHE = {}; aglPintarCobros(); });
  check(await p.$('#aglFiltroVend') === null, 'no ve el filtro de vendedoras');
  await abrir('alumnas');
  check(await p.$('#aglCandidatas') !== null && !(await p.textContent('#aglCandidatas')).trim(), 'no ve las candidatas');
  check(await p.$('[data-agl-vend]') === null && await p.$('[data-agl-estado]') === null, 'no puede cambiar vendedora ni estado');
  await abrir('planes');
  check(await p.$('#aglPlanGuardar') === null && await p.$('[data-agl-editar-plan]') === null, 'los planes solo se leen');
  check(!(await p.textContent('#agl-planes')).includes('Generaciones que pagan por mes'), 'no ve la configuración de generaciones');
  check((await llamadas('agl_generaciones')).length === 0, 'ni la pide a la base');

  h.paso('9. Alumnas: lista, filtros, vendedora y estado');
  await p.evaluate(() => { usuarioActual = { id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }; PERMISOS_ACCION_CACHE = {}; });
  await abrir('alumnas');
  check(await p.$$eval('[data-agl-susc]', f => f.length) === 2, 'por defecto solo las activas (2 de 4)');
  check((await p.textContent('#agl-alumnas')).includes('2 atrasadas'), 'marca las atrasadas');
  const chips = await p.$$eval('[data-agl-estado-f]', c => c.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(chips.join('|') === 'Activas 2|Pausadas 1|Bajas 1|Todas 4', 'contadores por estado (' + chips.join('|') + ')');
  await p.click('[data-agl-estado-f="todas"]');
  check(await p.$$eval('[data-agl-susc]', f => f.length) === 4, '"Todas" muestra las 4');
  check(await p.$('#agl-alumnas tbody b b') === null && (await p.textContent('#agl-alumnas')).toLowerCase().includes('<b>alumna</b> cuatro'), 'los nombres se escapan');
  await p.fill('#aglBuscar', 'tres');
  check(await p.$$eval('[data-agl-susc]', f => f.length) === 1, 'busca por nombre');
  await p.fill('#aglBuscar', '');
  await p.selectOption('[data-agl-susc="s2"] [data-agl-vend]', 'u1');
  await p.waitForTimeout(200);
  const asig = (await llamadas('agl_asignar_vendedor'))[0]?.args;
  check(asig && asig.p_suscripcion === 's2' && asig.p_vendedor === 'u1', 'cambiar la vendedora llama a la base');
  await p.selectOption('[data-agl-susc="s1"] [data-agl-estado]', 'pausada');
  await p.waitForTimeout(200);
  const est = (await llamadas('agl_cambiar_estado'))[0]?.args;
  check(est && est.p_suscripcion === 's1' && est.p_estado === 'pausada', 'cambiar el estado llama a la base');
  await p.evaluate(() => { window.__rpcError.agl_asignar_vendedor = 'No tienes permiso'; });
  await p.selectOption('[data-agl-susc="s2"] [data-agl-vend]', 'u3');
  await p.waitForTimeout(200);
  check(await p.inputValue('[data-agl-susc="s2"] [data-agl-vend]') === 'u1', 'si la base lo rechaza, el selector vuelve a como estaba');
  await p.evaluate(() => { window.__rpcError = {}; });
  await p.click('[data-agl-pagar-susc="s2"]');
  check(await p.evaluate(() => document.getElementById('modalAglPago').classList.contains('open')) && (await p.textContent('#aglPagoSub')).includes('Mensualidad 4 de 6') && await p.inputValue('#aglPagoMonto') === '800', 'pago adelantado desde la lista: abre la mensualidad pendiente');
  await p.click('#aglPagoGuardar');
  await p.waitForTimeout(300);
  check((await llamadas('agl_registrar_pago')).some(l => l.args.p_mensualidad === 'mp1'), 'y la registra');
  check(await p.$('[data-agl-pagar-susc="s1"]') === null && await p.$('[data-agl-pagar-susc="s3"]') === null, 'las pausadas no ofrecen registrar pago');

  h.paso('10. Candidatas por generación (configurable): sin confirmar no se activa');
  const gensOpt = await p.$$eval('#aglGen option', o => o.map(x => x.textContent));
  check(gensOpt.join('|') === 'Academia 2025|Academia 2026 (sin confirmar)', 'solo generaciones de pago mensual, marcando las sin confirmar (' + gensOpt.join('|') + ')');
  check(await p.inputValue('#aglGen') === 'g26', 'por defecto Academia 2026');
  check((await p.textContent('#aglCandidatas')).includes('Falta confirmar cómo paga') && (await p.textContent('#aglCandidatas')).includes('ANT, ANT2, ANT3'), 'avisa que falta confirmar y qué columnas cuenta');
  check(await p.isDisabled('#aglActivar'), 'sin confirmar no deja activar');
  const fila1 = (await p.textContent('[data-agl-cand="0"]')).replace(/\s+/g, ' ');
  check(fila1.includes('$3,500') && fila1.includes('2 abonos') && fila1.includes('+1 por revisar') && fila1.includes('Último: ANT2: WPP HOY 26 SEP') && fila1.includes('Por contactar'), 'generación de abonos: muestra lo abonado, lo por revisar, el último pago y la decisión (' + fila1 + ')');
  check((await p.textContent('#aglCandidatas')).includes('se leen como abonos'), 'el aviso dice cómo se leen sus columnas');
  await p.selectOption('#aglGen', 'g25');
  await p.waitForTimeout(250);
  check(!(await p.textContent('#aglCandidatas')).includes('Falta confirmar') && !(await p.isDisabled('#aglActivar')), 'una generación confirmada sí se puede activar');
  const filasC = await p.$$eval('[data-agl-cand]', f => f.length);
  check(filasC === 2 && (await p.textContent('#aglCandidatas')).includes('Excel: JARED WPP'), 'lista las candidatas con lo que dice el Excel');
  check(await p.inputValue('[data-agl-cand="0"] [data-agl-c="vend"]') === 'u3' && await p.inputValue('[data-agl-cand="1"] [data-agl-c="vend"]') === '', 'propone vendedora solo donde el Excel la nombra');
  check((await p.textContent('[data-agl-cand="0"]')).includes('Elige el plan'), 'sin plan, pide elegirlo antes de los datos para activar');
  await p.selectOption('[data-agl-cand="0"] [data-agl-c="plan"]', 'p1');
  await p.selectOption('[data-agl-cand="1"] [data-agl-c="plan"]', 'p1');
  check(await p.inputValue('[data-agl-cand="0"] [data-agl-c="numero"]') === '4' && await p.inputValue('[data-agl-cand="1"] [data-agl-c="numero"]') === '1', 'con plan mensual: la próxima mensualidad = las que lleva + 1');
  check(await p.$('#aglCandidatas b b') === null, 'se escapa el nombre');
  await p.click('#aglActivar');
  check((await p.textContent('#aglActivarAviso')).includes('Marca al menos una'), 'sin marcar nada avisa');
  await p.check('[data-agl-cand="0"] [data-agl-sel]'); await p.check('[data-agl-cand="1"] [data-agl-sel]');
  check(await p.isChecked('#aglSelTodas'), 'si están todas marcadas, la casilla de arriba se marca');
  await p.click('#aglActivar');
  check((await p.textContent('#aglActivarAviso')).includes('le falta') && (await llamadas('agl_activar')).length === 0, 'si falta la fecha no manda nada');
  await p.selectOption('#aglPlanTodas', 'p1');
  await p.fill('#aglFechaTodas', mas(10));
  await p.click('#aglAplicarTodas');
  check(await p.inputValue('[data-agl-cand="1"] [data-agl-c="fecha"]') === mas(10) && await p.inputValue('[data-agl-cand="0"] [data-agl-c="plan"]') === 'p1', '"Aplicar a la lista" llena plan y fecha');
  check(await p.isChecked('[data-agl-cand="0"] [data-agl-sel]') && await p.isChecked('#aglSelTodas'), 'las marcadas (y "todas") siguen marcadas');
  check(!(await p.$$eval('#aglCandidatas select[data-agl-c="plan"] option', o => o.map(x => x.textContent))).includes('Plan viejo'), 'los planes desactivados no se ofrecen');
  await p.click('#aglActivar');
  await p.waitForTimeout(500);
  const act = await llamadas('agl_activar');
  check(act.length === 2 && act[0].args.p_alumna === 'c1' && act[0].args.p_plan === 'p1' && act[0].args.p_vendedor === 'u3' && act[0].args.p_proxima_numero === 4 && act[0].args.p_proxima_fecha === mas(10), 'activa a la primera con sus datos');
  check(act[1].args.p_alumna === 'c2' && act[1].args.p_vendedor === null && act[1].args.p_proxima_numero === 1, 'y a la segunda sin vendedora');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'agl_activar'), 'queda en la bitácora');
  await h.captura('academia-glam-alumnas.png');

  h.paso('11. Planes (administrador)');
  await abrir('planes');
  const filasP = await p.$$eval('#agl-planes tbody tr', f => f.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(filasP.length === 3 && filasP[1].includes('Día fijo: 5') && filasP[0].includes('El día de su primer pago') && filasP[2].includes('Desactivado'), 'lista los planes con su día de cobro y estado');
  await p.click('#aglPlanGuardar');
  check((await llamadas('agl_guardar_plan')).length === 0 && (await p.textContent('#toast')).includes('Ponle nombre'), 'valida el nombre');
  await p.fill('#aglPlanNombre', 'Estrella'); await p.fill('#aglPlanPrecio', '1500'); await p.fill('#aglPlanMeses', '10');
  await p.selectOption('#aglPlanDiaTipo', 'fijo');
  await p.click('#aglPlanGuardar');
  check((await llamadas('agl_guardar_plan')).length === 0 && (await p.textContent('#toast')).includes('día fijo'), 'en día fijo exige el día');
  await p.fill('#aglPlanDiaFijo', '10');
  await p.click('#aglPlanGuardar');
  await p.waitForTimeout(300);
  const gp = (await llamadas('agl_guardar_plan'))[0]?.args;
  check(gp && gp.p_id === null && gp.p_nombre === 'Estrella' && gp.p_modalidad === 'mensual' && gp.p_precio === 1500 && gp.p_meses === 10 && gp.p_dia_cobro === 'fijo' && gp.p_dia_fijo === 10 && gp.p_activo === true && gp.p_precio_total === null, 'crea el plan mensual');
  await p.click('[data-agl-editar-plan="p2"]');
  check(await p.inputValue('#aglPlanNombre') === 'Hobbie' && await p.inputValue('#aglPlanDiaFijo') === '5', 'editar carga el plan');
  await p.uncheck('#aglPlanActivo');
  await p.click('#aglPlanGuardar');
  await p.waitForTimeout(300);
  const ge = (await llamadas('agl_guardar_plan'))[1]?.args;
  check(ge && ge.p_id === 'p2' && ge.p_activo === false, 'edita y desactiva (no se borra)');

  h.paso('11b. Generaciones: se corrige con casillas');
  check((await p.textContent('#agl-planes')).includes('Generaciones que pagan por mes'), 'aparece la configuración');
  check(await p.$('[data-agl-gen="g1"] [data-agl-gcol]') === null && !(await p.isChecked('[data-agl-gen="g1"] [data-agl-gpaga]')), 'la generación vieja no paga por mes y no muestra columnas');
  check((await p.textContent('[data-agl-gen="g26"]')).includes('Sin confirmar') && (await p.textContent('[data-agl-gen="g25"]')).includes('Confirmada'), 'dice cuáles están confirmadas');
  await p.uncheck('[data-agl-gen="g26"] [data-agl-gcol="ANT"]');
  await p.check('[data-agl-gen="g26"] [data-agl-gconf]');
  await p.click('[data-agl-gen="g26"] [data-agl-gguardar]');
  await p.waitForTimeout(300);
  const cg = (await llamadas('agl_config_generacion'))[0]?.args;
  check(cg && cg.p_generacion === 'g26' && cg.p_paga_por_mes === true && JSON.stringify(cg.p_columnas) === '["ANT2","ANT3"]' && cg.p_confirmado === true && cg.p_tipo === 'abonos', 'guarda columnas (en el orden del Excel), tipo abonos y confirmada');
  check((await p.textContent('[data-agl-gen="g26"]')).includes('Confirmada'), 'se vuelve a cargar ya confirmada');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'agl_generacion'), 'queda en la bitácora');
  await p.check('[data-agl-gen="g1"] [data-agl-gpaga]');
  check(await p.$$eval('[data-agl-gen="g1"] [data-agl-gcol]', c => c.length) === 2, 'al marcar "paga por mes" aparecen sus columnas');
  await p.click('[data-agl-gen="g1"] [data-agl-gguardar]');
  check((await llamadas('agl_config_generacion')).length === 1 && (await p.textContent('#toast')).includes('al menos una columna'), 'sin columnas no guarda');
  await p.check('[data-agl-gen="g25"] [data-agl-gtipo="abonos"]');
  await p.click('[data-agl-gen="g25"] [data-agl-gguardar]');
  await p.waitForTimeout(300);
  check((await llamadas('agl_config_generacion'))[1]?.args.p_tipo === 'abonos', 'cambiar "mensualidades" a "abonos" es un clic');
  await h.captura('academia-glam-generaciones.png');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, es_admin:false, rol:'Cobranza' }; PERMISOS_ACCION_CACHE = { Cobranza:new Set(['ver_todo_academia_glam']) }; aglPintarPlanes(); });
  check(await p.$('[data-agl-gguardar]') === null && await p.$('[data-agl-gpaga]') === null && await p.isDisabled('[data-agl-gen="g26"] [data-agl-gcol="ANT2"]'), 'quien ve todo pero no es administrador solo la lee');
  await p.evaluate(() => { usuarioActual = { id:'u3', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }; PERMISOS_ACCION_CACHE = {}; });

  h.paso('12. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await abrir('cobros');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'Cobros sin scroll de lado');
  await h.captura('academia-glam-cobros-celular.png');
  await abrir('alumnas');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'Alumnas sin scroll de lado de la página');
  await h.captura('academia-glam-alumnas-celular.png');

  await h.terminar();
})();
