/* Academia (fase 3, pestaña Kits): tablero por estado, kits del Excel por clasificar,
   cuenta (precio editable + envío − abonos), liquidar → "Por preparar" solo,
   enviado con guía y WhatsApp con {guia}, entregado, cancelar/reactivar,
   crear kit, precio y "qué incluye" del catálogo, "Kit" desde Alumnas y
   filipinas de kits en Graduación. Datos inventados. */
const { abrirHub } = require('./arnes');

const GENS = [{ id:'g1', clave:'gen1', nombre:'1ª generación', hoja:'1ER GEN', orden:1 }];
const AL = (id, nombre, tel, decision) => ({ id, generacion_id:'g1', persona_id:'p-' + id, nombre, telefono:tel, decision, hoja:'1ER GEN', fila:3, ciudad_texto:'Ciudad Prueba',
  personas:{ id:'p-' + id, nombre, telefono_principal:tel } });
const ALREL = a => ({ id:a.id, nombre:a.nombre, generacion_id:'g1', persona_id:a.persona_id, telefono:a.telefono, ciudad_texto:'Ciudad Prueba' });
const ALUMNAS = [AL('a1', 'ANA PRUEBA UNO', '0000000001', 'kit'), AL('a2', 'BETY PRUEBA DOS', '0000000002', 'kit'), AL('a3', 'CARLA PRUEBA TRES', '0000000003', 'por_contactar')];
const K = (id, extra) => ({ id, graduacion_id:'gr26', alumna_id:null, clave_origen:'hub:' + id, fila:null, nombre:'', telefono:null, generacion_texto:null,
  direccion:null, anticipo_texto:null, filipina_texto:null, pago_texto:null, envio_texto:null, situacion_filipina:null, estado:'por_pagar',
  guia:null, paqueteria:null, enviado_en:null, entregado_en:null, precio:null, envio_costo:null, cantidad:1, filipina_talla:null,
  filipina_color:null, filipina_nombre:null, notas:null, academia_alumnas:null, ...extra });
const base = () => ({
  academia_generaciones: GENS,
  academia_alumnas: ALUMNAS.map(a => ({ ...a })),
  academia_graduaciones: [{ id:'gr27', clave:'2027-08', nombre:'Graduación agosto 2027', fecha_inicio:'2027-08-03', precio_alumna:3115, precio_acompanante:1505, conceptos:[], estado:'proxima' }],
  academia_kits: [
    K('k1', { alumna_id:'a1', clave_origen:'0000000001', fila:104, nombre:'ANA PRUEBA UNO', telefono:'0000000001', generacion_texto:'1', estado:'por_clasificar',
      direccion:'Calle Inventada 1', anticipo_texto:'LIQUIDO HEY', filipina_texto:'Blanca XXL', pago_texto:'LIQUIDADO', envio_texto:'790 pagado',
      situacion_filipina:'PEDIR BLANCA XL', academia_alumnas:ALREL(ALUMNAS[0]) }),
    K('k2', { alumna_id:'a2', nombre:'BETY PRUEBA DOS', telefono:'0000000002', precio:1890, envio_costo:550, filipina_talla:'M', filipina_color:'negra',
      academia_alumnas:ALREL(ALUMNAS[1]) }),
    K('k3', { nombre:'DORA ENVIADA', telefono:'0000000004', estado:'enviado', guia:'GUIA-123', paqueteria:'Paquetería X', enviado_en:'2026-10-01', precio:1890 }),
  ],
  academia_kit_pagos: [{ id:'kp1', kit_id:'k2', concepto:'kit', monto:1000, forma:'Transferencia', fecha:'2026-10-05', creado_en:'2026-10-05T10:00:00Z' }],
  academia_graduacion_asistentes: [],
  academia_graduacion_pagos: [],
  precios: [
    { id:'pk', nombre:'Kit a domicilio', clave:'kit_academia', precio:1890, activo:true, orden:3, area:'academia', descripcion:'Filipina bordada y gorro' },
    { id:'pu', nombre:'Uniforme', clave:null, precio:null, activo:true, orden:2, area:'gira', descripcion:null },
  ],
  mensajes_predeterminados: [{ id:'m1', usuario_id:'u3', titulo:'Guía del kit', texto:'Hola {nombre}, tu kit va por {paqueteria} con guía {guia}.', compartido:true, foto_url:null }],
});
const ACADEMIA = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false };

