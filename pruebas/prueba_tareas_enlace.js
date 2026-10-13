/* Tareas del bloc con destino ("Ir →") y comentario de sistema aparte del texto. */
const { abrirHub } = require('./arnes');

const INSC = {
  id:'i1', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:9,
  asesor_id:'u1', notas_migracion:'Nota', fecha_proximo_pago:null, pagos:[],
  personas:{ id:'p1', nombre:'Alumna Prueba Uno', telefono_principal:'0000000000' },
  eventos:{ fecha:'2026-09-27', sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } },
};
const base = { usuario_id:'u1', asignado_por:'u2', color:'champagne', completado:false, orden:0,
  creado_en:'2026-10-13T18:00:00Z', actualizado_en:'2026-10-13T18:00:00Z', visto_en:null, completado_en:null,
  asignador:{ nombre:'Admin Prueba' }, destinatario:{ nombre:'Recepción Prueba' } };

(async () => {
  const h = await abrirHub({ tablas: {
    inscripciones:[INSC],
    eventos:[{ id:'e1', fecha:'2026-09-27', sede:'Salón', ciudad_id:'c1', recepcion_cerrada_en:null, ciudades:{ nombre:'Ciudad Prueba' } }],
  } });
  const { p, check } = h;
  const pintar = async notas => {
    await p.evaluate(ns => { NOTAS = ns; renderNotas(); document.getElementById('notasPanel').classList.add('open'); }, notas);
  };

  h.paso('1. Tarea de sistema: encabezado, comentario aparte y botón');
  await pintar([
    { ...base, id:'n1', texto:'Confirmar si llegó al curso', de_sistema:true,
      nota_sistema:'Pagó anticipo y el Excel no dice si llegó.', enlace:{ vista:'cobranza', inscripcion:'i1', etiqueta:'Abrir ficha' } },
    { ...base, id:'n2', texto:'Tarea normal de una persona', de_sistema:false, nota_sistema:null, enlace:null },
  ]);
  const c1 = await p.textContent('[data-nota-id="n1"]');
  check(c1.includes('⚙️ Sistema'), 'encabezado dice Sistema');
  check(c1.includes('COMENTARIO DE SISTEMA') && c1.includes('el Excel no dice si llegó'), 'comentario de sistema aparte');
  check(await p.$('[data-nota-id="n1"] .nota-ir') !== null, 'tiene botón Ir');
  check((await p.textContent('[data-nota-id="n1"] .nota-ir')).includes('Abrir ficha'), 'botón con su etiqueta');
  const c2 = await p.textContent('[data-nota-id="n2"]');
  check(!c2.includes('Sistema') && await p.$('[data-nota-id="n2"] .nota-ir') === null && await p.$('[data-nota-id="n2"] .nota-sistema') === null,
        'tarea de persona sin marca de sistema ni botón');
  await h.captura('tareas-enlace.png');

  h.paso('2. Ir → abre la sección y la ficha');
  await p.click('[data-nota-id="n1"] .nota-ir');
  await p.waitForTimeout(250);
  check(!(await p.evaluate(() => document.getElementById('notasPanel').classList.contains('open'))), 'cierra el bloc');
  check(await p.evaluate(() => document.getElementById('view-cobranza').classList.contains('active')), 'cambia a Cobranza');
  check(await p.evaluate(() => modalInscId === 'i1'), 'abre la ficha de la inscripción');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('3. Ir → a No llegaron con ciudad, y a la Recepción de un curso');
  await pintar([
    { ...base, id:'n3', texto:'Decidir no llegaron', de_sistema:true, nota_sistema:null, enlace:{ vista:'nollegaron', ciudad:'c1' } },
    { ...base, id:'n4', texto:'Cerrar recepción', de_sistema:true, nota_sistema:null, enlace:{ vista:'calendario', evento:'e1', etiqueta:'Abrir Recepción' } },
  ]);
  await p.click('[data-nota-id="n3"] .nota-ir');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('view-nollegaron').classList.contains('active')), 'cambia a No llegaron');
  check((await p.textContent('[data-nota-id="n3"] .nota-ir')).includes('Ir'), 'sin etiqueta dice Ir');
  await p.evaluate(() => document.getElementById('notasPanel').classList.add('open'));
  await p.click('[data-nota-id="n4"] .nota-ir');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.getElementById('recepcion').classList.contains('open')), 'abre la Recepción');
  check((await p.textContent('#recCiudad')).includes('Ciudad Prueba'), 'de la ciudad correcta');

  h.paso('4. El texto del comentario de sistema se escapa');
  await pintar([{ ...base, id:'n5', texto:'x', de_sistema:true, nota_sistema:'<img src=x onerror=alert(1)>', enlace:{ vista:'cobranza', etiqueta:'<b>z</b>' } }]);
  check(await p.$('[data-nota-id="n5"] .nota-sistema img') === null && await p.$('[data-nota-id="n5"] .nota-ir b') === null, 'no se interpreta HTML');

  await h.terminar();
})();
