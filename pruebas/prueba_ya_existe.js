/* ¿Ya existe? Para que no se dupliquen leads (después del ticket #1):
   - Nuevo lead: el teléfono va primero y, al escribirlo, dice si ya está en el Hub (inscrita, lead,
     alumna de antes) con botones para abrir su ficha o su lead.
   - Si ya está inscrita en un curso que no ha pasado, avisa al guardar y deja decidir.
   - El mismo número con otro formato (52, espacios) no crea otra persona.
   - El buscador del tablero encuentra teléfonos con espacios y muestra a quien está fuera del tablero.
   La búsqueda de la base (glamy_buscar_persona) se simula con window.__rpc. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const PERSONAS_RPC = {
  '5510000001': { persona_id:'pI', nombre:'Alumna Inscrita Prueba', telefono:'525510000001', vip:false,
    cursos:[{ inscripcion_id:'iI', ciudad:'Ciudad Prueba', fecha:mas(10), debe:700 }], leads:[] },
  '5510000003': { persona_id:'pA', nombre:'Alumna De Antes', telefono:'5510000003', vip:true,
    cursos:[{ inscripcion_id:'iA', ciudad:'Ciudad Vieja', fecha:'2025-07-20', debe:0 }], leads:[] },
};
const FUERA = { persona_id:'pF', nombre:'<img src=x onerror="window.__xss=1"> Fuera', telefono:'5510000009', vip:false, cursos:[],
  leads:[{ lead_id:'lF', estatus:'Aún no vence su pago', vendedora:'Vendedora Prueba', ciudad_interes:'Otra Ciudad' }] };

(async () => {
  const h = await abrirHub({ tablas:{
      personas:[{ id:'pI', nombre:'Alumna Inscrita Prueba', telefono_principal:'525510000001' }],
      leads:[{ id:'lF', persona_id:'pF', estatus_id:2, estatus:{ id:2 }, ciudad_interes_id:'c9', personas:{ id:'pF', nombre:'Fuera', telefono_principal:'5510000009' } }],
      interacciones:[], mensajes_predeterminados:[],
    } });
  const { p, check } = h;
  await p.evaluate(([rpc, fuera]) => {
    window.__rpc.glamy_buscar_persona = ({ p_texto }) => {
      const dig = p_texto.replace(/\D/g, '').slice(-10);
      if(rpc[dig]) return { encontradas:1, personas:[rpc[dig]] };
      if(/fuera|5510000009/i.test(p_texto.replace(/\s/g, ''))) return { encontradas:1, personas:[fuera] };
      return { encontradas:0, personas:[] };
    };
    window.__abrio = null;
    abrirModalInscripcion = id => { window.__abrio = 'insc:' + id; };
    abrirModalLead = id => { window.__abrio = 'lead:' + id; };
  }, [PERSONAS_RPC, FUERA]);
  const nuevo = async () => { await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open'); };

  h.paso('1. Nuevo lead: el teléfono primero y aviso al escribirlo');
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(300);
  await nuevo();
  const orden = await p.$$eval('#modalNuevo .modal-field input', xs => xs.slice(0, 2).map(x => x.id));
  check(orden.join() === 'nuevoTelefono,nuevoNombre', 'el teléfono va antes que el nombre');
  await p.fill('#nuevoTelefono', '551000000');
  await p.waitForTimeout(450);
  check(await p.textContent('#nuevoExiste') === '', 'con menos de 10 dígitos no busca');
  await p.fill('#nuevoTelefono', '55 1000 0001');
  await p.waitForTimeout(450);
  const caja = await p.textContent('#nuevoExiste');
  check(caja.includes('Este número ya está en el Hub') && caja.includes('Alumna Inscrita Prueba') && caja.includes('Inscrita · Ciudad Prueba') && caja.includes('debe $700'),
        'dice que ya existe, dónde está inscrita y cuánto debe');
  await h.captura('ya-existe-nuevo-lead.png');
  await p.click('#nuevoExiste [data-exi-insc="iI"]');
  check(await p.evaluate(() => window.__abrio) === 'insc:iI' && !(await p.evaluate(() => document.getElementById('modalNuevo').classList.contains('open'))),
        '"Abrir ficha" cierra el formulario y abre su ficha');

  h.paso('2. Guardar de todos modos: avisa y deja decidir');
  await nuevo();
  check(await p.textContent('#nuevoExiste') === '', 'el formulario empieza limpio');
  await p.fill('#nuevoTelefono', '5510000001');
  await p.fill('#nuevoNombre', 'Alumna Inscrita Prueba');
  await p.waitForTimeout(450);
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForSelector('#modalConfirmar.open');
  check((await p.textContent('#modalConfirmar')).includes('Ya está inscrita') && (await p.textContent('#modalConfirmar')).includes('Ciudad Prueba'), 'avisa que ya está inscrita');
  await h.captura('ya-existe-aviso.png');
  await p.click('#confirmarNo');
  await p.waitForTimeout(200);
  check((await h.ops('leads', 'insert')).length === 0, 'cancelar no crea nada');
  await p.click('#guardarNuevoLead');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(500);
  const lead = (await h.ops('leads', 'insert'))[0];
  check(lead && lead.persona_id === 'pI' && (await h.ops('personas', 'insert')).length === 0,
        'lo crea si deciden, sobre la MISMA persona (su número estaba guardado con 52)');

  h.paso('3. Alumna de un curso que ya pasó: solo informa');
  await nuevo();
  await p.fill('#nuevoTelefono', '5510000003');
  await p.waitForTimeout(450);
  check((await p.textContent('#nuevoExiste')).includes('Fue alumna · Ciudad Vieja') && (await p.textContent('#nuevoExiste')).includes('liquidada'), 'dice que fue alumna antes');
  await p.fill('#nuevoNombre', 'Alumna De Antes');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(500);
  check(!(await p.evaluate(() => document.getElementById('modalConfirmar').classList.contains('open'))) && (await h.ops('leads', 'insert')).length === 1,
        'no pregunta: se crea el lead para el curso nuevo');

  h.paso('4. Buscador del tablero');
  await p.evaluate(() => { leadsCache = [{ id:'lB', estatus:{ id:2 }, personas:{ id:'pB', nombre:'Lead Del Tablero', telefono_principal:'5510000002' } }]; pintarBoard(); });
  await p.fill('#searchInput', '55 1000 0002');
  await p.waitForTimeout(500);
  check(await p.evaluate(() => filasActuales().filter(r => r.personas?.id === 'pB').length) === 1 && (await p.textContent('#board')).includes('Lead Del Tablero'),
        'encuentra el teléfono aunque lo escriban con espacios');
  check(await p.textContent('#boardFuera') === '', 'quien ya está en el tablero no se repite abajo');
  await p.fill('#searchInput', 'fuera');
  await p.waitForTimeout(600);
  const fuera = await p.textContent('#boardFuera');
  check(fuera.includes('Fuera del tablero también existe') && fuera.includes('Lead de Vendedora Prueba') && fuera.includes('Otra Ciudad'), 'muestra a quien está fuera del tablero');
  check(!(await p.evaluate(() => window.__xss)), 'los nombres se escapan');
  await h.captura('ya-existe-tablero.png');
  await p.click('#boardFuera [data-exi-lead="lF"]');
  await p.waitForTimeout(300);
  check(await p.evaluate(() => window.__abrio) === 'lead:lF' && await p.evaluate(() => leadsCache.some(l => l.id === 'lF')), '"Abrir lead" trae el lead de otra ciudad y lo abre');
  await p.fill('#searchInput', 'ab');
  await p.waitForTimeout(500);
  check(await p.textContent('#boardFuera') === '', 'con poco texto no busca fuera');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.fill('#searchInput', 'fuera');
  await p.waitForTimeout(600);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'tablero sin scroll de lado');
  await h.captura('ya-existe-tablero-celular.png');
  await nuevo();
  await p.fill('#nuevoTelefono', '5510000001');
  await p.waitForTimeout(450);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'formulario sin scroll de lado');
  await h.captura('ya-existe-nuevo-lead-celular.png');

  await h.terminar();
})();
