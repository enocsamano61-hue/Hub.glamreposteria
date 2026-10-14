/* Academia (fase 1, pestaña Alumnas): menú por rol, generaciones, filtros, chips,
   ficha, decisión, notas, "ya lo revisé", datos privados, pagos (registrar y
   corregir, con y sin permiso), todas las generaciones y celular. Datos inventados. */
const { abrirHub } = require('./arnes');

const GENS = [
  { id:'g1', clave:'gen1', nombre:'1ª generación', hoja:'1ER GEN', orden:1 },
  { id:'g2', clave:'gen2', nombre:'2ª generación', hoja:'2DO GEN', orden:2 },
];
const P = (id, nombre, tel) => ({ id, nombre, telefono_principal:tel, telefono_alternativo:null, correo:null, fecha_nacimiento:null });
const A = (id, gen, nombre, tel, extra) => ({ id, generacion_id:gen, persona_id:tel ? 'p-' + id : null, hoja:gen === 'g1' ? '1ER GEN' : '2DO GEN',
  fila:Number(id.replace(/\D/g, '')) + 2, seccion_excel:null, matricula:null, nombre, telefono:tel, sin_telefono:!tel, telefono_2:null,
  ciudad_texto:'Ciudad Prueba', vendedor_texto:null, graduacion_excel:null, comentario_excel:null, decision:'por_contactar', notas:null,
  revisar:null, personas:tel ? P('p-' + id, nombre, tel) : null, ...extra });
const R = (alumna_id, generacion_id, r) => ({ alumna_id, generacion_id, pagos:0, pagados:0, debe:0, por_revisar:0, total_pagado:0, ...r });
const base = () => ({
  academia_generaciones: GENS,
  academia_alumnas: [
    A('a1', 'g1', 'ANA PRUEBA UNO', '0000000001', { decision:'graduada', graduacion_excel:'GRADUADA' }),
    A('a2', 'g1', 'BETY PRUEBA DOS', '0000000002', { revisar:'El teléfono ya está en el Hub con otro nombre: confirmar que es la misma persona',
      personas:P('p-a2', 'MAMÁ DE BETY', '0000000002') }),
    A('a3', 'g1', 'CARLA PRUEBA TRES', '0000000003', { decision:'kit', comentario_excel:'Quiere kit talla XL' }),
    A('a4', 'g1', 'DORA SIN TELEFONO', null, { revisar:'Sin teléfono en el Excel' }),
    A('a5', 'g2', 'ELENA SEGUNDA GEN', '0000000005'),
  ],
  academia_pagos_resumen: [
    R('a1', 'g1', { pagos:3, pagados:3, total_pagado:1740 }),
    R('a2', 'g1', { pagos:2, pagados:1, debe:1, total_pagado:580 }),
    R('a3', 'g1', { pagos:1, por_revisar:1 }),
    R('a5', 'g2', { pagos:1, pagados:1, total_pagado:900 }),
  ],
  academia_pagos: [
    { id:'x1', alumna_id:'a1', columna:20, columna_excel:'JUNIO', texto_original:'PAGADO $580 BANORTE', fecha_texto:null, monto:580, banco:'BANORTE', estado:'pagado', origen:'excel' },
    { id:'x2', alumna_id:'a1', columna:21, columna_excel:'JULIO', texto_original:'PAGADO $580 HEY', fecha_texto:null, monto:580, banco:'HEY', estado:'pagado', origen:'excel' },
    { id:'x3', alumna_id:'a1', columna:22, columna_excel:'AGOSTO', texto_original:'PAGADO $580 COPPEL', fecha_texto:null, monto:580, banco:'COPPEL', estado:'pagado', origen:'excel' },
    { id:'x4', alumna_id:'a2', columna:20, columna_excel:'JUNIO', texto_original:'PAGADO $580', fecha_texto:null, monto:580, banco:null, estado:'pagado', origen:'excel' },
    { id:'x5', alumna_id:'a2', columna:21, columna_excel:'JULIO', texto_original:'DEBE JULIO', fecha_texto:null, monto:null, banco:null, estado:'debe', origen:'excel' },
    { id:'x6', alumna_id:'a3', columna:20, columna_excel:'JUNIO', texto_original:'$60026 MARZO', fecha_texto:null, monto:60026, banco:null, estado:'por_revisar', origen:'excel' },
  ],
  academia_datos_privados: [{ alumna_id:'a1', curp:'XXXX000000XXXXXX00', direccion:'Calle Inventada 123', estado_civil:'SOLTERA',
    nacimiento_texto:null, redes:{ FACEBOOK:'ana.prueba' }, encuesta:{ 'CUAL ES TU SUEÑO':'Tener mi pastelería' } }],
});
const ACADEMIA = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false };
const EQUIPO = [{ id:'u3', nombre:'Academia Prueba', es_vendedor:false, rol:'Academia e Inbox' }, { id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }];

