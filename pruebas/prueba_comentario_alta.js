/* Comentario al dar de alta (1 nov 2026, pedido de Jared): "+ Nuevo lead" e "Inscribir a un curso" traen una casilla
   "Comentario (opcional)" que se guarda con la misma caja de comentarios de la ficha (guardarComentario): queda en su
   historial con fecha y quién lo escribió, y como último comentario del lead. Vacío = como antes. En "Registrar pago"
   de un lead que ya existe no sale (ahí está la caja de su ficha). Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'A', fecha:mas(60), curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };

(async () => {
  const h = await abrirHub({ tablas:{ inscripciones:[], pagos:[], interacciones:[], mensajes_predeterminados:[],
      personas:[{ id:'pV', nombre:'Alumna De Antes', telefono_principal:'5533330001' }, { id:'pO', nombre:'Lead Abierto', telefono_principal:'5533330002' }],
      leads:[{ id:'lO', persona_id:'pO', estatus_id:2, estatus:{ id:2, etiqueta:'Aún no vence su pago' }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:'A', eventos:ev,
        creado_en:new Date().toISOString(), personas:{ id:'pO', nombre:'Lead Abierto', telefono_principal:'5533330002' } }] },
    usuario:{ id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false, es_vendedor:true },
    equipo:[{ id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  await p.evaluate(e => { cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA']; EVENTOS_CAL = [e];
    window.__rpc.glamy_buscar_persona = () => ({ encontradas:0, personas:[] }); }, ev);
  const notas = async () => (await h.ops('interacciones', 'insert')).map(x => x.nota);

  h.paso('1. Nuevo lead con comentario');
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(400);
  await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open');
  check(await p.isVisible('#nuevoComentario') && (await p.inputValue('#nuevoComentario')) === '', 'la casilla sale vacía, antes de "Crear lead"');
  await p.fill('#nuevoTelefono', '5544440001');
  await p.fill('#nuevoNombre', 'Lead Con Comentario');
  await p.fill('#nuevoComentario', 'Viene de Facebook, prefiere que le escriban en la tarde <b>x</b>');
  await h.captura('comentario-alta-nuevo-lead.png');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(700);
  const lead = (await h.ops('leads', 'insert'))[0];
  const int = (await h.ops('interacciones', 'insert'))[0];
  check(lead && int && int.nota.startsWith('Viene de Facebook') && int.lead_id && int.lead_id === (await h.filas('leads')).find(l => l.persona_id === lead.persona_id && l.estatus_id === lead.estatus_id)?.id,
    'el comentario queda en su historial, ligado al lead nuevo');
  check(int.asesor_id === 'u2', 'con quién lo escribió');
  check((await h.ops('leads', 'update')).some(u => (u.comentario || '').startsWith('Viene de Facebook')), 'y como último comentario del lead (lo que ve Cobranza)');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'comentario_agregado'), 'queda en la actividad');

  h.paso('2. Sin comentario: como antes');
  await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open');
  check((await p.inputValue('#nuevoComentario')) === '', 'el formulario empieza limpio');
  await p.fill('#nuevoTelefono', '5544440002');
  await p.fill('#nuevoNombre', 'Lead Sin Comentario');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(700);
  check((await h.ops('leads', 'insert')).length === 1 && (await notas()).length === 0, 'se crea el lead y no se guarda ningún comentario vacío');

  h.paso('3. Inscribir a un curso con comentario');
  // (el tablero vuelve a leer los cursos; aquí se dejan los de ejemplo)
  await p.evaluate(e => { EVENTOS_CAL = [e]; return abrirInscribirACurso({ personaId:'pV', nombre:'Alumna De Antes', telefono:'5533330001' }); }, ev);
  await p.waitForSelector('#modalRegistrarPago.open');
  check(await p.isVisible('#regPagoComentario') && (await p.inputValue('#regPagoComentario')) === '', 'la casilla sale en "Inscribir a un curso"');
  await p.evaluate(() => { document.getElementById('regPagoEvento').value = 'A'; });
  await p.fill('#regPagoBanco', 'BANCO PRUEBA');
  await p.fill('#regPagoComentario', 'Ya fue alumna; quiere VIP la próxima');
  await h.captura('comentario-alta-inscribir.png');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForTimeout(800);
  const n3 = await notas();
  check(n3.some(n => n.startsWith('PAGO REPORTADO')) && n3[n3.length - 1] === 'Ya fue alumna; quiere VIP la próxima', 'queda el pago reportado y, después, su comentario');

  h.paso('4. Si ya tiene lead abierto, también');
  await p.evaluate(() => abrirInscribirACurso({ personaId:'pO', nombre:'Lead Abierto', telefono:'5533330002' }));
  await p.waitForSelector('#modalRegistrarPago.open');
  check(await p.isVisible('#regPagoComentario') && (await p.inputValue('#regPagoComentario')) === '', 'sale la casilla (limpia) también al usar su lead');
  await p.evaluate(() => document.getElementById('modalRegistrarPago').classList.remove('open'));

  h.paso('5. Registrar pago de un lead que ya existe: sin la casilla');
  await p.evaluate(() => abrirModalLead('lO'));
  await p.waitForTimeout(500);
  await p.click('#btnRegistrarPago');
  await p.waitForSelector('#modalRegistrarPago.open');
  check(!(await p.isVisible('#regPagoComentario')), 'no sale (su ficha ya tiene la caja de comentarios)');
  await p.evaluate(() => { document.getElementById('modalRegistrarPago').classList.remove('open'); document.getElementById('modalLead').classList.remove('open'); });

  h.paso('6. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.$eval('#nuevoComentario', x => x.scrollIntoView());
  await h.captura('comentario-alta-celular.png');

  await h.terminar();
})();
