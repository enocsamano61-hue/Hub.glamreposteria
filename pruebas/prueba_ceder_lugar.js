/* Ficha de la inscrita: "Ceder su lugar". No puede ir y va otra persona (la que diga la clienta) con lo que ya
   pagó; la misma inscripción pasa a la otra persona (función ceder_lugar de la base). Solo administradores y
   Cobranza. Origen: ticket #2 de Jared (26 oct 2026). Datos de ejemplo. */
const { abrirHub, ESTATUS_EJEMPLO } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const INSC = { id:'i1', persona_id:'p1', evento_id:'evA', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
  asesor_id:'u2', notas_migracion:null, fecha_proximo_pago:null, asistencia:null,
  personas:{ id:'p1', nombre:'ALUMNA QUE NO PUEDE', telefono_principal:'7831000001' }, eventos:{ fecha:mas(90), sede:'Salón', ciudades:{ nombre:'Ciudad A' } }, pagos:[] };
const PERSONAS = [
  { id:'p1', nombre:'ALUMNA QUE NO PUEDE', telefono_principal:'7831000001' },
  { id:'p2', nombre:'MAMA QUE SI VA', telefono_principal:'7831000002', en_lista_negra:false },
  { id:'p3', nombre:'PERSONA LISTA NEGRA', telefono_principal:'7831000003', en_lista_negra:true },
];

