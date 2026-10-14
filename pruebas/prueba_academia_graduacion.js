/* Academia (fase 2, pestaña Graduación): próxima graduación con cuenta por alumna
   (precio congelado, acompañantes, extras de Precios, abonos de graduación y hotel),
   hotel, filipinas, quitar/volver, agregar alumna, datos de la graduación,
   graduación pasada solo consulta, Precios por área y "Se gradúa" desde Alumnas.
   Datos inventados. */
const { abrirHub } = require('./arnes');

const GENS = [{ id:'g1', clave:'gen1', nombre:'1ª generación', hoja:'1ER GEN', orden:1 }];
const ALUMNAS = [
  { id:'a1', generacion_id:'g1', persona_id:'p1', nombre:'ANA PRUEBA UNO', telefono:'0000000001', decision:'se_gradua', hoja:'1ER GEN', fila:3, personas:{ id:'p1', nombre:'ANA PRUEBA UNO', telefono_principal:'0000000001' } },
  { id:'a2', generacion_id:'g1', persona_id:'p2', nombre:'BETY PRUEBA DOS', telefono:'0000000002', decision:'se_gradua', hoja:'1ER GEN', fila:4, personas:{ id:'p2', nombre:'BETY PRUEBA DOS', telefono_principal:'0000000002' } },
  { id:'a3', generacion_id:'g1', persona_id:'p3', nombre:'CARLA PRUEBA TRES', telefono:'0000000003', decision:'por_contactar', hoja:'1ER GEN', fila:5, personas:{ id:'p3', nombre:'CARLA PRUEBA TRES', telefono_principal:'0000000003' } },
];
const S = (id, extra) => ({ id, graduacion_id:'gr27', alumna_id:null, clave_origen:'hub:' + id, bloque:null, fila:null, nombre:'', telefono:null,
  invitados_texto:null, filipina_texto:null, hotel_texto:null, liquido_texto:null, abonos:[], acompanantes:0, invitados:[], hotel_tipo:null,
  hotel_entrada:null, hotel_salida:null, hotel_total:null, filipina_talla:null, filipina_color:null, filipina_nombre:null,
  precio_alumna:3115, precio_acompanante:1505, extras:[], estado:'activa', notas:null, academia_alumnas:null, ...extra });
const base = () => ({
  academia_generaciones: GENS,
  academia_alumnas: ALUMNAS.map(a => ({ ...a })),
  academia_graduaciones: [
    { id:'gr27', clave:'2027-08', nombre:'Graduación agosto 2027', fechas_texto:'MARTES 3 Y MIERCOLES 4 DE AGOSTO 2027', fecha_inicio:'2027-08-03', sede:null,
      generaciones_texto:'GEN 4, 5 Y 6', precio_alumna:3115, precio_acompanante:1505, conceptos:[{ concepto:'CENA', precio:750 }], estado:'proxima' },
    { id:'gr26', clave:'2026-08', nombre:'Graduación agosto 2026', fechas_texto:'GRADUACION MARTES 4', fecha_inicio:'2026-08-04', sede:null,
      generaciones_texto:'88 GRADUADOS', precio_alumna:1715, precio_acompanante:800, conceptos:[], estado:'pasada' },
  ],
  academia_graduacion_asistentes: [
    S('s1', { alumna_id:'a1', nombre:'ANA PRUEBA UNO', telefono:'0000000001', acompanantes:1, invitados:[{ nombre:'Mamá de Ana', parentesco:'Mamá' }],
      hotel_tipo:'doble', hotel_total:3000, filipina_talla:'XL', filipina_color:'blanca', filipina_nombre:'Ana P.', academia_alumnas:{ id:'a1', nombre:'ANA PRUEBA UNO', generacion_id:'g1', persona_id:'p1', telefono:'0000000001' } }),
    S('s2', { alumna_id:'a2', nombre:'BETY PRUEBA DOS', telefono:'0000000002', academia_alumnas:{ id:'a2', nombre:'BETY PRUEBA DOS', generacion_id:'g1', persona_id:'p2', telefono:'0000000002' } }),
    S('h1', { graduacion_id:'gr26', clave_origen:'0000000009', bloque:'1ER GEN', fila:52, nombre:'DORA DEL EXCEL', telefono:'0000000009',
      invitados_texto:'3 · Madre, novio', hotel_texto:'3 noches doble', filipina_texto:'XXL negra', liquido_texto:'HEY $2865', abonos:['$950 hey'], precio_alumna:null, precio_acompanante:null }),
  ],
  academia_graduacion_pagos: [
    { id:'gp1', graduacion_id:'gr27', asistente_id:'s1', concepto:'graduacion', monto:2000, forma:'Transferencia', fecha:'2026-10-01', nota:null, creado_en:'2026-10-01T10:00:00Z' },
    { id:'gp2', graduacion_id:'gr27', asistente_id:'s1', concepto:'hotel', monto:1000, forma:'Efectivo', fecha:'2026-10-02', nota:null, creado_en:'2026-10-02T10:00:00Z' },
  ],
  precios: [
    { id:'pr1', nombre:'Gorro extra', precio:250, activo:true, orden:1, area:'academia' },
    { id:'pr2', nombre:'Uniforme', precio:null, activo:true, orden:2, area:'gira' },
  ],
});
const ACADEMIA = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false };
const EQUIPO = [{ id:'u3', nombre:'Academia Prueba', es_vendedor:false, rol:'Academia e Inbox' }];

