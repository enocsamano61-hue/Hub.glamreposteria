/* Academia → Alumnas: el estado del kit de cada alumna junto a su decisión (pedido del 28 oct 2026), con el mismo
   nombre y color que su columna en Kits (misma regla: estadoKit). Si tiene dos kits, el más reciente que no esté
   cancelado y "+1"; si decidió kit y no tiene tarjeta, "Sin tarjeta". En su panel, "Ver en Kits" abre su tarjeta.
   Datos inventados. */
const { abrirHub } = require('./arnes');

const A = (id, nombre, decision) => ({ id, generacion_id:'g1', persona_id:null, hoja:'1ER GEN', fila:Number(id.replace(/\D/g, '')) + 2, seccion_excel:null,
  matricula:null, nombre, telefono:'000000000' + id.replace(/\D/g, ''), sin_telefono:false, telefono_2:null, ciudad_texto:'Ciudad Prueba', vendedor_texto:null,
  graduacion_excel:null, comentario_excel:null, decision, notas:null, revisar:null, personas:null });
const K = (id, alumna, extra) => ({ id, graduacion_id:null, alumna_id:alumna, clave_origen:'hub:' + id, fila:null, nombre:'KIT ' + id, telefono:null,
  generacion_texto:null, direccion:null, anticipo_texto:null, filipina_texto:null, pago_texto:null, envio_texto:null, situacion_filipina:null,
  estado:'por_pagar', guia:null, paqueteria:null, enviado_en:null, entregado_en:null, precio:1890, envio_costo:null, esperando_envio:false, cantidad:1,
  filipina_talla:'M', filipina_color:'negra', filipina_nombre:null, notas:null, creado_en:'2026-10-01T10:00:00Z',
  academia_alumnas:{ id:alumna, nombre:'ALUMNA', generacion_id:'g1', persona_id:null, telefono:null, ciudad_texto:'Ciudad Prueba' }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{
      academia_generaciones:[{ id:'g1', clave:'gen1', nombre:'1ª generación', hoja:'1ER GEN', orden:1 }],
      academia_alumnas:[
        A('a1', 'ANA POR PAGAR', 'kit'), A('a2', 'BETY ENVIO', 'kit'), A('a3', 'CARLA GRADUADA', 'graduada'),
        A('a4', 'DORA SIN TARJETA', 'kit'), A('a5', 'ELENA DOS KITS', 'kit'), A('a6', 'FER SIN KIT', 'por_contactar'),
        A('a7', '<img src=x onerror="window.__xss=1">', 'kit') ],
      academia_pagos_resumen:[], academia_pagos:[],
      academia_kits:[
        K('k1', 'a1'),
        K('k2', 'a2', { estado:'por_preparar', esperando_envio:true }),
        K('k3', 'a3', { estado:'entregado' }),
        K('k5a', 'a5', { estado:'cancelado', creado_en:'2026-10-20T10:00:00Z' }),
        K('k5b', 'a5', { estado:'enviado', creado_en:'2026-10-10T10:00:00Z' }),
        K('k5c', 'a5', { estado:'por_preparar', creado_en:'2026-10-05T10:00:00Z' }),
        K('k7', 'a7', { estado:'por_clasificar' }) ],
      academia_kit_pagos:[], academia_graduaciones:[], academia_graduacion_asistentes:[], academia_graduacion_pagos:[],
      precios:[{ id:'pk', nombre:'Kit a domicilio', clave:'kit_academia', precio:1890, activo:true, orden:3, area:'academia', descripcion:null }],
      mensajes_predeterminados:[] },
    usuario:{ id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false },
    equipo:[{ id:'u3', nombre:'Academia Prueba', es_vendedor:false, rol:'Academia e Inbox' }] });
  const { p, check } = h;
  await p.evaluate(() => { PERMISOS_ROL_CACHE = {}; PERMISOS_ACCION_CACHE = {}; aplicarPermisosNav(); setActiveSection('academia'); });
  await p.waitForTimeout(500);
  const decision = id => p.textContent(`[data-ac-id="${id}"] td:last-child`);
  const color = id => p.$eval(`[data-ac-id="${id}"] .ac-kit`, x => x.style.getPropertyValue('--k-color'));

  h.paso('1. En la lista, junto a la decisión, el estado de su kit');
  check((await decision('a1')).includes('Kit') && (await decision('a1')).includes('Por pagar'), 'decidió kit y su kit va en Por pagar');
  check(await color('a1') === '#B56F55', 'con el color de su columna en Kits');
  check((await decision('a2')).includes('Por pagar envío') && await color('a2') === '#8E5BB5', 'Por pagar envío (misma regla que el tablero)');
  check((await decision('a3')).includes('Graduada') && (await decision('a3')).includes('Kit: Entregado'), 'otra decisión con kit: "Kit: Entregado"');
  check((await decision('a4')).includes('Sin tarjeta'), 'decidió kit sin tarjeta: "Sin tarjeta"');
  check((await decision('a5')).includes('Enviado +1') && !(await decision('a5')).includes('Cancelado'), 'dos kits: el más reciente que no está cancelado, "+1"');
  check(!(await p.$(`[data-ac-id="a6"] .ac-kit`)), 'sin kit ni decisión de kit: nada');
  check((await decision('a7')).includes('Por clasificar') && !(await p.evaluate(() => window.__xss)), 'por clasificar; nombres escapados');
  await h.captura('academia-kit-estado.png');

  h.paso('2. En su panel, con "Ver en Kits"');
  await p.click('[data-ac-id="a2"]');
  await p.waitForTimeout(200);
  const panel = await p.textContent('#acDetalle');
  check(panel.includes('Su kit:') && panel.includes('Por pagar envío'), 'el panel dice cómo va su kit');
  await p.click('#acDetalle [data-ac-acc="verkit"]');
  await p.waitForTimeout(600);
  check(await p.isVisible('#acPanelKits') && await p.evaluate(() => kk.sel === 'k2') && await p.$eval('[data-k-id="k2"]', x => x.classList.contains('sel')), 'abre Kits con su tarjeta elegida');

  h.paso('3. Al moverla en Kits, la lista lo dice al volver (sin guardar copias)');
  await p.evaluate(() => { window.__tablas.academia_kits.find(x => x.id === 'k2').estado = 'entregado'; window.__tablas.academia_kits.find(x => x.id === 'k2').esperando_envio = false; });
  await p.click('[data-ac-tab="alumnas"]');
  await p.waitForTimeout(500);
  check((await decision('a2')).includes('Entregado'), 'la lista lee el estado de hoy');

  h.paso('4. Celular');
  await p.setViewportSize({ width:390, height:800 });
  // Sin la alumna del nombre raro (una sola palabra larguísima, solo para revisar que se escapa)
  await p.evaluate(() => { ac.filas = ac.filas.filter(a => a.id !== 'a7'); pintarAcademia(); });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('academia-kit-estado-celular.png');

  await h.terminar();
})();
