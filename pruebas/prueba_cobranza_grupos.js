/* Cobranza → Por cobrar: las inscritas con anticipo que se cobran el día de su curso van en su propio grupo
   verde "Con anticipo · se cobra en el curso" (antes caían en "Más adelante" con un círculo blanco y
   parecía que no tenían estatus) y cada inscrita dice cuánto pagó y cuánto debe. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = (id, dias) => ({ id, fecha:mas(dias), curso_id:'cur1', ciudades:{ id:'c' + id, nombre:'Ciudad ' + id } });
const insc = (id, nombre, extra) => ({ id, anticipo:700, restante:700, liquidado:false, precio_pactado:1400, paquete:'BASICO', asesor_id:'u2', fecha_proximo_pago:null,
  personas:{ id:'p' + id, nombre, telefono_principal:'55000000' + id.slice(-2).padStart(2, '0') }, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' }, ...extra });
const lead = (id, nombre, extra) => ({ id, persona_id:'p' + id, estatus_id:2, estatus:{ id:2 }, asesor_id:'u2', ciudad_interes_id:'cA', creado_en:new Date().toISOString(),
  personas:{ id:'p' + id, nombre, telefono_principal:'5511111111' }, ...extra });

(async () => {
  const h = await abrirHub({ tablas:{
      inscripciones:[
        insc('i1', 'Con Anticipo Curso Lejano', { eventos:ev('A', 60) }),
        insc('i2', 'Con Fecha De Pago', { eventos:ev('B', 60), fecha_proximo_pago:mas(20) }),
        insc('i3', 'Curso Esta Semana', { eventos:ev('C', 3) }),
        insc('i4', 'Sin Pago Curso Lejano', { eventos:ev('D', 70), anticipo:0, restante:1400, estatus:{ id:2, clave:'no_vence_pago' } }),
      ],
      leads:[
        lead('l1', 'Lead Promesa Lejana', { fecha_compromiso_pago:mas(30) }),
        lead('l2', 'Lead Sin Fecha', {}),
        lead('l3', 'Lead Por Confirmar', { estatus_id:1, estatus:{ id:1 }, pago_reportado_monto:700, pago_reportado_en:new Date().toISOString() }),
      ],
      pagos:[],
    },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(async () => {
    cursoActivoIdCache = 'cur1'; CIUDADES_GIRA_ACTIVA = ['cA'];
    setActiveSection('cobranza');
    await renderCobranza();
  });
  await p.waitForTimeout(500);
  const grupo = g => p.$$eval(`#cobG-${g} .cob-fila .cob-nombre`, xs => xs.map(x => x.textContent));

  h.paso('1. Por cobrar más simple (30 oct): 6 grupos, sin filtros de Leads/Inscritas ni de vendedora');
  check((await p.$$eval('#cobGrupos > details', xs => xs.map(x => x.dataset.cobGrupo))).join() === 'confirmar,vencidos,hoy,sinfecha,despues,pasado', 'los grupos que quedan');
  check(!(await p.$('#cobQuien')) && !(await p.$('#cobVendedor')) && !!(await p.$('#cobBuscar')), 'sin los filtros de Leads/Inscritas ni de vendedora; queda el buscador');
  const curso = await grupo('despues');
  check(curso.some(t => t.includes('Con Anticipo Curso Lejano')), 'con anticipo que se cobra el día de su curso: "Más adelante"');

  h.paso('2. "Más adelante" ya no lleva círculo blanco');
  const despues = await grupo('despues');
  check(despues.some(t => t.includes('Con Fecha De Pago')) && despues.some(t => t.includes('Lead Promesa Lejana')) && !despues.some(t => t.includes('Sin Pago Curso Lejano')),
        'con fecha de pago lejana: ' + despues.join(' | '));
  check((await p.$$eval('#cobGrupos .cob-meta .tc-tel', xs => xs.map(x => x.textContent))).includes('5511111111'), 'cada renglón trae su celular a 10 dígitos para copiarlo (pedido de Jared)');
  check(await p.$eval('#cobG-despues summary .cob-punto', x => getComputedStyle(x).backgroundColor) === 'rgb(74, 125, 181)', 'punto azul, no blanco');
  check((await grupo('hoy')).some(t => t.includes('Curso Esta Semana')) && (await grupo('sinfecha')).some(t => t.includes('Lead Sin Fecha')) && (await grupo('sinfecha')).some(t => t.includes('Sin Pago Curso Lejano'))
        && (await grupo('confirmar')).some(t => t.includes('Lead Por Confirmar')), 'lo urgente sigue en su grupo de siempre');

  h.paso('3. Cada inscrita dice cuánto pagó y cuánto debe');
  await p.evaluate(() => { document.getElementById('cobG-despues').open = true; });
  const fila = await p.textContent('#cobG-despues .cob-fila[data-cob-id="i1"]');
  check(fila.includes('Inscrita · con anticipo') && fila.includes('Pagó $700 de $1,400 · debe $700'), 'con anticipo: "Pagó $700 de $1,400 · debe $700"');
  // La inscrita sin pago y sin fecha ya no se esconde en "Más adelante" (caso Miriam, 28 oct)
  const f4 = await p.textContent('#cobG-sinfecha .cob-fila[data-cob-id="i4"]');
  check(f4.includes('Inscrita · sin pago') && f4.includes('Sin pago · debe $1,400'), 'sin pago lo dice');
  check(!(await p.textContent('#cobG-hoy')).includes('Lead · Pagó'), 'los leads no traen esa línea');
  await p.evaluate(() => document.getElementById('cobG-despues').scrollIntoView());
  await h.captura('cobranza-grupo-curso.png');

  h.paso('4. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('cobranza-grupo-curso-celular.png');

  await h.terminar();
})();
