/* Buscar por el teléfono alterno (11 nov 2026, pedido de una vendedora: "filtro el segundo número y no me aparece la alumna").
   - Alumnos y Leads: el buscador encuentra por el principal o por el alterno (con espacios o 52) y la tarjeta dice
     "Encontrada por su teléfono alterno".
   - Cobranza → Por cobrar: igual.
   - Ceder su lugar: encuentra a quien irá por su teléfono alterno.
   - telCoincide: una sola regla para todos. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'ev1', fecha:mas(40), curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const ana = { id:'p1', nombre:'ALUMNA CON DOS NUMEROS', telefono_principal:'5510000001', telefono_alternativo:'5520000002', en_lista_negra:false };
const otra = { id:'p2', nombre:'OTRA ALUMNA', telefono_principal:'5530000003', telefono_alternativo:null, en_lista_negra:false };

(async () => {
  const h = await abrirHub({ tablas:{ pagos:[], interacciones:[], personas:[{ ...ana }, { ...otra }, { id:'p9', nombre:'QUIEN CEDE', telefono_principal:'5590000009' }],
      leads:[
        { id:'l1', persona_id:'p1', estatus_id:2, estatus:{ id:2, etiqueta:'Aún no vence su pago' }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:'ev1', eventos:ev, creado_en:new Date().toISOString(), personas:{ ...ana } },
        { id:'l2', persona_id:'p2', estatus_id:2, estatus:{ id:2, etiqueta:'Aún no vence su pago' }, asesor_id:'u2', ciudad_interes_id:'cA', evento_id:'ev1', eventos:ev, creado_en:new Date().toISOString(), personas:{ ...otra } }],
      inscripciones:[{ id:'i9', persona_id:'p9', evento_id:'ev1', anticipo:700, restante:700, liquidado:false, precio_pactado:1400, paquete:'BASICO', estatus_id:11,
        asesor_id:'u2', fecha_proximo_pago:null, asistencia:null, notas_migracion:null, estatus:{ id:11, clave:'anticipo_vigente', etiqueta:'x' },
        personas:{ id:'p9', nombre:'QUIEN CEDE', telefono_principal:'5590000009' }, eventos:{ ...ev }, pagos:[] }] },
    usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Cobranza', es_admin:true } });
  const { p, check } = h;
  await p.evaluate(e => { GIRAS = [{ id:'cur1', nombre:'CURSO PRUEBA' }]; EVENTOS_CAL = [e]; leadsCache = window.__tablas.leads.slice(); poblacion = 'leads'; vistaActiva = 'ciudad'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('view-board').classList.add('active'); }, ev);

  h.paso('1. La misma regla para todos');
  const r = await p.evaluate(a => [telCoincide(a, '55 1000 0001'), telCoincide(a, '+52 55 2000 0002'), telCoincide(a, '5530000003'), telCoincide(a, '20000')], ana);
  check(r[0] === 'principal' && r[1] === 'alterno' && r[2] === null && r[3] === 'alterno', 'principal, alterno (con 52 y espacios), otro número y un pedazo');

  h.paso('2. Alumnos y Leads: buscar por el alterno');
  await p.evaluate(() => { document.getElementById('searchInput').value = '55 2000 0002'; pintarBoard(); document.querySelectorAll('.status-tile').forEach(t => t.classList.add('open')); });
  await p.waitForTimeout(300);
  const tablero = await p.evaluate(() => [...document.querySelectorAll('#board .lead-card')].map(c => c.textContent));
  check(tablero.length === 1 && tablero[0].includes('ALUMNA CON DOS NUMEROS'), 'sale la alumna (y solo ella)');
  check(tablero[0].includes('Encontrada por su teléfono alterno: 5520000002'), 'su tarjeta dice que la encontró por su alterno');
  await h.captura('buscar-alterno-tablero.png');
  await p.evaluate(() => { document.getElementById('searchInput').value = '5510000001'; pintarBoard(); });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => !document.querySelector('#board .lead-alterno') && document.querySelectorAll('#board .lead-card').length === 1), 'por el principal: sin etiqueta');
  await p.evaluate(() => { document.getElementById('searchInput').value = ''; pintarBoard(); });

  h.paso('3. Cobranza: buscar por el alterno');
  const cob = await p.evaluate(a => {
    cobDatos = { leads:[], inscritas:[{ id:'x', restante:700, anticipo:700, precio_pactado:1400, personas:a, pagos:[], estatus:{ clave:'anticipo_vigente' }, eventos:{ fecha:'2030-01-01' } }] };
    document.getElementById('cobBuscar').value = '2000 0002';
    const items = itemsCobranza();
    cobDia = new Date().toLocaleDateString('en-CA');
    return { n:items.length, alterno:items[0]?.porAlterno, fila:items[0] ? filaCobranza(items[0], grupoCobranza(items[0])) : '' };
  }, ana);
  check(cob.n === 1 && cob.alterno && cob.fila.includes('Encontrada por su teléfono alterno'), 'la encuentra y lo dice en su renglón');
  await p.evaluate(() => { document.getElementById('cobBuscar').value = ''; });

  h.paso('4. Ceder su lugar: quien irá, por su alterno');
  await p.evaluate(() => abrirModalInscripcion('i9'));
  await p.waitForTimeout(500);
  await p.click('#btnCederLugar');
  await p.fill('#cederTel', '5520000002');
  await p.dispatchEvent('#cederTel', 'input');
  await p.waitForTimeout(400);
  const ced = await p.textContent('#cederEncontradas');
  check(ced.includes('Alumna Con Dos Numeros') && ced.includes('es su teléfono alterno'), 'la encuentra y dice que es su alterno');
  await h.captura('buscar-alterno-ceder.png');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.evaluate(() => { document.getElementById('searchInput').value = '5520000002'; pintarBoard(); document.querySelectorAll('.status-tile').forEach(t => t.classList.add('open')); });
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('buscar-alterno-celular.png');

  await h.terminar();
})();
