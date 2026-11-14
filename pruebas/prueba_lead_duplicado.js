/* Lead duplicado (14 nov 2026, pedido del equipo: el mismo alumno capturado por dos vendedoras, con el teléfono
   con un dígito distinto, "podemos quitar el que dice vendedor Jared").
   - Ficha del lead: aviso "Hay otro lead parecido en este curso" y botón "Es un duplicado".
   - Ventana: leads parecidos (misma regla de la base, leads_parecidos), "Es la misma persona" / "No es la misma",
     buscar otro; elegir cuál se queda (de quién es la venta) y con qué datos de la persona; la inscrita o quien
     tiene un pago por confirmar se queda por fuerza; lo hace la base de una sola vez (lead_marcar_duplicado).
   - El duplicado no sale en el tablero; su ficha lo dice, "Abrir el que quedó" y, solo administradores,
     "Ya no es duplicado" con motivo (lead_quitar_duplicado). El estatus "Duplicado" no se pone a mano.
   - "+ Nuevo lead" avisa si ya hay alguien parecido en ese curso, con "Abrir su lead".
   Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'A', fecha:mas(90), fecha_por_definir:false, curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const EST = [
  { id:1, clave:'pago_por_confirmar', etiqueta:'Pago por confirmar' },
  { id:2, clave:'no_vence_pago', etiqueta:'Aún no vence su pago' },
  { id:6, clave:'no_va_al_curso', etiqueta:'No va a ir al curso', es_final:true },
  { id:12, clave:'pagado', etiqueta:'Inscrita (anticipo confirmado)', es_final:true },
  { id:16, clave:'duplicado', etiqueta:'Duplicado', es_final:true }];
const XSS = 'ALUMNO <img src=x onerror=window.__xss=1> DUPLICADO';
const pA = { id:'pA', nombre:'ALUMNO REPETIDO', telefono_principal:'5510000001', telefono_alternativo:null, en_lista_negra:false };
const pB = { id:'pB', nombre:'ALUMNO REPETIDO', telefono_principal:'5510000071', telefono_alternativo:'5520000002', en_lista_negra:false };
const lead = (id, per, asesor, est, extra = {}) => ({ id, persona_id:per.id, estatus_id:est, estatus:{ id:est, etiqueta:EST.find(e => e.id === est).etiqueta },
  asesor_id:asesor, ciudad_interes_id:'cA', evento_id:'A', eventos:ev, creado_en:new Date().toISOString(), personas:{ ...per }, ...extra });
// Lo que contesta la base: el otro lead parecido del mismo curso
const candB = { lead_id:'lB', persona_id:'pB', nombre:'ALUMNO REPETIDO', telefono:'5510000071', telefono_alternativo:'5520000002', asesor_id:'u3',
  vendedora:'Vendedora Dos', estatus:'Aún no vence su pago', estatus_clave:'no_vence_pago', evento_id:'A', ciudad:'Ciudad A', fecha:ev.fecha,
  creado_en:new Date().toISOString(), motivo:'mismo_nombre', inscrita:false };

(async () => {
  const h = await abrirHub({ estatus:EST,
    tablas:{ pagos:[], interacciones:[], personas:[{ ...pA }, { ...pB }], personas_separadas:[], actividad_usuario:[],
      inscripciones:[{ id:'iViejo', persona_id:'pA', evento_id:'viejo' }],
      leads:[lead('lA', pA, 'u2', 2), lead('lB', pB, 'u3', 2), lead('lD', pA, 'u2', 16, { duplicado_de:'lB', duplicado_en:new Date().toISOString() })] },
    usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Gerente', es_admin:true },
    equipo:[{ id:'u1', nombre:'Admin Prueba', es_vendedor:false, rol:'Gerente' }, { id:'u2', nombre:'Vendedora Uno', es_vendedor:true, rol:'Ventas' },
            { id:'u3', nombre:'Vendedora Dos', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  const montar = () => p.evaluate(([e]) => {
    GIRAS = [{ id:'cur1', nombre:'CURSO PRUEBA' }]; EVENTOS_CAL = [e]; CIUDADES_GIRA_ACTIVA = ['cA'];
    leadsCache = window.__tablas.leads.filter(l => !esLeadDuplicado(l));
    window.__parecidos = [];
    window.__rpc.leads_parecidos = a => a.p_texto ? [] : window.__parecidos;
    window.__rpc.lead_marcar_duplicado = a => ({ queda:a.p_queda, duplicado:a.p_duplicado, persona:a.p_persona, telefono_agregado:'5520000002' });
    window.__rpc.lead_quitar_duplicado = a => ({ lead:a.p_lead });
    window.__rpc.glamy_buscar_persona = () => ({ encontradas:0, personas:[] });
    if(!window.__toasts){ window.__toasts = []; const t0 = toast; window.toast = (m, ...r) => { window.__toasts.push(String(m)); return t0(m, ...r); }; }
  }, [ev]);
  await montar();
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(500);
  await montar();

  h.paso('1. El duplicado no sale en el tablero');
  const enTablero = await p.evaluate(async () => (await cargarLeads()).map(l => l.id));
  check(enTablero.includes('lA') && enTablero.includes('lB') && !enTablero.includes('lD'), 'salen los dos abiertos y no el duplicado');

  h.paso('2. Ficha: aviso de lead parecido y botón');
  await p.evaluate(c => { window.__parecidos = [c]; }, candB);
  await p.evaluate(() => abrirModalLead('lA'));
  await p.waitForTimeout(400);
  const aviso = await p.textContent('#leadAvisoDuplicado');
  check(await p.isVisible('#leadAvisoDuplicado') && aviso.includes('otro lead parecido') && aviso.includes('Vendedora Dos') && aviso.includes('Mismo nombre'), 'avisa que hay otro parecido, de quién y por qué');
  check(await p.isVisible('#btnLeadDuplicado'), 'botón "Es un duplicado" a la vista');
  const opciones = await p.evaluate(() => [...document.querySelectorAll('#modalEstatusSelect option')].map(o => o.textContent));
  check(!opciones.includes('Duplicado') && !(await p.evaluate(() => document.getElementById('modalEstatusSelect').disabled)), '"Duplicado" no se pone a mano desde el estatus');
  const rpcArgs = (await h.ops('rpc:leads_parecidos', 'rpc')).pop();
  check(rpcArgs && rpcArgs.p_evento === 'A' && rpcArgs.p_persona === 'pA' && rpcArgs.p_excluir === 'lA' && rpcArgs.p_tel === '5510000001', 'pregunta a la base con su curso, su persona y su teléfono');
  await h.captura('lead-duplicado-ficha.png');

  h.paso('3. Ventana: la lista de parecidos');
  await p.click('[data-dup-revisar]');
  await p.waitForSelector('#modalDuplicado.open');
  await p.waitForTimeout(200);
  const lista = await p.textContent('#dupLista');
  check(lista.includes('5510000071') && lista.includes('alterno 5520000002') && lista.includes('Vendedora Dos') && lista.includes('Mismo nombre'), 'sale el otro lead con sus teléfonos, vendedora y por qué se parece');
  check(await p.isVisible('[data-dup-separar="lB"]'), 'y "No es la misma" (son dos personas en la base)');
  await h.captura('lead-duplicado-lista.png');

  h.paso('4. Elegir cuál se queda y con qué datos');
  await p.click('[data-dup-elegir="lB"]');
  await p.waitForTimeout(300);
  let cuerpo = await p.textContent('#dupCuerpo');
  check(cuerpo.includes('¿Cuál lead se queda?') && cuerpo.includes('¿Con qué datos de la persona?'), 'pregunta cuál se queda y con qué datos');
  check(await p.evaluate(() => document.querySelector('[data-dup-op="persona:este"]').classList.contains('active')) && cuerpo.includes('ya tomó 1 curso'),
    'propone los datos de la persona que ya tomó un curso');
  await p.click('[data-dup-op="queda:otro"]');
  cuerpo = await p.textContent('#dupCuerpo');
  check(cuerpo.includes('Se cierra el lead de Vendedora Uno') && cuerpo.includes('Se queda el de Vendedora Dos') && cuerpo.includes('5510000001'), 'el resumen dice qué pasa con cada uno');
  await h.captura('lead-duplicado-elegir.png');
  await p.fill('#dupMotivo', 'La venta es de la Vendedora Dos');
  await h.limpiarOps();
  await p.click('#dupConfirmar');
  await p.waitForTimeout(700);
  const args = (await h.ops('rpc:lead_marcar_duplicado', 'rpc'))[0];
  check(args && args.p_duplicado === 'lA' && args.p_queda === 'lB' && args.p_persona === 'pA' && args.p_motivo === 'La venta es de la Vendedora Dos', 'la base recibe el duplicado, el que queda, la persona y el motivo');
  const act = (await h.ops('actividad_usuario', 'insert')).find(a => a.accion === 'lead_duplicado');
  check(!!act && String(act.detalle).includes('se quedó el de Vendedora Dos'), 'queda en la actividad');
  check(await p.evaluate(() => window.__toasts.some(t => t.includes('el duplicado se cerró') && t.includes('alterno'))), 'avisa que se cerró y que el otro teléfono quedó como alterno');
  check(await p.evaluate(() => !document.getElementById('modalDuplicado').classList.contains('open') && leadAbiertoId === 'lB'), 'se abre el lead que quedó');

  h.paso('5. La inscrita (o con pago por confirmar) se queda por fuerza');
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open'); });
  await p.evaluate(c => { window.__parecidos = [{ ...c, estatus:'Inscrita (anticipo confirmado)', estatus_clave:'pagado' }]; }, candB);
  await p.evaluate(() => abrirModalLead('lA'));
  await p.waitForTimeout(300);
  await p.click('#btnLeadDuplicado');
  await p.waitForTimeout(300);
  await p.click('[data-dup-elegir="lB"]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.querySelector('[data-dup-op="queda:este"]').disabled && document.querySelector('[data-dup-op="queda:otro"]').classList.contains('active')
    && document.querySelector('[data-dup-op="persona:otro"]').classList.contains('active') && document.querySelector('[data-dup-op="persona:este"]').disabled),
    'se queda la inscrita, con sus datos, y no se puede elegir lo contrario');

  h.paso('6. "No es la misma": ya no se sugiere');
  await p.evaluate(c => { window.__parecidos = [c]; }, candB);
  await p.click('#dupVolver');
  await h.limpiarOps();
  await p.click('[data-dup-separar="lB"]');
  await p.waitForTimeout(400);
  const sep = (await h.ops('personas_separadas', 'insert'))[0];
  check(sep && sep.persona_a === 'pA' && sep.persona_b === 'pB' && sep.creado_por === 'u1', 'se guarda la pareja en personas_separadas (en orden)');
  check((await p.textContent('#dupLista')).includes('No encontré leads parecidos'), 'sale de la lista');
  await p.evaluate(() => document.getElementById('modalDuplicado').classList.remove('open'));

  h.paso('7. Ficha de un duplicado');
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open'); leadsCache.push(window.__tablas.leads.find(l => l.id === 'lD')); abrirModalLead('lD'); });
  await p.waitForTimeout(300);
  const av = await p.textContent('#leadAvisoDuplicado');
  check(av.includes('Este lead es un duplicado') && av.includes('Abrir el que quedó') && av.includes('Ya no es duplicado'), 'lo dice, con "Abrir el que quedó" y (administrador) "Ya no es duplicado"');
  check(!(await p.isVisible('#btnLeadDuplicado')) && await p.evaluate(() => document.getElementById('modalEstatusSelect').disabled), 'sin "Es un duplicado" y su estatus no se cambia aquí');
  await h.captura('lead-duplicado-cerrado.png');
  await p.click('#btnYaNoDuplicado');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(300);
  check((await h.ops('rpc:lead_quitar_duplicado', 'rpc')).length === 0, 'sin motivo no lo regresa');
  await p.click('#btnYaNoDuplicado');
  await p.waitForSelector('#modalConfirmar.open');
  await p.fill('#confirmarMotivo', 'Eran dos personas');
  await p.click('#confirmarSi');
  await p.waitForTimeout(500);
  const q = (await h.ops('rpc:lead_quitar_duplicado', 'rpc'))[0];
  check(q && q.p_lead === 'lD' && q.p_motivo === 'Eran dos personas', 'con motivo, la base lo vuelve a abrir');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'lead_ya_no_duplicado'), 'queda en la actividad');
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open');
    usuarioActual = { ...usuarioActual, es_admin:false }; abrirModalLead('lD'); });
  await p.waitForTimeout(300);
  check(!(await p.textContent('#leadAvisoDuplicado')).includes('Ya no es duplicado'), 'quien no es administrador no ve "Ya no es duplicado"');
  await p.click('[data-dup-abrir]');
  await p.waitForTimeout(400);
  check(await p.evaluate(() => leadAbiertoId === 'lB'), '"Abrir el que quedó" abre el otro lead');
  await p.evaluate(() => { document.getElementById('modalLead').classList.remove('open'); usuarioActual = { ...usuarioActual, es_admin:true }; });

  h.paso('8. "+ Nuevo lead": avisa si ya hay alguien parecido en el curso');
  await p.evaluate(([c, x]) => { window.__parecidos = [{ ...c, nombre:x }]; }, [candB, XSS]);
  await p.click('#btnNuevoLead');
  await p.waitForSelector('#modalNuevo.open');
  await p.evaluate(() => { const s = document.getElementById('nuevoEvento'); s.innerHTML = opcionesEvento(null); s.value = 'A'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  await p.fill('#nuevoNombre', 'Alumno Repetido');
  await p.fill('#nuevoTelefono', '5510000081');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForSelector('#modalConfirmar.open');
  const conf = await p.textContent('#confirmarAviso');
  check(conf.includes('ya hay un lead parecido') && conf.includes('Vendedora Dos') && conf.includes('Abrir su lead'), 'avisa antes de crear, con "Abrir su lead"');
  check(await p.evaluate(() => !window.__xss), 'el nombre se escapa');
  check((await h.ops('rpc:leads_parecidos', 'rpc')).some(a => a.p_evento === 'A' && a.p_nombre === 'Alumno Repetido' && a.p_tel === '5510000081'), 'pregunta a la base con lo que se escribió');
  await h.captura('lead-duplicado-alta.png');
  await p.click('[data-abrir-parecido="lB"]');
  await p.waitForTimeout(400);
  check((await h.ops('leads', 'insert')).length === 0 && await p.evaluate(() => leadAbiertoId === 'lB' && !document.getElementById('modalNuevo').classList.contains('open')),
    '"Abrir su lead": no crea nada y abre el que existe');
  await p.evaluate(() => document.getElementById('modalLead').classList.remove('open'));
  await p.click('#btnNuevoLead');
  await p.waitForSelector('#modalNuevo.open');
  await p.evaluate(() => { const s = document.getElementById('nuevoEvento'); s.innerHTML = opcionesEvento(null); s.value = 'A'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  await p.fill('#nuevoNombre', 'Alumno Repetido');
  await p.fill('#nuevoTelefono', '5510000081');
  await p.click('#guardarNuevoLead');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(700);
  check((await h.ops('leads', 'insert')).length === 1, '"Es otra persona": sí lo crea');
  await p.evaluate(() => { window.__parecidos = []; });

  h.paso('9. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(c => { document.getElementById('modalNuevo').classList.remove('open'); document.getElementById('modalLead').classList.remove('open'); window.__parecidos = [c]; abrirModalLead('lA'); }, candB);
  await p.waitForTimeout(300);
  await p.click('#btnLeadDuplicado');
  await p.waitForTimeout(300);
  await p.click('[data-dup-elegir="lB"]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392 && document.querySelector('#modalDuplicado .modal').scrollWidth <= document.querySelector('#modalDuplicado .modal').clientWidth + 1), 'sin scroll de lado');
  await h.captura('lead-duplicado-celular.png');

  await h.terminar();
})();
