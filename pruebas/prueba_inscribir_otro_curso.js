/* Venderle otro curso a alguien que ya conocemos (sin trámites):
   - "+ Nuevo lead": si su lead de antes está cerrado o es de un curso que ya pasó, se crea uno nuevo
     (el viejo queda igual). Solo se detiene si alguien la está trabajando (lead abierto de esta gira).
   - El selector de curso pone arriba los de la ciudad de su lada y luego los de su estado.
   - "Inscribir a un curso" en el aviso "ya está en el Hub", en Historial cliente y en su ficha:
     elige curso, paquete y pago, y queda SIEMPRE "Pago por confirmar" para Cobranza.
   Datos de ejemplo, sin personas reales. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const CIUDADES_EJ = [
  { id:'cPue', nombre:'Puebla', estado:'Puebla' },
  { id:'cTux', nombre:'Tuxpan', estado:'Veracruz' },
  { id:'cPoz', nombre:'Poza Rica', estado:'Veracruz' },
];
const EVENTOS_EJ = [
  { id:'evPue', fecha:mas(5),  ciudad_id:'cPue', curso_id:'cur1', ciudades:{ nombre:'Puebla' } },
  { id:'evPoz', fecha:mas(9),  ciudad_id:'cPoz', curso_id:'cur1', ciudades:{ nombre:'Poza Rica' } },
  { id:'evTux', fecha:mas(12), ciudad_id:'cTux', curso_id:'cur1', ciudades:{ nombre:'Tuxpan' } },
];
const per = (id, nombre, tel) => ({ id, nombre, telefono_principal:tel });
const PERSONAS_RPC = {
  '7831000001': { persona_id:'pV', nombre:'Alumna De Poza Rica', telefono:'7831000001', vip:false,
    cursos:[{ inscripcion_id:'iV', ciudad:'Poza Rica', fecha:'2025-03-12', debe:0 }],
    leads:[{ lead_id:'lV', estatus:'Inscrita (anticipo confirmado)', vendedora:'Recepción Prueba', ciudad_interes:'Poza Rica' }] },
};

(async () => {
  const h = await abrirHub({ tablas:{
      personas:[per('pV', 'Alumna De Poza Rica', '7831000001'), per('pO', 'Lead Abierto Prueba', '2221000002'), per('pY', 'Ya Inscrita Prueba', '7831000003')],
      leads:[
        // Lead viejo y cerrado (ya fue alumna): no estorba.
        { id:'lV', persona_id:'pV', estatus_id:12, estatus:{ id:12, etiqueta:'Inscrita (anticipo confirmado)' }, asesor_id:'u1', creado_en:'2025-02-01T10:00:00Z',
          eventos:{ id:'evViejo', fecha:'2025-03-12', ciudad_id:'cPoz', ciudades:{ nombre:'Poza Rica' } }, personas:per('pV', 'Alumna De Poza Rica', '7831000001') },
        // Lead abierto de esta gira: alguien la está trabajando.
        { id:'lO', persona_id:'pO', estatus_id:2, estatus:{ id:2, etiqueta:'Aún no vence su pago' }, asesor_id:'u2', creado_en:new Date().toISOString(), evento_id:'evPue',
          eventos:{ id:'evPue', fecha:mas(5), ciudad_id:'cPue', ciudades:{ nombre:'Puebla' } }, personas:per('pO', 'Lead Abierto Prueba', '2221000002') },
      ],
      inscripciones:[
        { id:'iY', persona_id:'pY', evento_id:'evTux', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO', asesor_id:'u2',
          notas_migracion:null, personas:{ id:'pY', nombre:'Ya Inscrita Prueba', telefono_principal:'7831000003' },
          eventos:{ fecha:mas(12), sede:'Salón', ciudades:{ nombre:'Tuxpan' } }, pagos:[] },
      ],
      ladas:[{ lada:'783', estado:'Veracruz', localidades:['Tuxpan de Rodríguez Cano (Tuxpan)', 'Álamo'] }],
      vista_personas_busqueda:[{ ...per('pV', 'Alumna De Poza Rica', '7831000001'), nombre_norm:'alumna de poza rica', tel10:'7831000001', alt10:'', telefono_alternativo:null, correo:'', fecha_nacimiento:null, en_lista_negra:false }],
      vista_alumnos:[{ inscripcion_id:'iV', persona_id:'pV', curso:'Cupcakes', ciudad:'Poza Rica', fecha:'2025-03-12', precio_pactado:1400, anticipo:1400, restante:0, liquidado:true, pago:'liq', paquete:'BASICO', asesor_id:'u1' }],
      personas_separadas:[], interacciones:[], mensajes_predeterminados:[],
    },
    usuario:{ id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false } });
  const { p, check } = h;
  await p.evaluate(([ciudades, eventos, rpc]) => {
    CIUDADES = ciudades; EVENTOS_CAL = eventos; EVENTOS_CAL_PASADOS = [];
    CIUDADES_GIRA_ACTIVA = ciudades.map(c => c.id);
    cursoActivoIdCache = 'cur1'; inicioGiraCache = '2026-09-01';
    window.__rpc.glamy_buscar_persona = ({ p_texto }) => {
      const dig = p_texto.replace(/\D/g, '').slice(-10);
      return rpc[dig] ? { encontradas:1, personas:[rpc[dig]] } : { encontradas:0, personas:[] };
    };
    window.renderBoard = async () => {}; window.renderDashboard = async () => {};
  }, [CIUDADES_EJ, EVENTOS_EJ, PERSONAS_RPC]);
  const nuevo = async () => { await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open'); };
  const grupos = sel => p.$$eval(sel + ' + .bc .bc-grupo, ' + sel + ' ~ .bc .bc-grupo', xs => xs.map(x => x.textContent));
  const itemsLista = sel => p.$$eval(sel + ' ~ .bc .bc-item', xs => xs.map(x => x.textContent));

  h.paso('1. Selector de curso: primero su lada, luego su estado');
  await p.evaluate(() => setActiveSection('board'));
  await nuevo();
  await p.fill('#nuevoTelefono', '783 100 0001');
  await p.waitForTimeout(700);
  await p.click('#nuevoEventoBuscar');
  await p.waitForTimeout(200);
  const g = await grupos('#nuevoEvento');
  const it = await itemsLista('#nuevoEvento');
  check(g[0]?.includes('Por su lada (783)') && g[1]?.includes('Mismo estado') && g[2]?.includes('Otras ciudades'), 'grupos: su lada, su estado, el resto (' + g.join(' | ') + ')');
  check(it[1]?.includes('Tuxpan') && it[2]?.includes('Poza Rica') && it[3]?.includes('Puebla'), 'Tuxpan arriba aunque Puebla sea antes (' + it.slice(0, 4).join(' | ') + ')');
  await h.captura('otro-curso-selector-lada.png');
  await p.keyboard.press('Escape');

  h.paso('2. Nuevo lead de alguien que ya fue alumna: se crea sin trabas');
  check((await p.textContent('#nuevoExiste')).includes('Fue alumna · Poza Rica') && (await p.textContent('#nuevoExiste')).includes('Inscribir a un curso'),
        'el aviso dice que fue alumna y ofrece "Inscribir a un curso"');
  await h.captura('otro-curso-aviso-existe.png');
  await p.fill('#nuevoNombre', 'Alumna De Poza Rica');
  await p.evaluate(() => { const s = document.getElementById('nuevoEvento'); s.value = 'evTux'; s.dispatchEvent(new Event('change')); });
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(600);
  const creado = (await h.ops('leads', 'insert'))[0];
  check(creado && creado.persona_id === 'pV' && creado.evento_id === 'evTux' && creado.asesor_id === 'u2', 'lead nuevo a Tuxpan, misma persona, a nombre de quien vende');
  check((await h.ops('leads', 'update')).length === 0 && !(await p.evaluate(() => document.getElementById('modalConfirmar').classList.contains('open'))),
        'no pregunta ni toca el lead viejo de Poza Rica');
  check((await p.textContent('#toast')).includes('sus cursos y leads de antes siguen igual'), 'avisa que su historia queda igual');

  h.paso('3. Lead abierto de esta gira: sí se detiene');
  await nuevo();
  await p.fill('#nuevoTelefono', '2221000002');
  await p.fill('#nuevoNombre', 'Lead Abierto Prueba');
  await p.waitForTimeout(500);
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('ya es lead de') && (await p.textContent('#modalConfirmar')).includes('Vendedora Prueba'), 'avisa de quién es el lead abierto');
  await p.click('#confirmarNo');
  await p.waitForTimeout(200);
  check((await h.ops('leads', 'insert')).length === 0, 'no crea otro');
  await p.click('#closeModalNuevo');

  h.paso('4. "Inscribir a un curso" desde el aviso: queda por confirmar para Cobranza');
  await nuevo();
  await p.fill('#nuevoTelefono', '7831000001');
  await p.waitForTimeout(600);
  await p.click('#nuevoExiste [data-exi-curso="pV"]');
  await p.waitForSelector('#modalRegistrarPago.open');
  check(!(await p.evaluate(() => document.getElementById('modalNuevo').classList.contains('open'))), 'cierra el formulario de nuevo lead');
  check(await p.textContent('#regPagoTitulo') === 'Inscribir a un curso' && await p.isVisible('#regPagoVendedorCampo'), 'título y "¿Quién vendió?"');
  check(await p.inputValue('#regPagoEvento') === 'evTux', 'ya trae el curso de su lada (Tuxpan)');
  await h.captura('otro-curso-inscribir.png');
  await p.fill('#regPagoMonto', '700');
  await p.fill('#regPagoBanco', 'BBVA');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForTimeout(600);
  const nl = (await h.ops('leads', 'insert'))[0];
  check(nl && nl.persona_id === 'pV' && nl.evento_id === 'evTux' && nl.estatus_id === 1 && nl.pago_reportado_monto === 700 && nl.asesor_id === 'u2' && nl.estatus_antes_de_reporte === 2,
        'crea su lead en "Pago por confirmar" con el pago (' + JSON.stringify(nl) + ')');
  check((await h.ops('inscripciones', 'insert')).length === 0 && (await h.ops('pagos', 'insert')).length === 0, 'no la inscribe sola: pasa por Cobranza');
  const idNuevo = (await h.filas('leads')).find(l => l.persona_id === 'pV' && l.evento_id === 'evTux' && l.pago_reportado_monto === 700)?.id;
  check(idNuevo && (await h.ops('interacciones', 'insert')).some(i => i.lead_id === idNuevo) && (await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'pago_reportado'),
        'queda en su historial y en la actividad');
  check((await p.textContent('#toast')).includes('Cobranza la inscribe'), 'dice que Cobranza la inscribe');

  h.paso('5. Cancelar no deja nada; con lead abierto usa ese lead');
  await p.evaluate(() => abrirInscribirACurso({ personaId:'pV', nombre:'Alumna De Poza Rica', telefono:'7831000001' }));
  await p.waitForSelector('#modalRegistrarPago.open');
  await h.limpiarOps();
  await p.click('#closeModalRegistrarPago');
  check((await h.ops('leads', 'insert')).length === 0 && await p.textContent('#regPagoTitulo') === 'Registrar pago', 'cancelar no crea nada y el modal vuelve a ser "Registrar pago"');
  await p.evaluate(() => abrirInscribirACurso({ personaId:'pO', nombre:'Lead Abierto Prueba', telefono:'2221000002' }));
  await p.waitForSelector('#modalRegistrarPago.open');
  check((await p.textContent('#regPagoAntes')).includes('Ya es lead de Vendedora Prueba') && !(await p.isVisible('#regPagoVendedorCampo')), 'avisa que ya es lead y usa ese');
  await p.evaluate(() => { const s = document.getElementById('regPagoEvento'); s.value = 'evPue'; });
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForTimeout(600);
  const up = (await h.ops('leads', 'update'))[0];
  check((await h.ops('leads', 'insert')).length === 0 && up && up.estatus_id === 1 && up.asesor_id === 'u2', 'actualiza su lead abierto, no crea otro');

  h.paso('6. Ya inscrita en ese curso: su ficha con el pago escrito');
  await p.evaluate(() => abrirInscribirACurso({ personaId:'pY', nombre:'Ya Inscrita Prueba', telefono:'7831000003' }));
  await p.waitForSelector('#modalRegistrarPago.open');
  await p.fill('#regPagoMonto', '500');
  await h.limpiarOps();
  await p.click('#guardarRegistrarPago');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('Ya está inscrita en ese curso'), 'avisa que ya está inscrita');
  await p.click('#confirmarSi');
  await p.waitForTimeout(600);
  check(await p.evaluate(() => modalInscId === 'iY') && await p.inputValue('#modalPagoMonto') === '500' && (await h.ops('leads', 'insert')).length === 0,
        'abre su ficha con el pago escrito y no crea lead');

  h.paso('7. Desde su ficha: "Otro curso"');
  check(await p.isVisible('#btnInscOtroCurso'), 'la ficha tiene "Otro curso"');
  await p.click('#btnInscOtroCurso');
  await p.waitForSelector('#modalRegistrarPago.open');
  check(!(await p.evaluate(() => document.getElementById('modalInscripcion').classList.contains('open'))) && (await p.textContent('#regPagoAntes')).includes('queda igual'),
        'cierra la ficha y dice que su curso queda igual');
  await p.click('#closeModalRegistrarPago');

  h.paso('8. Desde Historial cliente');
  await p.evaluate(() => verEnHistorial('pV'));
  await p.waitForTimeout(900);
  check(await p.isVisible('[data-hx-acc="inscribir"]'), 'Historial cliente tiene "Inscribir a un curso"');
  await h.captura('otro-curso-historial.png');
  await p.click('[data-hx-acc="inscribir"]');
  await p.waitForSelector('#modalRegistrarPago.open');
  check(await p.textContent('#regPagoTitulo') === 'Inscribir a un curso' && (await p.textContent('#regPagoQuien')).includes('Alumna De Poza Rica'), 'abre "Inscribir a un curso" con sus datos');

  h.paso('9. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('otro-curso-inscribir-celular.png');
  await p.click('#closeModalRegistrarPago');
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById('btnNuevoLead').click());
  await p.waitForSelector('#modalNuevo.open');
  await p.fill('#nuevoTelefono', '7831000001');
  await p.waitForTimeout(600);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'el aviso cabe en celular');
  await h.captura('otro-curso-aviso-celular.png');

  await h.terminar();
})();
