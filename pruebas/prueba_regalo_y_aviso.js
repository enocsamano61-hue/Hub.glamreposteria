/* Cambio de fecha (27 oct 2026): "Registrar regalo" (curso + si ya se envió el acceso), "Ya se envió" y "Ya le avisé"
   (para quien avisa desde su celular), en la lista de Cambio de fecha y en la ficha de la inscrita. Datos de ejemplo. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ANT = mas(-2), NUEVA = mas(80);
const fila = (id, extra) => ({ aviso_id:id, cambio_id:'c1', evento_id:'e1', ciudad:'Ciudad Prueba', sede:'Salón', fecha_anterior:ANT, fecha_nueva:NUEVA,
  motivo:'Se recorrió la gira', cambiado_en:new Date().toISOString(), cambiado_por:'u1', persona_id:'p' + id, nombre:'ALUMNA ' + id.toUpperCase(),
  telefono:'551000000' + id.slice(-1), inscripcion_id:'i' + id, lead_id:null, pago:true, monto:700, debe:700, asesor_id:'u2',
  estado:'sin_avisar', estado_en:null, estado_por:null, nota:null, regalo_curso:null, regalo_en:null, ...extra });
const LISTA = [
  fila('a1'),
  fila('a2', { estado:'acepto', estado_en:new Date().toISOString() }),
  fila('a3', { estado:'acepto', estado_en:new Date().toISOString(), regalo_curso:'Pan de muerto', regalo_en:new Date().toISOString() }),
  fila('a4', { estado:'acepto', estado_en:new Date().toISOString(), regalo_curso:'Pan de muerto', regalo_en:new Date().toISOString() }),
];

(async () => {
  const h = await abrirHub({ tablas:{ interacciones:[], leads:[], pagos:[],
      // a4 ya tiene el acceso enviado; a3 no
      cambio_fecha_avisos:[{ id:'a3', regalo_curso:'Pan de muerto', regalo_enviado_en:null }, { id:'a4', regalo_curso:'Pan de muerto', regalo_enviado_en:new Date().toISOString() },
        { id:'a9', inscripcion_id:'i9', persona_id:'p9', lead_id:null, estado:'sin_avisar', estado_en:null, regalo_curso:null, regalo_enviado_en:null, nota:null,
          creado_en:new Date().toISOString(), cambios_fecha:{ fecha_anterior:ANT, fecha_nueva:NUEVA } }],
      inscripciones:[{ id:'i9', persona_id:'p9', evento_id:'e1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
        asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:null, pagos:[],
        personas:{ id:'p9', nombre:'ALUMNA FICHA', telefono_principal:'5510000009' }, eventos:{ fecha:NUEVA, sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } } }] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true }, equipo:EQUIPO_EJEMPLO });
  const { p, check } = h;
  await p.evaluate(lista => {
    window.__rpc.cambio_fecha_lista = () => JSON.parse(JSON.stringify(lista));
    window.__rpc.cambio_fecha_marcar = ({ p_estado }) => ({ estado:p_estado });
    window.__rpc.cambio_fecha_regalo = ({ p_curso, p_enviado }) => ({ regalo:p_curso, enviado:p_enviado });
    window.__rpc.cambio_fecha_regalo_enviado = () => ({ enviado:true });
    document.body.insertAdjacentHTML('beforeend', '<div class="cf-caja" data-cf-ev="e1" id="cajaPrueba" style="padding:16px;"></div>');
    cf.abiertos.add('e1');
  }, LISTA);
  await p.evaluate(() => cfCargar('e1'));
  await p.waitForTimeout(300);
  const rpcs = n => h.ops('rpc:' + n, 'rpc');
  const fila = id => p.textContent(`#cajaPrueba .cf-fila:has([data-cf-aviso="${id}"])`);

  h.paso('1. Lo que se ve en la lista');
  const caja = await p.textContent('#cajaPrueba');
  check(caja.includes('Aceptaron sin regalo 1') && caja.includes('Regalo: falta enviar acceso 1') && caja.includes('Regalo: acceso enviado 1'), 'cuenta: sin regalo, falta enviar, enviado');
  check(!caja.includes('Regalo dado'), 'ya no dice "Regalo dado"');
  check((await fila('a3')).includes('falta enviar el acceso') && await p.isVisible('[data-cf-acc="regalo_enviado"][data-cf-aviso="a3"]'), 'registrado sin enviar: "Ya se envió"');
  check((await fila('a4')).includes('acceso enviado') && !(await p.$('[data-cf-acc="regalo_enviado"][data-cf-aviso="a4"]')), 'enviado: sin botón');
  check(await p.isVisible('[data-cf-acc="avisada"][data-cf-aviso="a1"]') && await p.isVisible('[data-cf-acc="regalo"][data-cf-aviso="a2"]'), '"Ya le avisé" a quien falta avisar y "Registrar regalo" a quien aceptó');
  await p.$eval('#cajaPrueba', c => c.scrollIntoView());
  await h.captura('regalo-lista.png');

  h.paso('2. Registrar regalo con el acceso ya enviado');
  await h.limpiarOps();
  await p.click('[data-cf-acc="regalo"][data-cf-aviso="a2"]');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#confirmarTitulo')).includes('Registrar regalo'), 'título "Registrar regalo"');
  await p.fill('#confirmarMotivo', 'Pan de muerto');
  await p.check('#cfRegaloEnviado');
  await h.captura('regalo-registrar.png');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_regalo')).some(r => r.p_aviso === 'a2' && r.p_curso === 'Pan de muerto' && r.p_enviado === true), 'guarda el curso y que ya se envió');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'cambio_fecha_regalo' && a.detalle.includes('acceso enviado')), 'queda en la actividad');

  h.paso('3. "Ya se envió"');
  await h.limpiarOps();
  await p.click('[data-cf-acc="regalo_enviado"][data-cf-aviso="a3"]');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_regalo_enviado')).some(r => r.p_aviso === 'a3'), 'marca el acceso enviado');

  h.paso('4. "Ya le avisé" (desde el celular)');
  await h.limpiarOps();
  await p.click('[data-cf-acc="avisada"][data-cf-aviso="a1"]');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_marcar')).some(r => r.p_aviso === 'a1' && r.p_estado === 'avisada'), 'queda "Avisada"');
  const nota = (await h.ops('interacciones', 'insert'))[0];
  check(nota && nota.persona_id === 'pa1' && nota.asesor_id === 'u1' && nota.nota.includes('se le avisó por WhatsApp desde el celular'), 'y en su historial, con quién');

  h.paso('5. Desde la ficha de la inscrita');
  await p.evaluate(() => abrirModalInscripcion('i9'));
  await p.waitForTimeout(500);
  check(await p.isVisible('#modalInscCambioFecha [data-fcf="avisada"]'), 'en la ficha también está "Ya le avisé"');
  await h.limpiarOps();
  await p.click('#modalInscCambioFecha [data-fcf="avisada"]');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_marcar')).some(r => r.p_aviso === 'a9' && r.p_estado === 'avisada'), 'y funciona');
  await p.evaluate(() => { const a = window.__tablas.cambio_fecha_avisos.find(x => x.id === 'a9'); a.estado = 'acepto'; return pintarCambioFechaFicha('i9'); });
  await p.waitForTimeout(300);
  check(await p.isVisible('#modalInscCambioFecha [data-fcf="regalo"]'), 'si aceptó, "Registrar regalo" en la ficha');
  await h.captura('regalo-ficha.png');
  await p.evaluate(() => { const a = window.__tablas.cambio_fecha_avisos.find(x => x.id === 'a9'); a.regalo_curso = 'Pan de muerto'; return pintarCambioFechaFicha('i9'); });
  await p.waitForTimeout(300);
  check((await p.textContent('#modalInscCambioFecha')).includes('falta enviar el acceso') && await p.isVisible('#modalInscCambioFecha [data-fcf="regalo_enviado"]'), 'y luego "Ya se envió"');

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('regalo-celular.png');

  await h.terminar();
})();
