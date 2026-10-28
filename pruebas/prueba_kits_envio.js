/* Kits: "Por pagar envío" (28 oct 2026, pedido de Tamar). Por pagar → Por preparar → Por pagar envío → Enviado →
   Entregado. El envío se cobra después de preparar: al pagar el kit (aunque falte el envío) pasa solo a "Por preparar";
   en "Por pagar envío" la tarjeta dice cuánto falta del envío o "Envío pagado · ya se puede enviar"; enviar sin pagar
   el envío pregunta antes. Se guarda como marca del kit (esperando_envio). Datos inventados. */
const { abrirHub } = require('./arnes');

const K = (id, extra) => ({ id, graduacion_id:null, alumna_id:null, clave_origen:'hub:' + id, fila:null, nombre:'', telefono:'0000000009', generacion_texto:null,
  direccion:null, anticipo_texto:null, filipina_texto:null, pago_texto:null, envio_texto:null, situacion_filipina:null, estado:'por_pagar',
  guia:null, paqueteria:null, enviado_en:null, entregado_en:null, precio:1890, envio_costo:null, esperando_envio:false, cantidad:1, filipina_talla:'M',
  filipina_color:'negra', filipina_nombre:null, notas:null, academia_alumnas:null, ...extra });
const TABLAS = () => ({
  academia_generaciones:[{ id:'g1', clave:'gen1', nombre:'1ª generación', hoja:'1ER GEN', orden:1 }], academia_alumnas:[], academia_graduaciones:[],
  academia_kits:[
    K('k1', { nombre:'KIT POR PAGAR', envio_costo:350 }),
    K('k2', { nombre:'KIT LISTO SIN ENVIO', estado:'por_preparar', esperando_envio:true, envio_costo:null, guia:'GUIA-1' }),
    K('k3', { nombre:'KIT ENVIO PENDIENTE', estado:'por_preparar', esperando_envio:true, envio_costo:300, guia:'GUIA-2' }),
  ],
  academia_kit_pagos:[
    { id:'kp2', kit_id:'k2', concepto:'kit', monto:1890, forma:'Transferencia', fecha:'2026-10-05', creado_en:'2026-10-05T10:00:00Z' },
    { id:'kp3', kit_id:'k3', concepto:'kit', monto:1890, forma:'Transferencia', fecha:'2026-10-05', creado_en:'2026-10-05T10:00:00Z' },
  ],
  academia_graduacion_asistentes:[], academia_graduacion_pagos:[],
  precios:[{ id:'pk', nombre:'Kit a domicilio', clave:'kit_academia', precio:1890, activo:true, orden:3, area:'academia', descripcion:null }],
  mensajes_predeterminados:[],
});

(async () => {
  const h = await abrirHub({ tablas:TABLAS(), usuario:{ id:'u3', nombre:'Academia Prueba', rol:'Academia e Inbox', es_admin:false },
    equipo:[{ id:'u3', nombre:'Academia Prueba', es_vendedor:false, rol:'Academia e Inbox' }] });
  const { p, check } = h;
  await p.evaluate(() => {
    PERMISOS_ROL_CACHE = {}; PERMISOS_ACCION_CACHE = { 'Academia e Inbox':new Set(['cobrar_academia']) };
    kk = { filas:[], pagos:new Map(), sel:null, todas:null }; aplicarPermisosNav(); setActiveSection('academia');
  });
  await p.waitForTimeout(200);
  await p.click('[data-ac-tab="kits"]');
  await p.waitForTimeout(400);
  const col = nombre => p.$$eval('#kTablero .k-col', (cols, n) => {
    const c = cols.find(x => x.querySelector('.k-col-cab').textContent.replace(/\d+$/, '').trim() === n);
    return c ? [...c.querySelectorAll('[data-k-id]')].map(b => b.dataset.kId).join() : null; }, nombre);
  const tarjeta = id => p.textContent(`[data-k-id="${id}"]`);
  const elegir = async id => { await p.click(`[data-k-id="${id}"]`); await p.waitForTimeout(150); };

  h.paso('1. La columna nueva, entre Por preparar y Enviado');
  const cols = await p.$$eval('#kTablero .k-col-cab', xs => xs.map(x => x.textContent.replace(/\d+$/, '').trim()));
  check(cols.indexOf('Por pagar envío') === cols.indexOf('Por preparar') + 1 && cols.indexOf('Enviado') === cols.indexOf('Por pagar envío') + 1, 'orden: ' + cols.join(' → '));
  check((await col('Por pagar envío')).split(',').sort().join() === 'k2,k3' && await col('Por preparar') === '', 'los kits marcados salen ahí');
  check((await tarjeta('k2')).includes('Falta el costo del envío') && (await tarjeta('k3')).includes('Envío: debe $300'), 'la tarjeta dice qué falta del envío');
  await h.captura('kits-por-pagar-envio.png');

  h.paso('2. Pagar el kit (sin el envío) lo pasa a "Por preparar"');
  await elegir('k1');
  await p.selectOption('#kPagoConcepto', 'kit'); await p.fill('#kPagoMonto', '1890');
  await p.click('[data-k-acc="pago"]'); await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(400);
  check(await col('Por preparar') === 'k1', 'aunque falten los $350 del envío');

  h.paso('3. Moverlo a "Por pagar envío"');
  await h.limpiarOps();
  await p.click('#kDetalle [data-k-estado="por_pagar_envio"]'); await p.waitForTimeout(300);
  const up = (await h.ops('academia_kits', 'update')).pop();
  check(up && up.estado === 'por_preparar' && up.esperando_envio === true, 'se guarda como "Por preparar" con la marca (' + JSON.stringify(up) + ')');
  check((await col('Por pagar envío')).split(',').includes('k1') && (await tarjeta('k1')).includes('Envío: debe $350'), 'y sale en la columna con lo que debe del envío');
  check(await p.$eval('#kPagoConcepto', s => s.value) === 'envio', 'el pago se propone como "Envío"');

  h.paso('4. Pagar el envío');
  await p.fill('#kPagoMonto', '350');
  await p.click('[data-k-acc="pago"]'); await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(400);
  check((await tarjeta('k1')).includes('Envío pagado · ya se puede enviar') && (await p.textContent('#toast')).includes('ya se puede enviar'), '"Envío pagado · ya se puede enviar"');

  h.paso('5. Enviar sin pagar el envío pregunta antes');
  await elegir('k3');
  await h.limpiarOps();
  await p.click('#kDetalle [data-k-estado="enviado"]');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('Falta pagar el envío') && (await p.textContent('#modalConfirmar')).includes('$300'), 'avisa cuánto falta');
  await h.captura('kits-enviar-sin-pagar.png');
  await p.click('#confirmarNo').catch(async () => p.evaluate(() => document.getElementById('modalConfirmar').classList.remove('open')));
  await p.waitForTimeout(300);
  check((await h.ops('academia_kits', 'update')).length === 0, 'si se cancela, no cambia');
  await p.evaluate(() => document.getElementById('modalConfirmar').classList.remove('open'));
  await p.click('#kDetalle [data-k-estado="enviado"]');
  await p.waitForSelector('#modalConfirmar.open'); await p.click('#confirmarSi'); await p.waitForTimeout(400);
  const env = (await h.ops('academia_kits', 'update')).find(u => u.estado === 'enviado');
  check(env && env.esperando_envio === false, 'si se confirma, pasa a Enviado y se quita la marca');
  await p.evaluate(() => document.getElementById('modalConfirmar').classList.remove('open'));

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('kits-por-pagar-envio-celular.png');

  await h.terminar();
})();