(async () => {
  const h = await abrirHub({ tablas:base(), usuario:ACADEMIA, equipo:EQUIPO, permisosAccion:{ 'Academia e Inbox':new Set(['cobrar_academia']) } });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  const filas = () => p.$$eval('#agBody tr[data-ag-id]', trs => trs.map(t => t.dataset.agId));
  const chip = async id => ((await p.$(`[data-ag-filtro="${id}"] b`)) ? (await txt(`[data-ag-filtro="${id}"] b`)).trim() : null);
  const kpis = () => p.$$eval('#agKpis .kpi', ks => ks.map(k => k.querySelector('.v').textContent.trim()));
  const elegir = async id => { await p.click(`#agBody tr[data-ag-id="${id}"]`); await p.waitForTimeout(100); };
  const confirmar = async () => { await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(200); };
  const ultimo = async (tabla, tipo) => (await h.ops(tabla, tipo)).pop();
  const abrir = async () => {
    await p.evaluate(t => {
      window.__tablas = t; window.__ops = []; PRECIOS = null;
      usuarioActual = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false }; PERMISOS_ROL_CACHE = {};
      PERMISOS_ACCION_CACHE = { 'Academia e Inbox':new Set(['cobrar_academia']) };
      ac = { tab:'alumnas', generaciones:null, gen:null, filas:[], resumen:new Map(), filtro:'todas', sel:null, pagosDe:null, pagos:null, pagoSel:null, privados:null, limite:AC_POR_PAGINA };
      ag = { grads:null, grad:null, filas:[], pagos:new Map(), sel:null, filtro:'todas', todas:null };
      aplicarPermisosNav();
    }, base());
    await p.evaluate(() => setActiveSection('academia'));
    await p.waitForTimeout(200);
    await p.click('[data-ac-tab="graduacion"]');
    await p.waitForTimeout(300);
  };

  h.paso('1. Próxima graduación: números, lista y resúmenes');
  await abrir();
  check(await p.isVisible('#acPanelGraduacion') && !(await p.isVisible('#acPanelAlumnas')), 'cambia a la pestaña Graduación');
  check((await p.$eval('#agGrad', s => s.value)) === 'gr27', 'arranca en la próxima');
  check((await filas()).join() === 's1,s2', 'lista sus 2 alumnas: ' + (await filas()).join());
  check((await kpis()).join('|') === '2|0|1|1|$7,735', 'números: se gradúan 2, liquidaron 0, 1 acompañante, 1 habitación, falta $7,735: ' + (await kpis()).join('|'));
  check(await chip('deben') === '2' && await chip('sintalla') === '1' && await chip('sinhotel') === '1' && await chip('canceladas') === null, 'chips: ' + await txt('#agChips'));
  check((await txt('#agResumenes')).includes('Filipinas') && (await p.$$eval('.ag-tallas .b', b => b.map(x => x.textContent).join())) === '1', 'filipinas: XL blanca 1');
  check((await txt('#agBody tr[data-ag-id="s1"]')).includes('$2,000 / $4,620') && (await txt('#agBody tr[data-ag-id="s1"]')).includes('debe $2,620'), 'cuenta en la lista');
  check((await h.ops('academia_graduacion_asistentes', 'update')).length === 0, 'abrir no cambia nada');
  await h.captura('graduacion-computadora.png');

  h.paso('2. Ficha: cuenta, acompañantes y extras');
  const ficha = await txt('#agDetalle');
  check(ficha.includes('$3,115') && ficha.includes('$4,620') && ficha.includes('$2,620'), 'alumna, total y lo que debe');
  check(ficha.includes('Gorro extra') && !ficha.includes('Uniforme'), 'ofrece solo los extras de la Academia');
  await p.click('[data-ag-acomp="1"]'); await p.waitForTimeout(150);
  const acomp = await ultimo('academia_graduacion_asistentes', 'update');
  check(acomp && acomp.acompanantes === 2 && acomp.invitados.length === 1, 'suma un acompañante sin perder el nombre del primero');
  check((await txt('#agDetalle')).includes('$6,125'), 'el total sube a $6,125');
  await p.fill('[data-ag-inv="1"][data-ag-inv-campo="nombre"]', 'Hermana de Ana');
  await p.click('#agDetalle h3'); await p.waitForTimeout(150);
  const inv = await ultimo('academia_graduacion_asistentes', 'update');
  check(inv && inv.invitados?.[1]?.nombre === 'Hermana de Ana' && inv.invitados?.[0]?.nombre === 'Mamá de Ana', 'guarda el nombre del acompañante 2');
  await p.click('[data-ag-extra="pr1"]'); await p.waitForTimeout(150);
  check((await ultimo('academia_graduacion_asistentes', 'update'))?.extras?.[0]?.monto === 250, 'agrega el gorro con su precio');
  check((await txt('#agDetalle')).includes('$6,375'), 'total con el extra');
  await p.click('[data-ag-quitar-extra="0"]'); await p.waitForTimeout(150);
  check((await ultimo('academia_graduacion_asistentes', 'update'))?.extras?.length === 0, 'quita el extra');

  h.paso('3. Hotel y filipina');
  await elegir('s2');
  await p.selectOption('[data-ag-campo="hotel_tipo"]', 'triple'); await p.waitForTimeout(150);
  check((await ultimo('academia_graduacion_asistentes', 'update'))?.hotel_tipo === 'triple', 'guarda la habitación');
  await p.fill('[data-ag-campo="hotel_total"]', '2400'); await p.click('#agDetalle h3'); await p.waitForTimeout(150);
  check((await ultimo('academia_graduacion_asistentes', 'update'))?.hotel_total === 2400, 'guarda el total del hotel');
  await p.selectOption('[data-ag-campo="filipina_talla"]', 'M'); await p.waitForTimeout(150);
  await p.selectOption('[data-ag-campo="filipina_color"]', 'ambas'); await p.waitForTimeout(150);
  check(await chip('sintalla') === '0' && await chip('sinhotel') === '0', 'ya no sale en "Sin talla" ni "Sin hotel"');
  check((await p.$$eval('.ag-tallas .n', b => b.map(x => x.textContent).join())).includes('1'), '"blanca y negra" cuenta una negra también');

  h.paso('4. Pagos de graduación y hotel');
  await p.click('[data-ag-acc="liquida"]');
  check((await p.$eval('#agPagoMonto', i => i.value)) === '3115', '"Liquida todo" pone lo que debe');
  await p.click('[data-ag-acc="pago"]');
  await confirmar();
  const pg = await ultimo('academia_graduacion_pagos', 'insert');
  check(pg && pg.asistente_id === 's2' && pg.concepto === 'graduacion' && pg.monto === 3115 && pg.graduacion_id === 'gr27', 'registra el abono');
  check((await txt('#agBody tr[data-ag-id="s2"]')).includes('Liquidó'), 'queda liquidada');
  await p.selectOption('#agPagoConcepto', 'hotel');
  await p.fill('#agPagoMonto', '1000');
  await p.click('[data-ag-acc="pago"]');
  await confirmar();
  check((await ultimo('academia_graduacion_pagos', 'insert'))?.concepto === 'hotel', 'abono al hotel aparte');
  check((await txt('#agDetalle')).includes('debe $1,400'), 'el hotel muestra lo que falta');
  check((await h.ops('actividad_usuario', 'insert')).filter(x => x.accion === 'academia_grad_pago').length === 2, 'actividad de los dos pagos');
  await p.fill('#agPagoMonto', '');
  await p.click('[data-ag-acc="pago"]'); await p.waitForTimeout(100);
  check(!(await p.isVisible('#modalConfirmar.open')), 'sin monto no registra');

  h.paso('5. Quitar y volver a agregar');
  await p.click('[data-ag-acc="quitar"]');
  await confirmar();
  check((await ultimo('academia_graduacion_asistentes', 'update'))?.estado === 'cancelada', 'se marca como quitada (no se borra)');
  check((await filas()).join() === 's1' && await chip('canceladas') === '1', 'sale de la lista y aparece "Quitadas"');
  await p.click('[data-ag-filtro="canceladas"]'); await p.waitForTimeout(100);
  await p.click('[data-ag-acc="reactivar"]'); await p.waitForTimeout(150);
  check((await ultimo('academia_graduacion_asistentes', 'update'))?.estado === 'activa', 'vuelve a la graduación');
  check((await h.ops('academia_graduacion_asistentes', 'delete')).length === 0, 'nunca se borra');

  h.paso('6. Agregar alumna');
  await p.click('[data-ag-filtro="todas"]');
  await p.click('#agAgregarBtn'); await p.waitForTimeout(150);
  await p.fill('#agAgregarBuscar', 'carla'); await p.waitForTimeout(150);
  check((await p.$$('[data-ag-agregar]')).length === 1, 'la encuentra');
  await p.fill('#agAgregarBuscar', 'ana'); await p.waitForTimeout(150);
  check(await p.$eval('[data-ag-agregar="a1"]', b => b.disabled), 'quien ya está sale como "Ya está"');
  await p.fill('#agAgregarBuscar', 'carla'); await p.waitForTimeout(150);
  await p.click('[data-ag-agregar="a3"]'); await p.waitForTimeout(300);
  const nueva = await ultimo('academia_graduacion_asistentes', 'insert');
  check(nueva && nueva.alumna_id === 'a3' && nueva.clave_origen === 'hub:a3' && nueva.precio_alumna === 3115 && nueva.precio_acompanante === 1505 && nueva.graduacion_id === 'gr27', 'la agrega con el precio congelado');
  check((await ultimo('academia_alumnas', 'update'))?.decision === 'se_gradua', 'su decisión pasa a "Se gradúa"');

  h.paso('7. Datos de la graduación');
  await p.fill('[data-ag-grad="precio_alumna"]', '3300');
  await p.click('#agKpis'); await p.waitForTimeout(150);
  const dg = await ultimo('academia_graduaciones', 'update');
  check(dg && dg.precio_alumna === 3300, 'guarda el nuevo precio');
  check((await h.filas('academia_graduacion_asistentes')).find(x => x.id === 's1').precio_alumna === 3115, 'quien ya estaba conserva su precio');
  await p.fill('[data-ag-grad="sede"]', 'Salón de prueba');
  await p.click('#agKpis'); await p.waitForTimeout(150);
  check((await ultimo('academia_graduaciones', 'update'))?.sede === 'Salón de prueba', 'guarda la sede');

  h.paso('8. Graduación pasada: solo consulta');
  await p.selectOption('#agGrad', 'gr26'); await p.waitForTimeout(250);
  check((await filas()).join() === 'h1' && !(await p.isVisible('#agAgregarBtn')), 'lista lo del Excel y no deja agregar');
  check((await txt('#agDetalle')).includes('HEY $2865') && (await txt('#agDetalle')).includes('$950 hey') && !(await p.$('[data-ag-campo]')), 'muestra los textos del Excel, sin campos para editar');

  h.paso('9. Precios por área y "Se gradúa" desde Alumnas');
  await p.evaluate(() => setActiveSection('precios')); await p.waitForTimeout(200);
  check((await p.$$('.precio-area')).length === 2, 'cada precio tiene su área');
  await p.selectOption('.precio-fila[data-precio-id="pr2"] .precio-area', 'academia'); await p.waitForTimeout(150);
  check((await ultimo('precios', 'update'))?.area === 'academia', 'se cambia el área');
  check(await p.evaluate(() => typeof renderAcademia === 'function'), 'sección viva');
  await abrir();
  await p.click('[data-ac-tab="alumnas"]'); await p.waitForTimeout(250);
  await p.click('#acBody tr[data-ac-id="a3"]'); await p.waitForTimeout(150);
  await p.click('[data-ac-decision="se_gradua"]'); await p.waitForTimeout(250);
  await confirmar();
  check((await ultimo('academia_graduacion_asistentes', 'insert'))?.alumna_id === 'a3', 'al marcar "Se gradúa" ofrece agregarla y la agrega');

  h.paso('10. Celular');
  await abrir();
  await p.setViewportSize({ width:390, height:844 }); await p.waitForTimeout(150);
  await h.captura('graduacion-celular.png');
  check((await p.evaluate(() => document.documentElement.scrollWidth)) <= 392, 'sin scroll horizontal');
  await elegir('s1');
  await p.evaluate(() => document.getElementById('agDetalle').scrollIntoView());
  await h.captura('graduacion-celular-ficha.png');

  await h.terminar();
})();
