/* Glamy (asistente con IA, el cupcake) y su sección: 📊 Uso y 🎫 Tickets.
   La función de Supabase se simula: sb.functions.invoke responde lo que diga window.__glamy. */
const { abrirHub } = require('./arnes');

const ID_FICHA = '11111111-1111-4111-8111-111111111111';
const ID_LEAD = '22222222-2222-4222-8222-222222222222';
const INSC = {
  id:ID_FICHA, anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11,
  asesor_id:'u1', notas_migracion:null, fecha_proximo_pago:null, pagos:[],
  personas:{ id:'p1', nombre:'Alumna Prueba Uno', telefono_principal:'0000000000' },
  eventos:{ fecha:'2026-11-07', sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } },
};
const HOY = new Date().toLocaleDateString('en-CA', { timeZone:'America/Mexico_City' });
const PEDIDOS = [
  { id:'pd1', numero:1, seccion:'cobranza', titulo:'Recordatorio <b>automático</b>', que_necesita:'Que avise un día antes', para_que:'Cobrar a tiempo',
    ejemplo:'Un aviso el viernes', resumen:'Lo platicó con Glamy', estado:'nuevo', nota_admin:null,
    creado_en:'2026-10-19T16:00:00Z', actualizado_en:'2026-10-19T16:00:00Z', usuarios:{ nombre:'Vendedora Prueba' } },
  { id:'pd2', numero:2, seccion:null, titulo:'Exportar a Excel', que_necesita:'x', para_que:null, ejemplo:null, resumen:null,
    estado:'hecho', nota_admin:'Listo', creado_en:'2026-10-18T16:00:00Z', actualizado_en:'2026-10-19T16:00:00Z', usuarios:{ nombre:'Recepción Prueba' } },
];

