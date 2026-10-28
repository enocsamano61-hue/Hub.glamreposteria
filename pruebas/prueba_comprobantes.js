/* Comprobantes de pago (28 oct 2026, opcionales): se suben al registrar el pago de un lead (o después, en su lead),
   a cualquier pago de la ficha de la inscrita, y Cobranza los ve en "Por confirmar". Bucket privado: se abren con un
   enlace que caduca. Que pasen del lead al pago al confirmar y "no se encontró" lo hace la base (probado aparte).
   El almacenamiento se simula; datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
// Una imagen PNG de 1x1 y un texto (tipo no permitido)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const persona = (id, nombre) => ({ id, nombre, telefono_principal:'55000000' + id.slice(-2), telefono_alternativo:null });
const ev = { id:'ev1', fecha:mas(60), curso_id:'cur1', sede:'Salón', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad Prueba' } };
const lead = (id, pid, nombre, extra) => ({ id, persona_id:pid, evento_id:'ev1', ciudad_interes_id:'cA', paquete:'BASICO', asesor_id:'u2', creado_en:new Date().toISOString(),
  estatus:{ id:2 }, estatus_id:2, comentario:null, personas:persona(pid, nombre), eventos:ev, ciudades:{ nombre:'Ciudad Prueba' }, ...extra });
const reportado = { estatus:{ id:1 }, estatus_id:1, pago_reportado_monto:700, pago_reportado_fecha:HOY, pago_reportado_banco:'BBVA', pago_reportado_por:'u2', pago_reportado_en:new Date().toISOString() };

(async () => {
  const h = await abrirHub({ tablas:{
      leads:[lead('l2', 'p02', 'Lead Con Comprobante', reportado)],
      comprobantes:[{ id:'c1', ruta:'2026-10/uno.jpg', estado:'vigente', lead_id:'l2', pago_id:null, inscripcion_id:null }],
      inscripciones:[{ id:'i1', persona_id:'p01', evento_id:'ev1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
        asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:mas(5), personas:persona('p01', 'Inscrita Uno'), eventos:ev,
        pagos:[{ id:'pg1', monto:700, fecha:HOY, verificacion:'por_confirmar', banco:'BBVA' }] }],
      pagos:[], interacciones:[] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(([l1, hoy]) => {
    window.__subidas = []; window.__abiertas = [];
    Object.defineProperty(sb, 'storage', { configurable:true, value:{ from: bucket => ({
      upload: async (ruta, archivo, op) => { window.__subidas.push({ bucket, ruta, tipo:op.contentType, tamano:archivo.size }); return { data:{ path:ruta }, error:null }; },
      createSignedUrl: async (ruta, seg) => ({ data:{ signedUrl:'https://firmado.prueba/' + bucket + '/' + ruta + '?seg=' + seg }, error:null }),
    }) } });
    window.open = () => { const w = { location:'', close(){} }; window.__abiertas.push(w); return w; };
    EVENTOS_CAL.push({ id:'ev1', fecha:hoy, curso_id:'cur1', ciudad_id:'cA', ciudades:{ nombre:'Ciudad Prueba' }, sede:'Salón' });
    leadsCache.push(l1, window.__tablas.leads[0]);
    window.renderBoard = async () => {};
  }, [lead('l1', 'p01b', 'Lead Nueva'), mas(60)]);

  h.paso('1. Registrar pago con su comprobante');
  await p.evaluate(() => { leadAbiertoId = 'l1'; abrirRegistrarPago(); });
  await p.waitForSelector('#modalRegistrarPago.open');
  await p.selectOption('#regPagoEvento', 'ev1').catch(() => {});
  await p.fill('#regPagoBanco', 'BBVA');
  await p.setInputFiles('#regPagoComprobante', { name:'captura.png', mimeType:'image/png', buffer:PNG });
  await h.captura('comprobantes-registrar-pago.png');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForFunction(() => !document.getElementById('modalRegistrarPago').classList.contains('open'), null, { timeout:15000 });
  const sub = await p.evaluate(() => window.__subidas[0]);
  const comp = (await h.ops('comprobantes', 'insert'))[0];
  check(sub && sub.bucket === 'comprobantes' && /^\d{4}-\d{2}\/.+\.(png|jpg)$/.test(sub.ruta), 'se sube al bucket privado "comprobantes" (' + JSON.stringify(sub) + ')');
  check(comp && comp.lead_id === 'l1' && comp.persona_id === 'p01b' && comp.ruta === sub.ruta && /^[0-9a-f]{64}$/.test(comp.huella || ''),
        'queda ligado a su lead, con la huella del archivo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'comprobante_subido'), 'y en la actividad');

  h.paso('2. En el lead: verlo (enlace que caduca) o adjuntar otro');
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open'); return abrirModalLead('l2'); });
  await p.waitForTimeout(600);
  check(await p.isVisible('#leadPagoReportado [data-comp-ver="2026-10/uno.jpg"]') && await p.isVisible('#leadPagoReportado [data-comp-subir-lead]'), '"Ver comprobante" y "Adjuntar comprobante"');
  await h.captura('comprobantes-lead.png');
  await p.click('#leadPagoReportado [data-comp-ver]');
  await p.waitForTimeout(300);
  const ab = await p.evaluate(() => window.__abiertas.at(-1)?.location);
  check(String(ab).startsWith('https://firmado.prueba/comprobantes/2026-10/uno.jpg') && String(ab).includes('seg=300'), 'se abre con un enlace firmado de 5 minutos');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('3. En la ficha: adjuntar el comprobante de un pago');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(600);
  await p.evaluate(() => { document.querySelector('#fichaPagos details').open = true; });
  check(await p.isVisible('#fichaPagos [data-fp-comp-subir="pg1"]'), 'cada pago tiene "Adjuntar comprobante"');
  await h.limpiarOps();
  const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('#fichaPagos [data-fp-comp-subir="pg1"]')]);
  await chooser.setFiles({ name:'pago.png', mimeType:'image/png', buffer:PNG });
  await p.waitForFunction(() => window.__ops.some(o => o.tabla === 'comprobantes' && o.tipo === 'insert'), null, { timeout:15000 });
  const c2 = (await h.ops('comprobantes', 'insert'))[0];
  check(c2 && c2.pago_id === 'pg1' && c2.inscripcion_id === 'i1', 'queda ligado a ese pago');
  await p.evaluate(() => { window.__tablas.comprobantes.push({ id:'c9', ruta:'2026-10/pago.jpg', estado:'vigente', inscripcion_id:'i1', pago_id:'pg1' }); return cargarComprobantesFicha('i1'); });
  await p.waitForTimeout(300);
  check(await p.isVisible('#fichaPagos [data-comp-ver="2026-10/pago.jpg"]'), 'y ya se puede ver desde la ficha');
  await h.captura('comprobantes-ficha.png');

  h.paso('4. Solo fotos o PDF');
  await h.limpiarOps();
  const [ch2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#fichaPagos [data-fp-comp-subir="pg1"]')]);
  await ch2.setFiles({ name:'nota.txt', mimeType:'text/plain', buffer:Buffer.from('hola') });
  await p.waitForTimeout(400);
  check((await h.ops('comprobantes', 'insert')).length === 0 && (await p.textContent('#toast')).includes('foto (JPG o PNG) o PDF'), 'otro tipo de archivo no se sube');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('5. Cobranza: "Comprobante" en lo que está por confirmar');
  await p.evaluate(async () => { cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA']; setActiveSection('cobranza'); await renderCobranza(); });
  await p.waitForTimeout(500);
  check(await p.isVisible('#cobG-confirmar .cob-fila[data-cob-id="l2"] [data-cob-comp]') && await p.isVisible('#cobG-confirmar .cob-fila[data-cob-id="i1"] [data-cob-comp]'),
        'el lead y la inscrita con pago por confirmar tienen su botón');
  await p.click('#cobG-confirmar .cob-fila[data-cob-id="l2"] [data-cob-comp]');
  await p.waitForTimeout(300);
  check(String(await p.evaluate(() => window.__abiertas.at(-1)?.location)).includes('2026-10/uno.jpg'), 'y abre el suyo');
  await h.captura('comprobantes-cobranza.png');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('comprobantes-celular.png');

  await h.terminar();
})();
