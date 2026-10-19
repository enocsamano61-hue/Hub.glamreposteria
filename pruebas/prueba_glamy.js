/* Glamy (asistente con IA) y el tablero "Pedidos al Hub".
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
const PEDIDOS = [
  { id:'pd1', numero:1, seccion:'cobranza', titulo:'Recordatorio <b>automático</b>', que_necesita:'Que avise un día antes', para_que:'Cobrar a tiempo',
    ejemplo:'Un aviso el viernes', resumen:'Lo platicó con Glamy', estado:'nuevo', nota_admin:null,
    creado_en:'2026-10-19T16:00:00Z', actualizado_en:'2026-10-19T16:00:00Z', usuarios:{ nombre:'Vendedora Prueba' } },
  { id:'pd2', numero:2, seccion:null, titulo:'Exportar a Excel', que_necesita:'x', para_que:null, ejemplo:null, resumen:null,
    estado:'hecho', nota_admin:'Listo', creado_en:'2026-10-18T16:00:00Z', actualizado_en:'2026-10-19T16:00:00Z', usuarios:{ nombre:'Recepción Prueba' } },
];

(async () => {
  const h = await abrirHub({ tablas:{ inscripciones:[INSC], hub_pedidos:PEDIDOS } });
  const { p, check } = h;
  // La función glamy simulada: guarda lo que recibe y responde lo que pida la prueba.
  await p.evaluate(() => {
    window.__llamadas = [];
    window.__glamy = () => ({ data:{ texto:'Hola', restantes:39 }, error:null });
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

  h.paso('1. Sin recibir pedidos: no ve el tablero; Glamy saluda con sugerencias');
  check(await p.evaluate(() => document.querySelector('#desktopNav [data-view="pedidos"]').style.display === 'none'), 'sin "Pedidos al Hub" en el menú');
  check(await p.evaluate(() => !SECCIONES_ASIGNABLES_POR_ROL.some(s => s.id === 'pedidos')), 'pedidos no se reparte por rol');
  await p.click('#glamyFab');
  check(await p.evaluate(() => document.getElementById('glamyPanel').classList.contains('open')), 'abre el panel');
  check((await p.textContent('#glamyMsgs')).includes('Hola Recepción'), 'saluda por su nombre');
  check((await p.$$('.glamy-chip')).length === 5, 'cinco sugerencias');

  h.paso('2. Una sugerencia pregunta; la respuesta trae formato y botones validados');
  await responde(() => ({ data:{ restantes:39, texto:
    'Tienes **2 pendientes**:\n- Llamar a una alumna\n- Revisar un pago\n⟦ir:calendario⟧\n⟦ir:cobranza⟧\n⟦ir:inventada⟧\n' +
    `⟦ficha:11111111-1111-4111-8111-111111111111⟧\n⟦lead:22222222-2222-4222-8222-222222222222⟧\n⟦ficha:no-es-id⟧\n⟦pedidos⟧` }, error:null }));
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
        'solo botones válidos: sección permitida, IDs reales, sin pedidos (' + botones.join(', ') + ')');
  check((await p.textContent('#glamyRestan')).includes('39'), 'dice cuántas preguntas le quedan');
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
  await responde(() => ({ data:{ texto:'<img src=x onerror="window.__xss=1"> **<b>hola</b>**', restantes:38 }, error:null }));
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
  await responde(() => ({ data:{ texto:'Ya quedó', restantes:37 }, error:null }));
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

  h.paso('9. Quien recibe pedidos ve el tablero');
  await p.evaluate(() => { usuarioActual = { ...usuarioActual, recibe_pedidos:true }; aplicarPermisosNav(); });
  check(await p.evaluate(() => document.querySelector('#desktopNav [data-view="pedidos"]').style.display === ''), 'aparece en el menú');
  await p.click('#desktopNav [data-view="pedidos"]');
  await p.waitForTimeout(200);
  check((await p.$$('.ped-col')).length === 5, 'cinco columnas');
  check((await p.textContent('.ped-col >> nth=0')).includes('#1') && (await p.textContent('.ped-col >> nth=3')).includes('#2'), 'cada pedido en su estado');
  check(await p.$('.ped-tarjeta b b') === null, 'el título se escapa');
  await h.captura('glamy-pedidos.png');

  h.paso('10. Detalle: nota y cambio de estado');
  await p.click('[data-ped="pd1"]');
  check((await p.textContent('#pedDetalle')).includes('Cobrar a tiempo'), 'muestra para qué');
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
  check(copiado && copiado.startsWith('Pedido al Hub #1') && copiado.includes('Para qué: Cobrar a tiempo') && copiado.includes('Nota de Enoc: Lo hago esta semana'), 'copia el pedido completo');

  h.paso('12. Aviso del bloc "Ver pedido" abre ese pedido');
  await p.click('#pedCerrar');
  await p.evaluate(() => { NOTAS = [{ id:'n1', enlace:{ vista:'pedidos', pedido:2, etiqueta:'Ver pedido' } }]; setActiveSection('inicio'); });
  await p.evaluate(() => irAEnlaceNota('n1'));
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('view-pedidos').classList.contains('active')), 'abre Pedidos');
  check((await p.textContent('#pedDetalle')).includes('Exportar a Excel'), 'con el pedido #2 abierto');

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
  await p.click('#desktopNav [data-view="pedidos"]').catch(() => p.evaluate(() => setActiveSection('pedidos')));
  await h.captura('glamy-pedidos-celular.png');
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'sin scroll de lado');

  await h.terminar();
})();