(async () => {
  const h = await abrirHub({ estatus:ESTATUS_EJEMPLO, tablas:{ inscripciones:[], personas:[], pagos:[] },
    usuario:{ id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:false } });
  const { p, check } = h;
  const abrir = async (extra = {}, usuario) => {
    await p.evaluate(([fila, personas, us]) => {
      if(us) usuarioActual = us;
      window.__tablas.inscripciones = [fila]; window.__tablas.personas = JSON.parse(JSON.stringify(personas)); window.__ops = [];
      window.__rpc.ceder_lugar = args => ({ de:'ALUMNA QUE NO PUEDE', a:'X', ciudad:'Ciudad A' });
      return abrirModalInscripcion('i1');
    }, [{ ...INSC, ...extra }, PERSONAS, usuario || null]);
    await p.waitForTimeout(300);
  };
  const visible = sel => p.$eval(sel, x => getComputedStyle(x).display !== 'none' && !x.hidden && !x.closest('[hidden]'));

  h.paso('1. Quién lo ve');
  await abrir();
  check(await visible('#btnCederLugar'), 'Cobranza ve "Ceder su lugar"');
  await abrir({}, { id:'u3', nombre:'Ventas Prueba', rol:'Ventas', es_admin:false });
  check(await visible('#btnCederLugar'), 'Ventas también lo ve (abierto para todos, 30 oct)');
  await abrir({}, { id:'u1', nombre:'Cobranza Prueba', rol:'Cobranza', es_admin:false });
  await abrir({ eventos:{ ...INSC.eventos, fecha:mas(-3) } });
  check(!(await visible('#btnCederLugar')), 'si su curso ya pasó no sale');
  await abrir({ asistencia:'llego' });
  check(!(await visible('#btnCederLugar')), 'si ya llegó no sale');

  h.paso('2. A alguien que ya está en el Hub');
  await abrir();
  await p.click('#btnCederLugar');
  check(await visible('#fichaCeder'), 'abre el panel');
  await p.fill('#cederTel', '783 100 0001');
  await p.waitForTimeout(200);
  check((await p.textContent('#cederEncontradas')).includes('su propio teléfono'), 'avisa si escriben su propio teléfono');
  await p.fill('#cederTel', '52 783 100 0002');
  await p.waitForTimeout(200);
  check((await p.textContent('#cederEncontradas')).includes('Mama Que Si Va') && !(await visible('#cederNombre')), 'la encuentra por su teléfono (con 52 y espacios) y no pide nombre');
  await h.limpiarOps();
  await p.click('#cederOk');
  await p.waitForTimeout(200);
  check((await p.textContent('#toast')).includes('motivo') && (await h.ops('rpc:ceder_lugar', 'rpc')).length === 0, 'sin motivo no deja');
  await p.fill('#cederMotivo', 'No puede ir, va su mamá');
  await h.captura('ceder-lugar-panel.png');
  await p.click('#cederOk');
  await p.waitForSelector('#modalConfirmar.open');
  const aviso = await p.textContent('#modalConfirmar');
  check(aviso.includes('Alumna Que No Puede') && aviso.includes('Mama Que Si Va') && aviso.includes('$700') && aviso.includes('su vendedora'), 'confirma de quién a quién, con lo que pagó');
  await h.captura('ceder-lugar-confirmar.png');
  await p.click('#confirmarSi');
  await p.waitForTimeout(400);
  const llamada = (await h.ops('rpc:ceder_lugar', 'rpc'))[0];
  check(llamada && llamada.p_insc === 'i1' && llamada.p_persona === 'p2' && llamada.p_motivo === 'No puede ir, va su mamá', 'lo hace la base de una sola vez (' + JSON.stringify(llamada) + ')');
  check((await h.ops('personas', 'insert')).length === 0, 'no da de alta a nadie si ya existía');
  const act = (await h.ops('actividad_usuario', 'insert')).find(a => a.accion === 'lugar_cedido');
  check(act && act.detalle.includes('Alumna Que No Puede → Mama Que Si Va') && act.detalle.includes('va su mamá'), 'queda en la actividad');
  check((await p.textContent('#toast')).includes('El lugar ahora es de Mama Que Si Va'), 'avisa que quedó');

  h.paso('3. A alguien nuevo');
  await abrir();
  await p.click('#btnCederLugar');
  await p.fill('#cederTel', '7831009999');
  await p.waitForTimeout(200);
  check(await visible('#cederNombre') && (await p.textContent('#cederEncontradas')).includes('No está en el Hub'), 'no está: pide su nombre');
  await p.fill('#cederMotivo', 'Va su hermana');
  await h.limpiarOps();
  await p.click('#cederOk');
  await p.waitForTimeout(200);
  check((await p.textContent('#toast')).includes('nombre completo'), 'sin nombre no deja');
  await p.fill('#cederNombre', 'Hermana Nueva Prueba');
  await p.click('#cederOk');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('se da de alta'), 'avisa que se da de alta');
  await p.click('#confirmarSi');
  await p.waitForTimeout(400);
  const alta = (await h.ops('personas', 'insert'))[0];
  const ll2 = (await h.ops('rpc:ceder_lugar', 'rpc'))[0];
  check(alta && alta.nombre === 'Hermana Nueva Prueba' && alta.telefono_principal === '7831009999', 'la da de alta con su nombre y teléfono');
  check(ll2 && ll2.p_persona && ll2.p_persona !== 'p1' && ll2.p_persona.startsWith('n'), 'y le pasa el lugar a ella');

  h.paso('4. Lista negra y errores de la base');
  await abrir();
  await p.click('#btnCederLugar');
  await p.fill('#cederTel', '7831000003');
  await p.waitForTimeout(200);
  check((await p.textContent('#cederEncontradas')).includes('Lista negra'), 'marca a quien está en lista negra');
  await p.fill('#cederMotivo', 'Prueba');
  await p.click('#cederOk');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('lista negra'), 'y lo advierte antes de confirmar');
  await p.evaluate(() => { window.__rpcReal = sb.rpc; sb.rpc = () => Promise.resolve({ data:null, error:{ message:'Esa persona ya está inscrita en este curso' } }); });
  await h.limpiarOps();
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await p.textContent('#toast')).includes('ya está inscrita en este curso') && !(await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'lugar_cedido'),
        'si la base lo frena, lo dice y no anota nada');
  await p.evaluate(() => { sb.rpc = window.__rpcReal; });

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await abrir();
  await p.click('#btnCederLugar');
  await p.fill('#cederTel', '7831000002');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.evaluate(() => document.getElementById('fichaCeder').scrollIntoView());
  await h.captura('ceder-lugar-celular.png');

  await h.terminar();
})();