(async () => {
  const USO = [
    { usuario_id:'u2', fecha:HOY, creado_en:HOY + 'T18:05:00Z', costo_usd:0.0012, herramientas:['buscar_persona'], error:null },
    { usuario_id:'u2', fecha:HOY, creado_en:HOY + 'T17:00:00Z', costo_usd:0.0008, herramientas:['buscar_persona', 'curso'], error:null },
    { usuario_id:'u1', fecha:HOY, creado_en:HOY + 'T16:00:00Z', costo_usd:0.0002, herramientas:[], error:'falla' },
  ];
  const h = await abrirHub({ tablas:{ inscripciones:[INSC], hub_pedidos:PEDIDOS, glamy_uso:USO } });
  const { p, check } = h;
  // La función glamy simulada: guarda lo que recibe y responde lo que pida la prueba.
  await p.evaluate(() => {
    window.__llamadas = [];
    window.__glamy = () => ({ data:{ texto:'Hola' }, error:null });
    Object.defineProperty(sb, 'functions', { value:{ invoke: async (nombre, { body }) => {
      window.__llamadas.push({ nombre, body: JSON.parse(JSON.stringify(body)) });
      return window.__glamy(body);
    } } });
    sessionStorage.clear();
    aplicarPermisosNav();
    document.getElementById('glamyFab').style.display = 'flex';
  });
  const llamadas = () => p.evaluate(() => window.__llamadas);
  const responde = src => p.evaluate(s => { window.__glamy = new Function('body', 'return (' + s + ')(body)'); }, src.toString());

  h.paso('1. Sin recibir tickets: no ve la sección Glamy; el cupcake saluda con sugerencias');
  check(await p.evaluate(() => document.querySelector('#desktopNav [data-view="glamy"]').style.display === 'none'), 'sin "Glamy" en el menú');
  check(await p.evaluate(() => !SECCIONES_ASIGNABLES_POR_ROL.some(s => s.id === 'glamy')), 'la sección no se reparte por rol');
  check(await p.$('#glamtutFab') === null && await p.$('#tutorialChecklistCard') === null && await p.$('#tutorialAvanceCard') === null, 'el tutorial ya no existe');
  check(await p.$('#glamyFab svg.glamy-cup') !== null && (await p.textContent('#glamyFab')).includes('Glamy'), 'el botón es el cupcake con su nombre');
  await p.evaluate(() => { localStorage.clear(); glamySaludoDelDia(); });
  check(await p.isVisible('#glamyGlobo'), 'globito "¿Te ayudo?" la primera vez del día');
  await p.evaluate(() => { document.getElementById('glamyGlobo').style.display = 'none'; glamySaludoDelDia(); });
  check(!(await p.isVisible('#glamyGlobo')), 'la segunda vez del día ya no sale');
  await p.click('#glamyFab');
  check(await p.evaluate(() => document.getElementById('glamyPanel').classList.contains('open')), 'abre el panel');
  check(await p.$('.glamy-head svg.glamy-cup') !== null, 'el cupcake también en el encabezado');
  check((await p.textContent('#glamyMsgs')).includes('Hola Recepción'), 'saluda por su nombre');
  check((await p.$$('.glamy-chip')).length === 5, 'cinco sugerencias');

  h.paso('2. Una sugerencia pregunta; la respuesta trae formato y botones validados');
  await responde(() => ({ data:{ texto:
    'Tienes **2 pendientes**:\n- Llamar a una alumna\n- Revisar un pago\n⟦ir:calendario⟧\n⟦ir:cobranza⟧\n⟦ir:inventada⟧\n' +
    `⟦ficha:11111111-1111-4111-8111-111111111111⟧\n⟦lead:22222222-2222-4222-8222-222222222222⟧\n⟦ficha:no-es-id⟧\n⟦tickets⟧` }, error:null }));
  await p.click('.glamy-chip >> nth=1');
  await p.waitForTimeout(200);
  let ll = await llamadas();
  check(ll.length === 1 && ll[0].nombre === 'glamy', 'llamó a la función glamy');
  check(ll[0].body.mensajes.length === 1 && ll[0].body.mensajes[0].rol === 'user' && ll[0].body.mensajes[0].texto === '¿Qué tareas tengo pendientes?', 'manda la pregunta');
  check(ll[0].body.seccion === 'inicio', 'manda la sección donde está');
  check(await p.textContent('.glamy-msg.ella strong') === '2 pendientes', 'negritas');
  check((await p.$$('.glamy-msg.ella ul li')).length === 2, 'lista con dos renglones');
  check(!(await p.textContent('#glamyMsgs')).includes('⟦'), 'las marcas no se ven como texto');
  const botones = await p.$$eval('.glamy-boton', bs => bs.map(b => b.textContent));
  check(JSON.stringify(botones) === JSON.stringify(['Ir a Calendario', 'Abrir ficha', 'Abrir lead']),
        'solo botones válidos: sección permitida, IDs reales, sin tickets (' + botones.join(', ') + ')');
  check(await p.$('#glamyRestan') === null, 'sin contador de preguntas (ya no hay límite)');
  await h.captura('glamy-chat.png');

  h.paso('3. Botón de ficha: cierra Glamy y abre la ficha');
  await p.click('.glamy-boton >> text=Abrir ficha');
  await p.waitForTimeout(300);
  check(!(await p.evaluate(() => document.getElementById('glamyPanel').classList.contains('open'))), 'cierra el panel');
  check(await p.evaluate(id => modalInscId === id, ID_FICHA), 'abre la ficha correcta');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('4. La plática se conserva al reabrir; Ir a una sección');
  await p.click('#glamyFab');
  check((await p.$$('.glamy-msg')).length === 2, 'siguen los 2 mensajes');
  await p.click('.glamy-boton >> text=Ir a Calendario');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('view-calendario').classList.contains('active')), 'cambia a Calendario');

  h.paso('5. Botón de lead: carga el lead si no está y lo abre');
  await p.evaluate(id => { leadsCache = []; cargarLeads = async () => [{ id, estatus_id:11, personas:{ id:'p9', nombre:'Lead Prueba', telefono_principal:'0000000001' } }]; }, ID_LEAD);
  await p.click('#glamyFab');
  await p.click('.glamy-boton >> text=Abrir lead');
  await p.waitForTimeout(300);
  check((await p.textContent('#modalLeadNombre')) === 'Lead Prueba', 'abre el lead');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));

  h.paso('6. Todo se escapa: lo que escribe la persona y lo que responde Glamy');
  await responde(() => ({ data:{ texto:'<img src=x onerror="window.__xss=1"> **<b>hola</b>**' }, error:null }));
  await p.click('#glamyFab');
  await p.fill('#glamyTexto', '<img src=y onerror="window.__xss=2">');
  await p.press('#glamyTexto', 'Enter');
  await p.waitForTimeout(200);
  check(await p.$('#glamyMsgs img') === null && await p.$('#glamyMsgs b') === null, 'no se interpreta HTML');
  check(await p.evaluate(() => !window.__xss), 'no corre nada');
  check(await p.inputValue('#glamyTexto') === '', 'Enter manda y limpia la caja');
  ll = await llamadas();
  check(ll[1].body.mensajes.length === 3 && ll[1].body.seccion === 'calendario', 'manda la plática y la nueva sección');

  h.paso('7. Error de la función: se muestra y no se manda como plática');
  await responde(() => ({ data:null, error:{ message:'Edge Function returned a non-2xx status code',
    context:{ json: async () => ({ error:'Inicia sesión en el Hub.' }) } } }));
  await p.fill('#glamyTexto', 'hola');
  await p.click('#glamyEnviar');
  await p.waitForTimeout(200);
  check((await p.textContent('.glamy-msg.ella.error')).includes('Inicia sesión en el Hub.'), 'muestra el motivo');
  await responde(() => ({ data:{ texto:'Ya quedó' }, error:null }));
  await p.fill('#glamyTexto', 'otra vez');
  await p.click('#glamyEnviar');
  await p.waitForTimeout(200);
  ll = await llamadas();
  const ultima = ll[ll.length - 1].body.mensajes;
  check(!ultima.some(m => m.texto.includes('No pude responder')), 'el error no viaja en la plática');
  check(ultima[ultima.length - 1].texto === 'otra vez', 'termina con la pregunta nueva');
  check(await p.evaluate(() => JSON.parse(sessionStorage.getItem('glamy:u1')).mensajes.length) === 8, 'guardada en la pestaña');

  h.paso('8. "Nueva" borra la plática');
  await p.click('#glamyNueva');
  check((await p.$$('.glamy-chip')).length === 5 && (await p.$$('.glamy-msg.yo')).length === 0, 'vuelve al saludo');
  await p.click('#glamyCerrar');

  h.paso('9. Quien recibe los tickets ve la sección Glamy con el uso');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, recibe_pedidos:true }; aplicarPermisosNav(); });
  check(await p.evaluate(() => document.querySelector('#desktopNav [data-view="glamy"]').style.display === ''), 'aparece en el menú');
  await p.click('#desktopNav [data-view="glamy"]');
  await p.waitForTimeout(250);
  const kpis = await p.$$eval('.gu-kpi', ks => ks.map(k => k.textContent.replace(/\s+/g, ' ')));
  check(kpis.length === 4 && kpis[0].includes('3') && kpis[0].includes('$0.002'), 'hoy: 3 preguntas y su costo (' + kpis[0] + ')');
  check(kpis[3].includes('$10'), 'proyección contra el saldo');
  const usoTxt = await p.textContent('#glTabUso');
  check(usoTxt.includes('buscar persona') && usoTxt.includes('errores: 1'), 'lo más consultado y los errores');
  const filasUso = await p.$$eval('.gu-tabla tr', tr => tr.slice(1).map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  check(filasUso[0].startsWith('Vendedora PruebaVentas2$0.002buscar persona') && filasUso[0].includes('hoy'), 'por persona, la que más usa primero');
  check(filasUso.length === 2, 'todo el equipo aparece');
  check((await p.$$('.gu-barra')).length === 14, 'barras de 14 días');
  check((await p.textContent('#glTicketsAbiertos')) === '1', 'la pestaña Tickets dice cuántos están abiertos');
  await h.captura('glamy-uso.png');

  h.paso('10. Tickets: tablero, nota y cambio de estado');
  await p.click('[data-gl-tab="tickets"]');
  await p.waitForTimeout(200);
  check((await p.$$('.ped-col')).length === 5, 'cinco columnas');
  check((await p.textContent('.ped-col >> nth=0')).includes('#1') && (await p.textContent('.ped-col >> nth=3')).includes('#2'), 'cada ticket en su estado');
  check(await p.$('.ped-tarjeta b b') === null, 'el título se escapa');
  await h.captura('glamy-tickets.png');
  await p.click('[data-ped="pd1"]');
  check((await p.textContent('#pedDetalle')).includes('Cobrar a tiempo') && (await p.textContent('#pedDetalle')).includes('Lo levantó'), 'muestra el detalle');
  await p.fill('#pedNota', 'Lo hago esta semana');
  await p.click('[data-ped-estado="en_desarrollo"]');
  await p.waitForTimeout(200);
  const upd = await h.ops('hub_pedidos', 'update');
  check(upd.length === 1 && upd[0].estado === 'en_desarrollo' && upd[0].nota_admin === 'Lo hago esta semana', 'guarda estado y nota juntos (la nota viaja en el aviso)');
  check((await p.textContent('.ped-col >> nth=2')).includes('#1'), 'se movió de columna');
  check(await p.evaluate(() => document.querySelector('[data-ped-estado="en_desarrollo"]').classList.contains('on')), 'el detalle sigue abierto y al día');
  const act = await h.ops('actividad_usuario', 'insert');
  check(act.some(a => a.accion === 'pedido_estado'), 'queda en la bitácora');
  await p.click('#pedGuardarNota');
  await p.waitForTimeout(100);
  check((await h.ops('hub_pedidos', 'update')).length === 1, 'nota sin cambios no vuelve a guardar');

  h.paso('11. Copiar para Claude');
  await p.evaluate(() => { window.__copiado = null; navigator.clipboard.writeText = async t => { window.__copiado = t; }; });
  await p.click('#pedCopiar');
  await p.waitForTimeout(100);
  const copiado = await p.evaluate(() => window.__copiado);
  check(copiado && copiado.startsWith('Ticket del Hub #1') && copiado.includes('Para qué: Cobrar a tiempo') && copiado.includes('Nota de Enoc: Lo hago esta semana'), 'copia el ticket completo');

  h.paso('12. Aviso del bloc "Ver ticket" abre ese ticket (también los avisos viejos de "pedidos")');
  await p.click('#pedCerrar');
  for(const vista of ['glamy', 'pedidos']){
    await p.evaluate(v => { NOTAS = [{ id:'n1', enlace:{ vista:v, pedido:2, etiqueta:'Ver ticket' } }]; gl.tab = 'uso'; ped.abierto = null; document.getElementById('pedDetalle').style.display = 'none'; setActiveSection('inicio'); }, vista);
    await p.evaluate(() => irAEnlaceNota('n1'));
    await p.waitForTimeout(300);
    check(await p.evaluate(() => document.getElementById('view-glamy').classList.contains('active') && document.getElementById('glTabTickets').style.display === ''), `abre Glamy → Tickets (${vista})`);
    check((await p.textContent('#pedDetalle')).includes('Exportar a Excel'), `con el ticket #2 abierto (${vista})`);
  }
  h.paso('12b. Botón ⟦tickets⟧ de Glamy lleva a los tickets');
  await p.evaluate(() => { gl.tab = 'uso'; setActiveSection('inicio'); glamy.mensajes = [{ rol:'user', texto:'x' }, { rol:'assistant', texto:'Mira ⟦tickets⟧' }]; glamyGuardar(); });
  await p.click('#glamyFab');
  await p.click('.glamy-boton >> text=Ver tickets');
  await p.waitForTimeout(250);
  check(await p.evaluate(() => document.getElementById('view-glamy').classList.contains('active') && gl.tab === 'tickets'), 'abre la pestaña Tickets');

  h.paso('13. En Recepción no estorba; en celular ocupa la pantalla');
  await p.evaluate(() => document.body.classList.add('en-recepcion'));
  check(await p.evaluate(() => getComputedStyle(document.getElementById('glamyFab')).display === 'none'), 'se oculta en Recepción');
  await p.evaluate(() => document.body.classList.remove('en-recepcion'));
  await p.setViewportSize({ width:390, height:780 });
  await p.click('#glamyFab');
  const caja = await p.evaluate(() => { const r = document.getElementById('glamyPanel').getBoundingClientRect(); return [r.width, r.height]; });
  check(caja[0] === 390 && caja[1] === 780, 'pantalla completa en celular');
  await h.captura('glamy-celular.png');
  await p.click('#glamyCerrar');
  await p.evaluate(() => { gl.tab = 'uso'; setActiveSection('glamy'); });
  await p.waitForTimeout(250);
  await h.captura('glamy-uso-celular.png');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'sin scroll de lado');

  await h.terminar();
})();
