/* Lista de Cambio de fecha siempre al día (28 oct 2026, pedido de Jared): todas las del curso salen en la lista.
   "Nueva" = llegó con la fecha nueva (con todos los botones, también Registrar regalo; el equipo decide);
   "Viene de…" = la cambiaron de otro curso; el lead que ya pagó y se inscribió sale una sola vez, con las que pagaron;
   el lead con un pago reportado lo enseña. Antes de leer la lista se pide a la base que la ponga al día
   (cambio_fecha_sincronizar). Datos de ejemplo. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ANT = mas(-1), NUEVA = mas(90);
const fila = (id, extra) => ({ aviso_id:id, cambio_id:'c1', evento_id:'e1', ciudad:'Ciudad Prueba', sede:'Salón', fecha_anterior:ANT, fecha_nueva:NUEVA,
  motivo:'Se recorrió la gira', cambiado_en:new Date().toISOString(), cambiado_por:'u1', persona_id:'p' + id, nombre:'ALUMNA ' + id.toUpperCase(),
  telefono:'551000000' + id.slice(-1), inscripcion_id:'i' + id, lead_id:null, pago:true, monto:700, debe:700, asesor_id:'u2',
  estado:'sin_avisar', estado_en:null, estado_por:null, nota:null, regalo_curso:null, regalo_en:null, ...extra });
const LISTA = [
  fila('a1'),
  // Era lead, pagó y ya es inscrita: su renglón trae los dos ids y conserva "Aceptó"
  fila('a2', { lead_id:'l2', estado:'acepto', estado_en:new Date().toISOString() }),
  // Llegó con la fecha nueva y ya aceptó: puede recibir regalo
  fila('a3', { estado:'acepto', estado_en:new Date().toISOString() }),
  // La cambiaron de otro curso
  fila('a4'),
  // Lead con un pago reportado y lead sin pago
  fila('a5', { inscripcion_id:null, lead_id:'l5', pago:true, monto:600, debe:0 }),
  fila('a6', { inscripcion_id:null, lead_id:'l6', pago:false, monto:0, debe:0, nombre:'<img src=x onerror="window.__xss=1"> Lead' }),
];

(async () => {
  const h = await abrirHub({ tablas:{ interacciones:[], leads:[], pagos:[],
      cambio_fecha_avisos:[
        { id:'a3', regalo_curso:null, regalo_enviado_en:null, origen:'nueva', origen_nota:null },
        { id:'a4', regalo_curso:null, regalo_enviado_en:null, origen:'otro_curso', origen_nota:'Viene de Ciudad Vieja (allá estaba: Avisada)' },
        { id:'a6', regalo_curso:null, regalo_enviado_en:null, origen:'nueva', origen_nota:null },
        { id:'a9', inscripcion_id:'i9', persona_id:'p9', lead_id:null, estado:'sin_avisar', estado_en:null, regalo_curso:null, regalo_enviado_en:null, nota:null,
          origen:'nueva', origen_nota:null, creado_en:new Date().toISOString(), cambios_fecha:{ fecha_anterior:ANT, fecha_nueva:NUEVA } }],
      inscripciones:[{ id:'i9', persona_id:'p9', evento_id:'e1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
        asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:null, pagos:[],
        personas:{ id:'p9', nombre:'ALUMNA FICHA', telefono_principal:'5510000009' }, eventos:{ fecha:NUEVA, sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } } }] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true }, equipo:EQUIPO_EJEMPLO });
  const { p, check } = h;
  await p.evaluate(lista => {
    window.__rpc.cambio_fecha_sincronizar = () => 0;
    window.__rpc.cambio_fecha_lista = () => JSON.parse(JSON.stringify(lista));
    window.__rpc.cambio_fecha_regalo = ({ p_curso, p_enviado }) => ({ regalo:p_curso, enviado:p_enviado });
    document.body.insertAdjacentHTML('beforeend', '<div class="cf-caja" data-cf-ev="e1" id="cajaPrueba" style="padding:16px;"></div>');
    cf.abiertos.add('e1');
  }, LISTA);
  await h.limpiarOps();
  await p.evaluate(() => cfCargar('e1'));
  await p.waitForTimeout(300);
  const fila = id => p.textContent(`#cajaPrueba .cf-fila:has([data-cf-aviso="${id}"])`);

  h.paso('1. Antes de leer la lista, se pone al día');
  check((await h.ops('rpc:cambio_fecha_sincronizar', 'rpc')).some(o => o.p_evento === 'e1'), 'pide a la base que nadie del curso falte');

  h.paso('2. Todas en la lista, cada una una sola vez');
  const caja = await p.textContent('#cajaPrueba');
  check(caja.includes('Ya pagaron · 4') && caja.includes('Leads (todavía no se inscriben) · 2'), 'las 4 inscritas con las que pagaron y los 2 leads aparte: ' + caja.replace(/\s+/g, ' ').slice(0, 300));
  check(await p.$$eval('#cajaPrueba [data-cf-aviso="a2"][data-cf-acc="regalo"]', b => b.length) === 1, 'el lead que se inscribió sale una sola vez, como inscrita, con "Registrar regalo"');
  check(caja.includes('Nuevas: verificar regalo 2') && caja.includes('Vienen de otro curso 1'), 'cuántas son nuevas y cuántas vienen de otro curso');

  h.paso('3. Las nuevas: con etiqueta y con todos los botones');
  check((await fila('a3')).includes('Nueva: se inscribió con la fecha nueva. Verifica si le corresponde regalo.'), 'dice que es nueva y que lo verifiquen');
  check(await p.isVisible('[data-cf-acc="regalo"][data-cf-aviso="a3"]'), 'se le puede registrar regalo');
  await p.click('[data-cf-acc="regalo"][data-cf-aviso="a3"]');
  await p.waitForSelector('#modalConfirmar.open');
  await p.fill('#confirmarMotivo', 'Pan de muerto');
  await h.limpiarOps();
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await h.ops('rpc:cambio_fecha_regalo', 'rpc')).some(r => r.p_aviso === 'a3' && r.p_curso === 'Pan de muerto'), 'y se guarda');
  check((await fila('a6')).includes('Nueva: llegó con la fecha nueva'), 'un lead nuevo también lo dice');

  h.paso('4. Viene de otro curso');
  check((await fila('a4')).includes('Viene de Ciudad Vieja (allá estaba: Avisada). Verifica qué se le dijo.'), 'dice de dónde viene y qué tenía allá');
  check(await p.isVisible('[data-cf-acc="avisada"][data-cf-aviso="a4"]'), 'y se le puede avisar del cambio de este curso');

  h.paso('5. Leads con pago reportado');
  check((await fila('a5')).includes('reportó pago de $600 (falta confirmarlo)'), 'el lead que ya mandó su pago lo enseña');
  const leads = await p.$$eval('#cajaPrueba .cf-fila [data-cf-acc="no_va"]', bs => bs.map(b => b.dataset.cfAviso));
  check(leads[0] === 'a5', 'y va primero entre los leads');
  check(!(await p.evaluate(() => window.__xss)), 'nombres escapados');
  await p.$eval('#cajaPrueba', c => c.scrollIntoView());
  await h.captura('cambio-fecha-al-dia.png');

  h.paso('6. En la ficha de la inscrita');
  await p.evaluate(() => abrirModalInscripcion('i9'));
  await p.waitForTimeout(500);
  check((await p.textContent('#modalInscCambioFecha')).includes('Nueva: se inscribió con la fecha nueva'), 'su ficha también dice que es nueva');

  h.paso('7. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { cerrarModalInscripcion(); document.getElementById('cajaPrueba').scrollIntoView(); });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('cambio-fecha-al-dia-celular.png');

  await h.terminar();
})();