(async () => {
  const h = await abrirHub({ tablas:base(), usuario:ACADEMIA, equipo:[{ id:'u3', nombre:'Academia Prueba', es_vendedor:false, rol:'Academia e Inbox' }] });
  const { p, check } = h;
  const txt = s => p.textContent(s);
  const col = async id => p.$$eval(`#kTablero .k-col`, (cols, id) => {
    const c = cols.find(x => x.querySelector('.k-col-cab').textContent.includes(id)); return c ? [...c.querySelectorAll('[data-k-id]')].map(b => b.dataset.kId).join() : null; }, id);
  const elegir = async id => { await p.click(`[data-k-id="${id}"]`); await p.waitForTimeout(100); };
  const confirmar = async () => { await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(200); };
  const ultimo = async (tabla, tipo) => (await h.ops(tabla, tipo)).pop();
  const abrir = async (permisos = ['cobrar_academia']) => {
    await p.evaluate(([t, pa]) => {
      window.__tablas = t; window.__ops = []; PRECIOS = null; MENSAJES = null;
      usuarioActual = { id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false }; PERMISOS_ROL_CACHE = {};
      PERMISOS_ACCION_CACHE = { 'Academia e Inbox':new Set(pa) };
      ac = { tab:'alumnas', generaciones:null, gen:null, filas:[], resumen:new Map(), filtro:'todas', sel:null, pagosDe:null, pagos:null, pagoSel:null, privados:null, limite:AC_POR_PAGINA };
      ag = { grads:null, grad:null, filas:[], pagos:new Map(), sel:null, filtro:'todas', todas:null, kitsPend:[] };
      kk = { filas:[], pagos:new Map(), sel:null, todas:null };
      aplicarPermisosNav();
    }, [base(), permisos]);
    await p.evaluate(() => setActiveSection('academia'));
    await p.waitForTimeout(200);
    await p.click('[data-ac-tab="kits"]');
    await p.waitForTimeout(300);
  };

  h.paso('1. Tablero');
  await abrir();
  check(await p.isVisible('#acPanelKits') && !(await p.isVisible('#acPanelGraduacion')), 'cambia a la pestaña Kits');
  check(await col('por clasificar') === 'k1' && await col('Por pagar') === 'k2' && await col('Por preparar') === '' && await col('Enviado') === 'k3' && await col('Entregado') === '',
    'columnas: ' + await txt('#kTablero'));
  check(await col('Cancelados') === null, 'sin cancelados no sale esa columna');
  check((await txt('[data-k-id="k1"]')).includes('PEDIR BLANCA XL') && (await txt('[data-k-id="k2"]')).includes('Debe $1,440') && (await txt('[data-k-id="k3"]')).includes('GUIA-123'), 'tarjetas con aviso, deuda y guía');
  check((await p.$eval('[data-k-cat="precio"]', i => i.value)) === '1890' && (await p.$eval('[data-k-cat="descripcion"]', i => i.value)).includes('gorro'), 'precio y "qué incluye" del catálogo');
  check((await h.ops('academia_kits', 'update')).length === 0, 'abrir no cambia nada');
  await h.captura('kits-computadora.png');

  h.paso('2. Clasificar un kit del Excel');
  await elegir('k1');
  check((await txt('#kDetalle')).includes('Lo que decía el Excel') && (await txt('#kDetalle')).includes('790 pagado'), 'muestra lo del Excel');
  await p.click('[data-k-estado="entregado"]'); await p.waitForTimeout(150);
  const cl = await ultimo('academia_kits', 'update');
  check(cl && cl.estado === 'entregado' && cl.entregado_en, 'pasa a Entregado con fecha');
  check(await col('por clasificar') === null && await col('Entregado') === 'k1', 'se mueve de columna');

  h.paso('3. Cobro: liquidar pasa solo a "Por preparar"');
  await elegir('k2');
  check((await txt('#kDetalle')).includes('$2,440') && (await txt('#kDetalle')).includes('$1,440'), 'total kit + envío y lo que debe');
  await p.click('[data-k-acc="liquida"]');
  check((await p.$eval('#kPagoMonto', i => i.value)) === '1440', '"Liquida todo"');
  await p.click('[data-k-acc="pago"]');
  await confirmar();
  const pg = await ultimo('academia_kit_pagos', 'insert');
  check(pg && pg.kit_id === 'k2' && pg.monto === 1440 && pg.concepto === 'kit', 'registra el pago');
  check((await ultimo('academia_kits', 'update'))?.estado === 'por_preparar' && await col('Por preparar') === 'k2', 'liquidado → "Por preparar" solo');
  check((await h.ops('actividad_usuario', 'insert')).some(x => x.accion === 'academia_kit_pago'), 'actividad del pago');

  h.paso('4. Filipina, dirección y precio');
  await p.selectOption('[data-k-campo="filipina_talla"]', 'G'); await p.waitForTimeout(120);
  check((await ultimo('academia_kits', 'update'))?.filipina_talla === 'G', 'talla');
  await p.fill('[data-k-campo="cantidad"]', '2'); await p.click('#kDetalle h3'); await p.waitForTimeout(150);
  check((await ultimo('academia_kits', 'update'))?.cantidad === 2, 'cantidad');
  await p.fill('#kDireccion', 'Calle Nueva 99'); await p.click('#kDetalle h3'); await p.waitForTimeout(150);
  check((await ultimo('academia_kits', 'update'))?.direccion === 'Calle Nueva 99', 'dirección');
  await p.fill('[data-k-campo="precio"]', '1990'); await p.click('#kDetalle h3'); await p.waitForTimeout(150);
  check((await ultimo('academia_kits', 'update'))?.precio === 1990 && (await txt('#kDetalle')).includes('$2,540'), 'el precio del kit se puede ajustar (total $2,540)');

  h.paso('5. Enviado con guía y WhatsApp');
  const antes = (await h.ops('academia_kits', 'update')).length;
  await p.click('[data-k-estado="enviado"]'); await p.waitForTimeout(150);
  check((await h.ops('academia_kits', 'update')).length === antes, 'sin guía no lo marca enviado');
  await p.fill('[data-k-campo="paqueteria"]', 'Paquetería Y'); await p.click('#kDetalle h3'); await p.waitForTimeout(150);
  await p.fill('[data-k-campo="guia"]', 'GUIA-777'); await p.click('#kDetalle h3'); await p.waitForTimeout(150);
  await p.click('[data-k-estado="enviado"]'); await p.waitForTimeout(150);
  const env = await ultimo('academia_kits', 'update');
  check(env && env.estado === 'enviado' && env.enviado_en, 'pasa a Enviado con fecha');
  await confirmar();
  await p.waitForSelector('#modalWhats.open');
  const wa = await p.$eval('#waTexto', t => t.value);
  check(wa === 'Hola Bety, tu kit va por Paquetería Y con guía GUIA-777.', 'el WhatsApp lleva {guia} y {paqueteria}: ' + wa);
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));

  h.paso('6. Cancelar y reactivar');
  await elegir('k3');
  await p.click('[data-k-acc="cancelar"]');
  await confirmar();
  check((await ultimo('academia_kits', 'update'))?.estado === 'cancelado' && await col('Cancelados') === 'k3', 'cancelado (no se borra)');
  await p.click('[data-k-acc="reactivar"]'); await p.waitForTimeout(150);
  check((await ultimo('academia_kits', 'update'))?.estado === 'por_pagar', 'reactivado');
  check((await h.ops('academia_kits', 'delete')).length === 0, 'nunca se borra');

  h.paso('7. Crear kit y catálogo');
  await p.click('#kAgregarBtn'); await p.waitForTimeout(150);
  await p.fill('#kAgregarBuscar', 'ana'); await p.waitForTimeout(150);
  check(await p.$eval('[data-k-agregar="a1"]', b => b.disabled), 'quien ya tiene kit sale como "Ya tiene"');
  await p.fill('#kAgregarBuscar', 'carla'); await p.waitForTimeout(150);
  await p.click('[data-k-agregar="a3"]'); await p.waitForTimeout(300);
  const nuevo = await ultimo('academia_kits', 'insert');
  check(nuevo && nuevo.alumna_id === 'a3' && nuevo.clave_origen === 'hub:a3' && nuevo.precio === 1890 && nuevo.estado === 'por_pagar' && nuevo.graduacion_id === 'gr27', 'crea el kit con el precio del catálogo');
  check((await ultimo('academia_alumnas', 'update'))?.decision === 'kit', 'su decisión pasa a "Kit"');
  await p.fill('[data-k-cat="precio"]', '1950'); await p.click('#kTablero'); await p.waitForTimeout(150);
  check((await ultimo('precios', 'update'))?.precio === 1950, 'cambia el precio del catálogo');
  await p.fill('[data-k-cat="descripcion"]', 'Filipina bordada, gorro y certificado'); await p.click('#kTablero'); await p.waitForTimeout(150);
  check((await ultimo('precios', 'update'))?.descripcion === 'Filipina bordada, gorro y certificado', 'cambia "qué incluye"');

  h.paso('8. Sin permiso de cobrar');
  await abrir([]);
  await elegir('k2');
  check(!(await p.$('#kPagoMonto')) && (await txt('#kDetalle')).includes('Cobrar en Academia'), 've la cuenta pero no puede registrar pagos');

  h.paso('9. "Kit" desde Alumnas y filipinas en Graduación');
  await abrir();
  await p.click('[data-ac-tab="alumnas"]'); await p.waitForTimeout(250);
  await p.click('#acBody tr[data-ac-id="a3"]'); await p.waitForTimeout(150);
  await p.click('[data-ac-decision="kit"]'); await p.waitForTimeout(250);
  await confirmar();
  check((await ultimo('academia_kits', 'insert'))?.alumna_id === 'a3', 'al marcar "Kit" ofrece crearlo y lo crea');
  await p.click('[data-ac-tab="graduacion"]'); await p.waitForTimeout(300);
  check((await txt('#agResumenes')).includes('Incluye 1 kit') && (await p.$$eval('.ag-tallas .n', b => b.map(x => x.textContent).join())) === '1', 'Filipinas para comprar suma el kit pendiente (M negra)');

  h.paso('10. Celular');
  await abrir();
  await p.setViewportSize({ width:390, height:844 }); await p.waitForTimeout(150);
  await h.captura('kits-celular.png');
  check((await p.evaluate(() => document.documentElement.scrollWidth)) <= 392, 'sin scroll horizontal');
  await elegir('k2');
  await p.evaluate(() => document.getElementById('kDetalle').scrollIntoView());
  await h.captura('kits-celular-ficha.png');

  await h.terminar();
})();