(async () => {
  const h = await abrirHub({ tablas:base(), usuario:ACADEMIA, equipo:EQUIPO, permisosAccion:{ 'Academia e Inbox':new Set(['cobrar_academia']) } });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  const filas = () => p.$$eval('#acBody tr[data-ac-id]', trs => trs.map(t => t.dataset.acId));
  const chip = async id => ((await p.$(`[data-ac-filtro="${id}"] b`)) ? (await txt(`[data-ac-filtro="${id}"] b`)).trim() : null);
  const elegir = async id => { await p.click(`#acBody tr[data-ac-id="${id}"]`); await p.waitForTimeout(120); };
  const confirmar = async () => { await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(150); };
  const abrir = async (usuario = ACADEMIA, permisos = { 'Academia e Inbox':new Set(['cobrar_academia']) }) => {
    await p.evaluate(([t, u, pa]) => {
      window.__tablas = t; window.__ops = [];
      usuarioActual = u; PERMISOS_ROL_CACHE = {};
      PERMISOS_ACCION_CACHE = Object.fromEntries(Object.entries(pa).map(([k, v]) => [k, new Set(v)]));
      ac = { generaciones:null, gen:null, filas:[], resumen:new Map(), filtro:'todas', sel:null, pagosDe:null, pagos:null, pagoSel:null, privados:null, limite:AC_POR_PAGINA };
      document.getElementById('acBuscar').value = ''; document.getElementById('acPagos').value = '';
      aplicarPermisosNav();
    }, [base(), usuario, Object.fromEntries(Object.entries(permisos).map(([k, v]) => [k, [...v]]))]);
    await p.evaluate(() => setActiveSection('academia'));
    await p.waitForTimeout(300);
  };

  h.paso('1. Menú y lista de la primera generación');
  await abrir();
  check(await p.isVisible('#desktopNav [data-view="academia"]'), 'Academia está en el menú de su rol');
  check(await p.isVisible('#view-academia'), 'se abre la sección');
  check((await p.$eval('#acGen', s => s.value)) === 'g1', 'arranca en la 1ª generación');
  check((await filas()).join() === 'a1,a2,a3,a4', 'lista la 1ª generación en orden del Excel: ' + (await filas()).join());
  check(await chip('todas') === '4' && await chip('graduada') === '1' && await chip('kit') === '1' && await chip('revisar') === '2' && await chip('por_contactar') === '2',
    'chips con conteos: ' + await txt('#acChips'));
  check(await chip('se_gradua') === null, 'no muestra chips en cero');
  check((await txt('#acResumen')).includes('4 alumnas') && (await txt('#acResumen')).includes('$2,320'), 'resumen: ' + await txt('#acResumen'));
  check((await txt('#acBody')).includes('debe 1') && (await txt('#acBody')).includes('1 por revisar') && (await txt('#acBody')).includes('Sin teléfono'), 'columna de pagos y sin teléfono');
  check((await h.ops('academia_alumnas', 'update')).length === 0, 'abrir no cambia nada');
  await h.captura('academia-computadora.png');

  h.paso('2. Filtros');
  await p.fill('#acBuscar', 'carla');
  check((await filas()).join() === 'a3', 'por nombre');
  await p.fill('#acBuscar', '0002');
  check((await filas()).join() === 'a2', 'por teléfono');
  await p.fill('#acBuscar', 'mama de');
  check((await filas()).join() === 'a2', 'por el nombre que tiene en el Hub');
  await p.fill('#acBuscar', '');
  await p.selectOption('#acPagos', 'debe');
  check((await filas()).join() === 'a2', 'con pagos que dicen "debe"');
  await p.selectOption('#acPagos', 'sin');
  check((await filas()).join() === 'a4', 'sin pagos');
  await p.selectOption('#acPagos', '');
  await p.click('[data-ac-filtro="revisar"]');
  check((await filas()).join() === 'a2,a4', 'chip "A revisar"');
  await p.click('[data-ac-filtro="todas"]');

  h.paso('3. Ficha: contacto, pagos, revisar');
  await elegir('a2');
  const det = await txt('#acDetalle');
  check(det.includes('Bety Prueba Dos') && det.includes('0000000002'), 'nombre y teléfono');
  check(det.includes('En el Hub se llama') && det.includes('Mamá De Bety'), 'avisa que en el Hub tiene otro nombre');
  check((await p.$$('#acDetalle .ac-mes')).length === 2 && (await p.$$('#acDetalle .ac-mes.debe')).length === 1, 'pinta sus 2 pagos, uno "debe"');
  check(await p.isVisible('[data-ac-acc="whats"]') && await p.isVisible('[data-ac-acc="contacto"]'), 'WhatsApp y datos de contacto');
  await p.click('[data-ac-acc="revisado"]'); await p.waitForTimeout(150);
  const rev = (await h.ops('academia_alumnas', 'update')).pop();
  check(rev && rev.revisar === null && rev.actualizado_por === 'u3', '"Ya lo revisé" limpia la marca');
  check(await chip('revisar') === '1', 'baja el conteo de "A revisar"');
  check((await h.ops('actividad_usuario', 'insert')).some(x => x.accion === 'academia_revisado'), 'queda en Actividad');

  h.paso('4. Decisión y notas');
  await p.click('[data-ac-decision="se_gradua"]'); await p.waitForTimeout(150);
  const dec = (await h.ops('academia_alumnas', 'update')).pop();
  check(dec && dec.decision === 'se_gradua', 'guarda la decisión');
  check(await chip('se_gradua') === '1', 'aparece el chip "Se gradúa"');
  check((await p.$$('[data-ac-decision="se_gradua"].on')).length === 1, 'botón marcado');
  check((await h.ops('actividad_usuario', 'insert')).some(x => x.accion === 'academia_decision' && x.detalle.includes('Se gradúa')), 'actividad con antes → después');
  await p.fill('#acNotas', 'Va con su mamá');
  await p.click('#acDetalle h3'); await p.waitForTimeout(150);
  check((await h.ops('academia_alumnas', 'update')).pop()?.notas === 'Va con su mamá', 'la nota se guarda al salir del campo');
  check((await txt('#acNotasEstado')).includes('Guardado'), 'dice "Guardado"');

  h.paso('5. Datos privados');
  await elegir('a1');
  check(!(await txt('#acDetalle')).includes('XXXX000000'), 'la CURP no se ve hasta pedirla');
  await p.click('[data-ac-acc="privados"]'); await p.waitForTimeout(150);
  const priv = await txt('#acDetalle');
  check(priv.includes('XXXX000000XXXXXX00') && priv.includes('Calle Inventada 123') && priv.includes('Tener mi pastelería'), 'muestra CURP, dirección y encuesta');

  h.paso('6. Registrar y corregir pagos');
  await p.fill('#acPagoMonto', '580');
  await p.fill('#acPagoNota', 'mensualidad septiembre');
  await p.click('[data-ac-acc="pago"]');
  await confirmar();
  const nuevo = (await h.ops('academia_pagos', 'insert')).pop();
  check(nuevo && nuevo.alumna_id === 'a1' && nuevo.monto === 580 && nuevo.origen === 'hub' && nuevo.estado === 'pagado' && nuevo.registrado_por === 'u3', 'inserta el pago como origen hub');
  check((await p.$$('#acDetalle .ac-mes')).length === 4 && (await p.$$('#acDetalle .ac-mes.hub')).length === 1, 'aparece en la ficha');
  check((await txt('#acBody tr[data-ac-id="a1"]')).includes('4 pagados') && (await txt('#acBody tr[data-ac-id="a1"]')).includes('$2,320'), 'se actualiza la lista');
  check((await h.ops('actividad_usuario', 'insert')).some(x => x.accion === 'academia_pago'), 'actividad del pago');
  await p.fill('#acPagoMonto', '');
  await p.click('[data-ac-acc="pago"]'); await p.waitForTimeout(100);
  check(!(await p.isVisible('#modalConfirmar.open')) && (await h.ops('academia_pagos', 'insert')).length === 1, 'sin monto no registra');
  await elegir('a3');
  await p.click('[data-ac-pago="x6"]'); await p.waitForTimeout(80);
  check((await txt('#acDetalle')).includes('$60026 MARZO'), 'muestra el texto original de la celda');
  await p.fill('#acCorrMonto', '600');
  await p.selectOption('#acCorrEstado', 'pagado');
  await p.click('[data-ac-acc="corregir"]'); await p.waitForTimeout(150);
  const corr = (await h.ops('academia_pagos', 'update')).pop();
  check(corr && corr.monto === 600 && corr.estado === 'pagado', 'guarda la corrección');
  check(!(await txt('#acBody tr[data-ac-id="a3"]')).includes('por revisar'), 'ya no sale "por revisar"');

  h.paso('7. Error de la base');
  await h.fallar(op => op.tabla === 'academia_alumnas' && op.tipo === 'update');
  await p.click('[data-ac-decision="no_quiere"]'); await p.waitForTimeout(150);
  check((await p.$$('[data-ac-decision="kit"].on')).length === 1, 'si falla, la decisión no cambia');
  await h.fallar(null);

  h.paso('8. Todas las generaciones');
  await p.selectOption('#acGen', ''); await p.waitForTimeout(250);
  check((await filas()).length === 5 && (await txt('#acBody')).includes('2ª generación'), 'lista las 5 con su generación');

  h.paso('9. Sin permiso de cobrar');
  await abrir({ id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false }, {});
  await elegir('a1');
  check(!(await p.$('#acPagoMonto')) && (await p.$$('#acDetalle .ac-mes')).length === 3, 've los pagos pero no puede registrar');
  await p.click('[data-ac-pago="x1"]'); await p.waitForTimeout(80);
  check(!(await p.$('#acCorrMonto')), 'tampoco puede corregir');

  h.paso('10. Otros roles no ven la sección');
  await p.evaluate(() => { usuarioActual = { id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false }; PERMISOS_ROL_CACHE = {}; aplicarPermisosNav(); });
  check(!(await p.isVisible('#desktopNav [data-view="academia"]')), 'Ventas no la ve en el menú');
  await p.evaluate(() => { usuarioActual = { id:'u9', nombre:'Admin', rol:'Ventas', es_admin:true }; aplicarPermisosNav(); });
  check(await p.isVisible('#desktopNav [data-view="academia"]'), 'un admin sí la ve');

  h.paso('11. Celular');
  await abrir();
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(150);
  await h.captura('academia-celular.png');
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  check(ancho <= 392, 'sin scroll horizontal en celular: ' + ancho);
  await elegir('a1');
  await p.evaluate(() => document.getElementById('acDetalle').scrollIntoView());
  await h.captura('academia-celular-ficha.png');

  await h.terminar();
})();
