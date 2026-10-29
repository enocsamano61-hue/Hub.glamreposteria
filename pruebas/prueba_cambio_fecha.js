/* Cambio de fecha de un curso (se recorrió la gira):
   - Calendario → hoja del día → "Cambiar fecha" (solo administradores).
   - Lista del cambio en Cobranza → Embudo y en la hoja del día: WhatsApp con la plantilla
     "Cambio de fecha" (queda "Avisada"), Aceptó, Reembolso, Ya no va, Regalo dado y, para
     Cobranza, "Reembolso hecho · cerrar lugar".
   - Estado del cambio en la ficha de la inscrita.
   Las funciones de la base se simulan con window.__rpc; contra la base real se probaron aparte
   (en una transacción que se deshizo). Datos de ejemplo, sin personas reales. */
const { abrirHub, EQUIPO_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ANT = mas(4), NUEVA = mas(18);
const fila = (id, extra) => ({ aviso_id:id, cambio_id:'c1', evento_id:'e1', ciudad:'Ciudad Prueba', sede:'Salón Prueba', fecha_anterior:ANT, fecha_nueva:NUEVA,
  motivo:'Se recorrió la gira', cambiado_en:new Date().toISOString(), cambiado_por:'u1', persona_id:'p' + id, nombre:'ALUMNA ' + id.toUpperCase(),
  telefono:'551000000' + id.slice(-1), inscripcion_id:'i' + id, lead_id:null, pago:true, monto:700, debe:700, asesor_id:'u2',
  estado:'sin_avisar', estado_en:null, estado_por:null, nota:null, regalo_curso:null, regalo_en:null, ...extra });
const LISTA = [
  fila('a1'),
  fila('a2', { estado:'acepto', estado_en:new Date().toISOString(), debe:0 }),
  fila('a3', { estado:'reembolso', estado_en:new Date().toISOString(), nota:'ese día trabaja' }),
  fila('a4', { inscripcion_id:null, lead_id:'l4', pago:false, monto:0, debe:0, nombre:'<img src=x onerror="window.__xss=1"> Lead' }),
];

(async () => {
  const h = await abrirHub({ tablas:{
      mensajes_predeterminados:[{ id:'m1', usuario_id:'u9', compartido:true, titulo:'Cambio de fecha',
        texto:'Hola {nombre}, tu curso en {ciudad} cambió del {fecha_anterior} al {fecha}, en {sede}.' }],
      interacciones:[], leads:[], pagos:[],
      cambio_fecha_avisos:[{ inscripcion_id:'ia2', estado:'acepto', estado_en:new Date().toISOString(), regalo_curso:'Galletas decoradas', nota:null,
        creado_en:new Date().toISOString(), cambios_fecha:{ fecha_anterior:ANT, fecha_nueva:NUEVA } }],
      inscripciones:[{ id:'ia2', persona_id:'pa2', evento_id:'e1', anticipo:1400, restante:0, precio_pactado:1400, liquidado:true, estatus_id:12, paquete:'BASICO',
        asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:null, pagos:[],
        personas:{ id:'pa2', nombre:'Alumna A2', telefono_principal:'5510000002' }, eventos:{ fecha:NUEVA, sede:'Salón', ciudad_id:'c1', ciudades:{ nombre:'Ciudad Prueba' } } }],
    },
    usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Sistemas', es_admin:true }, equipo:EQUIPO_EJEMPLO });
  const { p, check } = h;
  await p.evaluate(([lista, ant]) => {
    window.open = () => null;
    cursoActivoIdCache = 'cur1';
    window.__rpc.cambio_fecha_lista = () => lista;
    window.__rpc.embudo_cursos = () => [{ evento_id:'e1', fecha:lista[0].fecha_nueva, ciudad:'Ciudad Prueba', grupo:'anticipo', persona_id:'pa1', lead_id:null,
      inscripcion_id:'ia1', nombre:'ALUMNA A1', telefono:'5510000001', asesor_id:'u2', monto:700, debe:700, fecha_promesa:null, comentario:null, reportado_en:null, sin_ligar:false }];
    window.__rpc.cambiar_fecha_evento = () => ({ cambio_id:'c1', inscritas:3, con_pago:3, leads:1 });
    window.__rpc.cambio_fecha_marcar = ({ p_estado }) => ({ estado:p_estado });
    window.__rpc.cambio_fecha_regalo = ({ p_curso }) => ({ regalo:p_curso });
    window.__rpc.cambio_fecha_cerrar_reembolso = () => ({ estado:'reembolsada' });
    window.renderCalendario = async () => {};
    calendarioDias[ant] = [{ id:'e1', fecha:ant, ciudad:'Ciudad Prueba', ciudadId:'c1', sede:'Salón', total:3, llegaron:0, liquidadas:1, deben:2,
      liq:1, ant:2, pend:0, noLlegaron:0, cobrado:2100, pendiente:1400, debenLlegaron:0, porConfirmar:0, cerrada:false }];
  }, [LISTA, ANT]);
  const rpcs = fn => p.evaluate(f => window.__ops.filter(o => o.tabla === 'rpc:' + f && o.tipo === 'rpc').map(o => o.datos), fn);

  h.paso('1. Calendario: "Cambiar fecha" (solo administradores)');
  await p.evaluate(ant => abrirSheetCalendario(ant), ANT);
  await p.waitForTimeout(400);
  check(await p.$('[data-cf-cambiar]') !== null, 'el administrador ve "Cambiar fecha"');
  check((await p.textContent('.cf-caja[data-cf-ev="e1"]')).includes('Cambio de fecha'), 'la hoja del día trae el bloque del cambio');
  await p.click('[data-cf-cambiar]');
  await p.waitForSelector('#modalCambiarFecha.open');
  await p.click('#cfGuardar');
  check((await p.textContent('#toast')).includes('Elige la nueva fecha'), 'pide la nueva fecha');
  await p.fill('#cfFecha', NUEVA);
  await p.fill('#cfMotivo', 'Se recorrió la gira');
  check((await p.textContent('#cfPrev')).includes('3 inscritas') && (await p.textContent('#cfPrev')).includes('(3 con pago)'), 'avisa cuántas se mueven');
  await h.captura('cambio-fecha-modal.png');
  await p.click('#cfGuardar');
  await p.waitForTimeout(400);
  const cambio = (await rpcs('cambiar_fecha_evento'))[0];
  check(cambio && cambio.p_evento === 'e1' && cambio.p_fecha === NUEVA && cambio.p_motivo === 'Se recorrió la gira', 'cambia la fecha con su motivo');
  check((await p.textContent('#toast')).includes('3 inscritas y 1 leads'), 'dice cuántas quedaron en la lista');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'curso_fecha_cambiada'), 'queda en la actividad');
  await p.evaluate(ant => { usuarioActual.es_admin = false; abrirSheetCalendario(ant); }, ANT);
  await p.waitForTimeout(300);
  check(await p.$('[data-cf-cambiar]') === null, 'quien no es administrador no lo ve');
  await p.evaluate(() => { usuarioActual.es_admin = true; cerrarSheetCalendario(); });

  h.paso('2. Cobranza → Embudo: el bloque del cambio');
  await p.evaluate(() => setActiveSection('cobranza'));
  await p.click('[data-cob-tab="embudo"]');
  await p.waitForTimeout(500);
  const caja = await p.textContent('#cobVistaEmbudo .cf-caja[data-cf-ev="e1"]');
  check(caja.includes('Aceptaron 1') && caja.includes('Reembolso 1') && caja.includes('Sin avisar 2'), 'números del cambio');
  check(caja.includes('Ocultar lista'), 'el curso que se acaba de cambiar ya trae la lista abierta');
  await p.click('#cobVistaEmbudo [data-cf-ver="e1"]');
  check((await p.textContent('#cobVistaEmbudo .cf-caja')).includes('Ver lista (4)') && await p.$('#cobVistaEmbudo .cf-fila') === null, 'se puede ocultar');
  await p.click('#cobVistaEmbudo [data-cf-ver="e1"]');
  const lista = await p.textContent('#cobVistaEmbudo .cf-caja');
  check(lista.includes('Ya pagaron · 3') && lista.includes('Leads (todavía no se inscriben) · 1'), 'primero las que ya pagaron, luego los leads');
  check(!(await p.evaluate(() => window.__xss)), 'los nombres se escapan');
  await h.captura('cambio-fecha-embudo.png');

  h.paso('3. WhatsApp con la plantilla → Avisada');
  await p.click('#cobVistaEmbudo [data-cf-acc="wa"][data-cf-aviso="a1"]');
  await p.waitForSelector('#modalWhats.open');
  const texto = await p.inputValue('#waTexto');
  check(texto.includes('Alumna') && texto.includes('Ciudad Prueba') && texto.includes('Salón Prueba') && /cambió del \S+ \d+ de \S+ al \S+ \d+ de/.test(texto),
        'usa la plantilla "Cambio de fecha" con la fecha anterior y la nueva: ' + texto);
  await p.click('#waEnviar');
  await p.waitForTimeout(400);
  check((await rpcs('cambio_fecha_marcar')).some(r => r.p_aviso === 'a1' && r.p_estado === 'avisada'), 'al mandarlo queda "Avisada"');
  check((await h.ops('interacciones', 'insert')).some(i => i.canal === 'whatsapp' && i.persona_id === 'pa1'), 'y el WhatsApp queda en su historial');
  await p.evaluate(() => { MENSAJES = []; });
  await p.click('#cobVistaEmbudo [data-cf-acc="wa"][data-cf-aviso="a1"]');
  await p.waitForSelector('#modalWhats.open');
  check((await p.inputValue('#waTexto')).includes('Por la molestia te regalamos un curso de la Academia'), 'si borran la plantilla, usa el texto de siempre');
  await p.evaluate(() => document.getElementById('modalWhats').classList.remove('open'));

  h.paso('4. Aceptó, regalo, reembolso y "ya no va"');
  await h.limpiarOps();
  await p.click('#cobVistaEmbudo [data-cf-acc="acepto"][data-cf-aviso="a1"]');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_marcar')).some(r => r.p_aviso === 'a1' && r.p_estado === 'acepto'), '"Aceptó"');
  await p.click('#cobVistaEmbudo [data-cf-acc="regalo"][data-cf-aviso="a2"]');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#confirmarMotivoCampo label')) === 'Curso' && await p.isVisible('#cfRegaloEnviado'), 'el regalo pide qué curso y si ya se envió el acceso');
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  check((await p.textContent('#toast')).includes('Escribe qué curso') && (await rpcs('cambio_fecha_regalo')).length === 0, 'sin curso no se guarda');
  await p.click('#cobVistaEmbudo [data-cf-acc="regalo"][data-cf-aviso="a2"]');
  await p.waitForSelector('#modalConfirmar.open');
  await p.fill('#confirmarMotivo', 'Galletas decoradas');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_regalo')).some(r => r.p_aviso === 'a2' && r.p_curso === 'Galletas decoradas' && r.p_enviado === false), 'guarda el regalo con el curso (falta enviar el acceso)');
  await p.click('#cobVistaEmbudo [data-cf-acc="reembolso"][data-cf-aviso="a1"]');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#confirmarAviso')).includes('Cobranza y a Gerencia'), 'reembolso: avisa que le llega a Cobranza y Gerencia');
  await p.fill('#confirmarMotivo', 'ese día trabaja');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_marcar')).some(r => r.p_aviso === 'a1' && r.p_estado === 'reembolso' && r.p_nota === 'ese día trabaja'), 'marca reembolso con comentario');
  await p.click('#cobVistaEmbudo [data-cf-acc="no_va"][data-cf-aviso="a4"]');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_marcar')).some(r => r.p_aviso === 'a4' && r.p_estado === 'no_va'), 'el lead: "ya no va"');
  check((await h.ops('actividad_usuario', 'insert')).filter(a => a.accion.startsWith('cambio_fecha')).length === 4, 'cada respuesta queda en la actividad');

  h.paso('5. Cobranza cierra el reembolso');
  await p.click('#cobVistaEmbudo [data-cf-acc="cerrar"][data-cf-aviso="a3"]');
  await p.waitForSelector('#modalConfirmar.open');
  await p.fill('#confirmarMotivo', 'transferencia');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await rpcs('cambio_fecha_cerrar_reembolso')).some(r => r.p_aviso === 'a3' && r.p_nota === 'transferencia'), 'cierra el lugar con cómo se devolvió');
  await p.evaluate(() => { usuarioActual.es_admin = false; usuarioActual.rol = 'Ventas'; cfPintarCajas('e1'); });
  check(await p.$('#cobVistaEmbudo [data-cf-acc="cerrar"]') === null && await p.$('#cobVistaEmbudo [data-cf-acc="reembolso"]') !== null,
        'una vendedora marca el reembolso, pero no lo cierra');
  await p.evaluate(() => { usuarioActual.es_admin = true; usuarioActual.rol = 'Sistemas'; });

  h.paso('6. Ficha de la inscrita y Mensajes');
  // La ficha sale de la misma lista (cambio_fecha_lista): en la base su renglón ya trae su regalo
  await p.evaluate(() => { window.__rpc.cambio_fecha_lista().find(x => x.inscripcion_id === 'ia2').regalo_curso = 'Galletas decoradas'; return abrirModalInscripcion('ia2'); });
  await p.waitForTimeout(400);
  const ficha = await p.textContent('#modalInscCambioFecha');
  check(ficha.includes('Cambio de fecha') && ficha.includes('Aceptó') && ficha.includes('Galletas decoradas'), 'la ficha dice cómo va su cambio y su regalo');
  await p.evaluate(() => cerrarModalInscripcion());
  check(await p.evaluate(() => VARIABLES_MENSAJE.some(v => v.v === '{fecha_anterior}') && rellenarMensaje('del {fecha_anterior} al {fecha}', { fecha_anterior:'2026-10-26', fecha:'2026-11-09' }) === 'del lunes 26 de octubre al lunes 9 de noviembre'),
        'Mensajes tiene la variable {fecha_anterior}');

  h.paso('7. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => setActiveSection('cobranza'));
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.evaluate(() => document.querySelector('#cobVistaEmbudo .cf-caja').scrollIntoView());
  await h.captura('cambio-fecha-celular.png');

  await h.terminar();
})();
