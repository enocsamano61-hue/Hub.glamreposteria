/* Glamy BI (Reportes → 🧁 Glamy BI, solo administradores):
   KPI de la gira con mini tendencia y comparación, "Hoy atender", preguntarle a Glamy (modo "bi")
   y dibujar lo que regresa, cambiar el tipo de gráfica, ver detalle, CSV y "Mi tablero".
   Las funciones de la base (bi_consulta, bi_alertas, bi_giras) y Glamy se simulan; el catálogo
   contra la base real se probó aparte. Datos de ejemplo, sin personas reales. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const GIRAS = [
  { id:'g1', nombre:'GIRA ACTUAL PRUEBA', desde:'2026-01-29', hasta:'2026-12-22', fechas:120, inscritas:3000, activa:true },
  { id:'g0', nombre:'Gira Pasada Prueba', desde:'2025-04-15', hasta:'2025-12-20', fechas:111, inscritas:5000, activa:false },
];
const META = { cobrado:['Cobrado', 'money'], con_pago:['Inscritas con pago', 'num'], por_cobrar:['Por cobrar', 'money'], conversion:['Conversión', 'pct'],
  asistencia:['Asistencia', 'pct'], promesas_vencidas:['Promesas vencidas', 'num'] };

(async () => {
  const h = await abrirHub({ tablas:{ bi_reportes:[], bi_metas:[], notas_usuario:[] }, usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Gerente', es_admin:true }, equipo:EQUIPO_EJEMPLO });
  const { p, check } = h;
  await p.evaluate(([giras, meta]) => {
    CIUDADES = [{ id:'c1', nombre:'Ciudad Uno' }, { id:'c2', nombre:'Ciudad Dos' }];
    window.__rpc.bi_giras = () => giras;
    window.__rpc.bi_alertas = () => [
      { nivel:'alto', titulo:'9 promesas de pago vencidas', detalle:'Más en: Ciudad Uno 5', vista:'cobranza' },
      { nivel:'bajo', titulo:'3 leads abiertos sin curso ligado', detalle:'Ligarlos a su curso.', vista:'board' },
    ];
    window.__specs = [];
    window.__rpc.bi_consulta = ({ p_spec, p_detalle }) => {
      window.__specs.push({ spec:p_spec, detalle:p_detalle });
      if(p_detalle) return { detalle:[{ nombre:'ALUMNA DETALLE', telefono:'5510000001', ciudad:'Ciudad Uno', fecha:'2026-10-01', estado:'Con anticipo', monto:700, vendedora:'Vendedora Prueba' }] };
      const [nombre, formato] = meta[p_spec.metrica] || ['Métrica', 'num'];
      const semanas = [1, 2, 3, 4].map(n => ({ clave:'00' + n, etiqueta:'Semana ' + n, valor:n * 100 }));
      const filas = p_spec.por === 'ciudad'
        ? [{ clave:'c1', etiqueta:'<img src=x onerror="window.__xss=1"> Uno', valor:500 }, { clave:'c2', etiqueta:'Ciudad Dos', valor:300 }]
        : p_spec.por === 'total' ? [{ clave:'total', etiqueta:'Total', valor:1000 }] : semanas;
      return { metrica:p_spec.metrica, nombre, formato, definicion:'Definición de prueba.', desde_confiable:'Desde 2020.', por:p_spec.por || 'total',
        filas, total: formato === 'pct' ? 41.5 : 1000, curso:{ id:'g1', nombre:'GIRA ACTUAL PRUEBA' },
        comparar: p_spec.comparar ? { curso:{ id:'g0', nombre:'Gira Pasada Prueba' }, filas:semanas.map(f => ({ ...f, valor:f.valor / 2 })), total:800 } : null,
        meta: p_spec.metrica === 'cobrado' && !p_spec.desde ? { total:2000, filas:null } : null,
        proyeccion: p_spec.metrica === 'cobrado' && !p_spec.desde ? { valor:3500, ritmo_semanal:100, semanas:25, hasta:'2027-03-23' } : null };
    };
    window.__rpc.bi_matriz = ({ p_spec }) => {
      window.__specs.push({ spec:p_spec, matriz:true });
      return { tipo:'matriz', por:'ciudad', curso:{ id:'g1', nombre:'GIRA ACTUAL PRUEBA' },
        columnas:[{ metrica:'inscritas', nombre:'Inscritas', formato:'num', definicion:'Def.', sentido:'mas' },
                  { metrica:'por_cobrar', nombre:'Deben ($)', formato:'money', definicion:'Def.', sentido:'menos' },
                  { metrica:'leads_promesa', nombre:'Anticipos prometidos', formato:'num', definicion:'Def.', sentido:'neutro' }],
        filas:[{ clave:'c1', etiqueta:'Ciudad Uno', valores:{ inscritas:20, por_cobrar:9000, leads_promesa:4 } },
               { clave:'c2', etiqueta:'<img src=x onerror="window.__xss=1"> Dos', valores:{ inscritas:5, por_cobrar:1000, leads_promesa:9 } }],
        totales:{ inscritas:25, por_cobrar:10000, leads_promesa:13 }, metas:{ inscritas:{ c1:40 } } };
    };
    window.__llamadas = [];
    window.__glamy = () => ({ data:{ texto:'Hola' }, error:null });
    Object.defineProperty(sb, 'functions', { value:{ invoke: async (nombre, { body }) => { window.__llamadas.push(JSON.parse(JSON.stringify(body))); return window.__glamy(body); } } });
  }, [GIRAS, META]);

  h.paso('1. Solo administradores');
  await p.evaluate(() => { usuarioActual.es_admin = false; setActiveSection('reportes'); });
  await p.waitForTimeout(300);
  check(!(await p.isVisible('#tabGlamyBI')), 'quien no es administrador no ve Glamy BI');
  await p.evaluate(() => { usuarioActual.es_admin = true; setActiveSection('reportes'); });
  await p.waitForTimeout(300);
  check(await p.isVisible('#tabGlamyBI'), 'el administrador sí lo ve');
  await p.click('#tabGlamyBI');
  await p.waitForTimeout(600);

  h.paso('2. KPI, filtros y "Hoy atender"');
  const kpis = await p.$$eval('#biKpis .bi-kpi', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  check(kpis.length === 5 && kpis[0].includes('Cobrado') && kpis[0].includes('$1,000') && kpis[3].includes('41.5%'), '5 KPI con su formato (' + kpis.join(' | ') + ')');
  check(await p.$$eval('#biKpis svg polyline', x => x.length) === 5, 'cada KPI con su mini tendencia');
  const kpiSpecs = await p.evaluate(() => window.__specs.filter(x => x.spec.grafica === 'kpi').map(x => x.spec));
  check(kpiSpecs.every(sp => sp.por === 'semana_gira' && sp.curso === 'g1'), 'los KPI son de la gira activa');
  check((await p.$$eval('#biCurso option', o => o.map(x => x.textContent)))[0].startsWith('Gira Actual Prueba'), 'la gira activa va primero');
  const alertas = await p.textContent('#biAlertas');
  check(alertas.includes('9 promesas de pago vencidas') && alertas.includes('Ciudad Uno 5') && await p.$('#biAlertas [data-bi-ir="cobranza"]') !== null, '"Hoy atender" con su botón Ir');
  await p.selectOption('#biComparar', 'g0');
  await p.waitForTimeout(400);
  const k0 = await p.textContent('#biKpis .bi-kpi');
  check(k0.includes('▲ 25%') && k0.includes('vs Gira Pasada Prueba'), 'al comparar, cada KPI dice cuánto cambió (' + k0.replace(/\s+/g, ' ') + ')');
  check(await p.evaluate(() => [...document.querySelectorAll('#biKpis .bi-kpi')][2].querySelector('.d').classList.contains('baja')), '"Por cobrar" que sube se pinta en rojo');
  await h.captura('glamy-bi.png');

  h.paso('3. Preguntarle a Glamy');
  await p.evaluate(() => {
    window.__glamy = body => ({ data:{
      texto:'**Lectura**\n- Esta gira lleva **25% más** que la pasada.\n**Recomendaciones**\n- Llamar a las <b>9</b> vencidas.',
      bi:[{ spec:{ metrica:'cobrado', por:'semana_gira', comparar:'Gira Pasada Prueba', grafica:'linea', titulo:'Cobrado por semana' }, datos:window.__rpc.bi_consulta({ p_spec:{ metrica:'cobrado', por:'semana_gira', comparar:'g0' } }) },
          { spec:{ metrica:'promesas_vencidas', por:'ciudad', grafica:'barras_horizontales', titulo:'Promesas vencidas por ciudad' }, datos:window.__rpc.bi_consulta({ p_spec:{ metrica:'promesas_vencidas', por:'ciudad' } }) }],
    }, error:null });
  });
  await p.click('[data-bi-sug]');
  await p.waitForTimeout(600);
  const llamada = (await p.evaluate(() => window.__llamadas)).pop();
  check(llamada && llamada.modo === 'bi' && llamada.seccion === 'reportes', 'le pregunta a Glamy en modo BI');
  check(llamada.mensajes.pop().texto.includes('Filtros en pantalla: gira: Gira Actual Prueba'), 'le pasa los filtros de la pantalla');
  check(await p.$$eval('#biRespuestas .bi-graf', x => x.length) === 2 && await p.evaluate(() => Object.keys(chartInstances).filter(k => k.startsWith('biCanvas_')).length) >= 2,
        'dibuja las 2 gráficas que pidió Glamy');
  const lect = await p.textContent('#biRespuestas .bi-lectura');
  check(lect.includes('Lectura') && lect.includes('Recomendaciones') && await p.$('#biRespuestas .bi-lectura strong') !== null, 'con lectura y recomendaciones');
  check(!(await p.evaluate(() => window.__xss)) && (await p.textContent('#biRespuestas')).includes('<b>9</b>'), 'texto y etiquetas escapados');
  check(await p.evaluate(() => { const c = Object.entries(chartInstances).find(([k, v]) => k.startsWith('biCanvas_') && v.config.type === 'line'); return c && c[1].data.datasets.length === 2; }),
        'la línea trae la gira pasada para comparar');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'bi_pregunta'), 'queda en la actividad');
  await h.captura('glamy-bi-respuesta.png');

  h.paso('4. Tabla, detalle y CSV');
  const id2 = await p.$$eval('#biRespuestas [data-bi-graf]', x => x[1].dataset.biGraf);
  await p.selectOption(`[data-bi-tipo="${id2}"]`, 'tabla');
  await p.waitForTimeout(200);
  check((await p.textContent(`[data-bi-graf="${id2}"] .bi-tabla`)).includes('Ciudad Dos'), 'se puede ver como tabla');
  await p.click(`[data-bi-graf="${id2}"] .bi-tabla [data-bi-clave="c2"]`);
  await p.waitForSelector('#modalBIDetalle.open');
  await p.waitForTimeout(300);
  check((await p.textContent('#biDetTabla')).includes('Alumna Detalle') && (await p.evaluate(() => window.__specs.pop())).detalle === 'c2', 'el detalle trae a quiénes forman ese número');
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('#biDetCSV')]);
  check(csv.suggestedFilename().startsWith('glamy-bi-detalle'), 'el detalle se exporta');
  await p.click('#closeModalBIDetalle');
  const [csv2] = await Promise.all([p.waitForEvent('download'), p.click(`[data-bi-csv="${id2}"]`)]);
  check(require('fs').readFileSync(await csv2.path(), 'utf8').includes('Ciudad Dos'), 'y la gráfica también');

  h.paso('5. Mi tablero');
  const id1 = await p.$$eval('#biRespuestas [data-bi-graf]', x => x[0].dataset.biGraf);
  await p.click(`[data-bi-guardar="${id1}"]`);
  await p.waitForTimeout(500);
  const guardado = (await h.ops('bi_reportes', 'insert'))[0];
  check(guardado && guardado.titulo === 'Cobrado por semana' && guardado.spec.metrica === 'cobrado' && guardado.lectura.includes('Lectura'), 'guarda la pregunta (no los números) con su lectura');
  check(await p.$$eval('#biTablero .bi-graf', x => x.length) === 1 && await p.$('#biTablero [data-bi-quitar]') !== null, 'aparece en el tablero, con los datos de hoy');
  await p.click('#biTablero [data-bi-quitar]');
  await p.waitForTimeout(400);
  check((await h.ops('bi_reportes', 'update')).some(u => u.archivado === true), '"Quitar" lo archiva (no se borra)');

  h.paso('6. Si Glamy falla');
  await p.evaluate(() => { window.__glamy = () => ({ data:null, error:{ message:'sin conexión', context:{ json: async () => ({}) } } }); });
  await p.fill('#biPregunta', 'Algo');
  await p.press('#biPregunta', 'Enter');
  await p.waitForTimeout(500);
  check((await p.textContent('#biRespuestas .bi-resp')).includes('No pude responder ahora'), 'avisa sin romper la pantalla');

  h.paso('7. Fase 2: meta y proyección en los KPI');
  await p.evaluate(() => { document.getElementById('biPeriodo').value = ''; document.getElementById('biPeriodo').dispatchEvent(new Event('change', { bubbles:true })); });
  await p.waitForTimeout(400);
  const kCob = await p.textContent('#biKpis .bi-kpi');
  check(kCob.includes('Meta $2,000') && kCob.includes('50%') && kCob.includes('Proyección al cierre: $3,500') && kCob.includes('ritmo $100/semana'), 'cobrado con avance contra meta y proyección con su supuesto');

  h.paso('8. Periodo');
  await p.selectOption('#biPeriodo', 'mes');
  await p.waitForTimeout(400);
  const spP = await p.evaluate(() => window.__specs.filter(x => x.spec.grafica === 'kpi').pop().spec);
  check(spP.desde && spP.desde.endsWith('-01') && spP.hasta >= spP.desde, 'el periodo manda las fechas (' + spP.desde + ' a ' + spP.hasta + ')');
  check(!(await p.textContent('#biKpis .bi-kpi')).includes('Proyección'), 'con periodo no se muestra proyección (es de toda la gira)');
  await p.selectOption('#biPeriodo', 'rango');
  check(await p.isVisible('#biRango'), '"De… a…" pide las dos fechas');
  await p.selectOption('#biPeriodo', '');
  await p.waitForTimeout(300);

  h.paso('9. Matriz y preguntas de seguimiento');
  await p.evaluate(() => {
    window.__glamy = () => ({ data:{
      texto:'**Lectura**\n- Ciudad Uno trae más inscritas.\nTomé "anticipos pendientes" como leads que prometieron.\n**Para afinar**\n⟦seguir:¿Quieres ver también las inscritas que deben?⟧\n⟦seguir:¿Lo quieres por vendedora?⟧',
      bi:[{ spec:{ grafica:'matriz', titulo:'Resumen por ciudad', por:'ciudad', metricas:['inscritas', 'por_cobrar', 'leads_promesa'] }, datos:window.__rpc.bi_matriz({ p_spec:{} }) }],
    }, error:null });
  });
  await p.fill('#biPregunta', 'resumen por ciudad: inscritas, lo que deben y anticipos pendientes');
  await p.click('#biPreguntar');
  await p.waitForTimeout(600);
  const mx = await p.$('#biRespuestas .bi-graf-matriz');
  check(mx !== null && (await mx.textContent()).includes('Anticipos prometidos') && (await mx.textContent()).includes('Total'), 'una sola tabla con varias columnas y totales');
  check((await mx.textContent()).includes('50% de 40'), 'la celda con meta dice su avance');
  check(await p.evaluate(() => document.querySelector('#biRespuestas .bi-matriz tbody td[data-bi-met="por_cobrar"]').getAttribute('style').includes('181,69,58')), '"Deben" en rojo (más es peor)');
  check(!(await p.evaluate(() => window.__xss)), 'nombres escapados en la tabla');
  const seg = await p.$$eval('#biRespuestas .bi-seguir button', x => x.map(y => y.textContent));
  check(seg.length === 2 && seg[0].includes('inscritas que deben') && !(await p.textContent('#biRespuestas .bi-lectura')).includes('⟦'), 'las preguntas de seguimiento salen como botones (y no como texto)');
  await p.click('#biRespuestas .bi-matriz th[data-bi-col="leads_promesa"]');
  check((await p.$$eval('#biRespuestas .bi-matriz tbody tr:not(.tot) td:first-child', x => x.map(y => y.textContent)))[0].includes('Dos'), 'tocar un encabezado ordena');
  await p.click('#biRespuestas .bi-matriz td[data-bi-met="por_cobrar"][data-bi-clave="c1"]');
  await p.waitForSelector('#modalBIDetalle.open');
  await p.waitForTimeout(300);
  const det = await p.evaluate(() => window.__specs.filter(x => x.detalle).pop());
  check(det && det.detalle === 'c1' && det.spec.metrica === 'por_cobrar' && !det.spec.metricas, 'tocar una celda trae el detalle de esa métrica y esa fila');
  await p.click('#closeModalBIDetalle');
  const [csvM] = await Promise.all([p.waitForEvent('download'), p.click('#biRespuestas .bi-graf-matriz [data-bi-csv]')]);
  check(require('fs').readFileSync(await csvM.path(), 'utf8').includes('Deben ($)'), 'la tabla se exporta');
  await p.click('#biRespuestas .bi-graf-matriz [data-bi-guardar]');
  await p.waitForTimeout(500);
  check((await h.ops('bi_reportes', 'insert')).pop()?.spec?.metricas?.length === 3 && await p.$('#biTablero .bi-graf-matriz') !== null, 'se guarda en el tablero y ahí se vuelve a consultar como tabla');
  await p.click('#biRespuestas .bi-seguir button');
  await p.waitForTimeout(400);
  check((await p.evaluate(() => window.__llamadas)).pop().mensajes.slice(-1)[0].texto.startsWith('¿Quieres ver también las inscritas que deben?'), 'tocar una pregunta de seguimiento se la pregunta a Glamy');
  await h.captura('glamy-bi-matriz.png');

  h.paso('10. Metas');
  await p.click('#biMetasBtn');
  await p.waitForSelector('#modalBIMetas.open');
  await p.fill('#biMetaValor', '2000000');
  await p.click('#biMetaGuardar');
  await p.waitForTimeout(400);
  const mt = (await h.ops('bi_metas', 'insert'))[0];
  check(mt && mt.curso_id === 'g1' && mt.metrica === 'cobrado' && mt.ambito === 'total' && mt.clave === null && mt.valor === 2000000, 'guarda la meta de la gira');
  await p.selectOption('#biMetaAmbito', 'ciudad');
  check(await p.isVisible('#biMetaClaveCampo'), 'para una ciudad pide cuál');
  await p.click('#biMetasTabla [data-bi-meta-quitar]');
  await p.waitForTimeout(300);
  check((await h.ops('bi_metas', 'update')).some(u => u.activa === false), '"Quitar" la desactiva (no se borra)');
  await h.captura('glamy-bi-metas.png');
  await p.click('#closeModalBIMetas');

  h.paso('11. El resumen semanal del bloc abre Glamy BI');
  await p.evaluate(() => {
    NOTAS = [{ id:'n1', usuario_id:'u1', texto:'📊 Resumen semanal', de_sistema:true, nota_sistema:'Cobrado de la gira: $1,000', completado:false, orden:0,
      creado_en:new Date().toISOString(), actualizado_en:new Date().toISOString(), enlace:{ vista:'reportes', tab:'glamybi', etiqueta:'Abrir Glamy BI', bi_resumen:true } }];
    setActiveSection('inicio');
    return irAEnlaceNota('n1');
  });
  await p.waitForTimeout(500);
  check(await p.evaluate(() => document.getElementById('reportes-glamybi').classList.contains('active')), '"Ir →" lleva directo a Glamy BI');

  h.paso('12. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('glamy-bi-celular.png');

  await h.terminar();
})();
