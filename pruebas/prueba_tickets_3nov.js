/* Tickets del 3 nov 2026:
   - #8 (Josefina): "+ Nuevo lead" trae "Teléfono alterno (opcional)": se guarda en la persona, 10 dígitos y distinto al principal.
   - #7 (Isabel): un lead de una ciudad que todavía no tiene curso en la gira se puede guardar; el formulario lo avisa y,
     al guardar, se llama avisar_ciudad_sin_curso (a Jared, que organiza la ruta, le llega una tarea por ciudad).
   - La fecha de pago de la ficha ya no se guarda con cada fecha a medias mientras la escriben: espera a que terminen
     y solo guarda fechas completas y razonables. Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'A', fecha:mas(60), curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad Con Curso' } };
const CIUDADES_EJ = [{ id:'cA', nombre:'Ciudad Con Curso', estado:'Veracruz' }, { id:'cN', nombre:'Ciudad Sin Curso', estado:'Veracruz' }];

(async () => {
  const h = await abrirHub({ tablas:{ pagos:[], interacciones:[], personas:[], leads:[], mensajes_predeterminados:[],
      inscripciones:[{ id:'i1', persona_id:'p1', evento_id:'A', anticipo:700, restante:700, precio_pactado:1400, liquidado:false, estatus_id:11, paquete:'BASICO',
        asesor_id:'u2', notas_migracion:null, asistencia:null, fecha_proximo_pago:null, pagos:[],
        personas:{ id:'p1', nombre:'Inscrita Prueba', telefono_principal:'5512340001' }, eventos:{ fecha:mas(60), sede:'Salón', ciudades:{ nombre:'Ciudad Con Curso' } } }] },
    usuario:{ id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false, es_vendedor:true },
    equipo:[{ id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  const montar = () => p.evaluate(([e, cs]) => { cursoActivoIdCache = 'cur1'; CIUDADES = cs; CIUDADES_GIRA_ACTIVA = ['cA']; EVENTOS_CAL = [e];
    window.__rpc.glamy_buscar_persona = () => ({ encontradas:0, personas:[] });
    // (el tablero de prueba avisa otras cosas encima: se guardan todos los avisos para revisarlos)
    if(!window.__toasts){ window.__toasts = []; const t0 = toast; window.toast = (m, ...r) => { window.__toasts.push(String(m)); return t0(m, ...r); }; }
    window.__avisos = []; window.__rpc.avisar_ciudad_sin_curso = a => { window.__avisos.push(a); return { avisado:true, leads:1 }; }; }, [ev, CIUDADES_EJ]);
  await montar();
  await p.evaluate(() => setActiveSection('board'));
  await p.waitForTimeout(400);
  await montar();
  const nuevo = async () => { await p.click('#btnNuevoLead'); await p.waitForSelector('#modalNuevo.open'); };

  h.paso('1. Teléfono alterno al dar de alta (ticket #8)');
  await nuevo();
  check(await p.isVisible('#nuevoTelefonoAlt') && (await p.inputValue('#nuevoTelefonoAlt')) === '', 'la casilla sale (vacía) junto al teléfono');
  await p.fill('#nuevoTelefono', '5566660001');
  await p.fill('#nuevoTelefonoAlt', '55 6666 0001');
  await p.fill('#nuevoNombre', 'Lead Con Alterno');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(400);
  check((await h.ops('personas', 'insert')).length === 0 && (await p.textContent('#toast')).includes('igual al principal'), 'si es igual al principal, no guarda y dice por qué');
  await p.fill('#nuevoTelefonoAlt', '556666');
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(400);
  check((await h.ops('personas', 'insert')).length === 0 && (await p.textContent('#toast')).includes('10 dígitos'), 'con menos de 10 dígitos, tampoco');
  await p.fill('#nuevoTelefonoAlt', '+52 55 7777 0002');
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(700);
  const per = (await h.ops('personas', 'insert'))[0];
  check(per && per.telefono_alternativo === '5577770002' && per.telefono_principal === '5566660001', 'se guarda en la persona, a 10 dígitos');
  await nuevo();
  check((await p.inputValue('#nuevoTelefonoAlt')) === '', 'el formulario empieza limpio');
  await p.fill('#nuevoTelefono', '5566660003');
  await p.fill('#nuevoNombre', 'Lead Sin Alterno');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(700);
  check((await h.ops('personas', 'insert'))[0]?.telefono_alternativo === null, 'vacío: se guarda sin alterno');

  h.paso('2. Ciudad sin curso en la gira (ticket #7)');
  await montar();
  await nuevo();
  await p.evaluate(() => { const s = document.getElementById('nuevoCiudad'); s.innerHTML = opcionesCiudad(null); s.value = 'cA'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  check(!(await p.isVisible('#nuevoCiudadSinCurso')), 'ciudad con curso: sin aviso');
  await p.evaluate(() => { const s = document.getElementById('nuevoCiudad'); s.value = 'cN'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  const aviso = await p.textContent('#nuevoCiudadSinCurso');
  check(await p.isVisible('#nuevoCiudadSinCurso') && aviso.includes('Ciudad Sin Curso') && aviso.includes('Jared') && aviso.includes('Puedes guardar'), 'ciudad sin curso: avisa que se puede guardar y que se le avisa a Jared');
  await p.fill('#nuevoTelefono', '5566660004');
  await p.fill('#nuevoNombre', 'Lead Ciudad Nueva');
  await h.captura('ciudad-sin-curso-nuevo-lead.png');
  await h.limpiarOps();
  await p.click('#guardarNuevoLead');
  await p.waitForTimeout(800);
  const lead = (await h.ops('leads', 'insert'))[0];
  check(lead && lead.ciudad_interes_id === 'cN' && !lead.evento_id, 'el lead se guarda con su ciudad y sin curso');
  check((await p.evaluate(() => window.__avisos.length)) === 1 && (await p.evaluate(() => window.__toasts.some(m => m.includes('ya le avisamos a Jared')))), 'se le avisa a Jared y lo dice');
  await nuevo();
  check(!(await p.isVisible('#nuevoCiudadSinCurso')), 'al volver a abrir, sin aviso');
  await p.evaluate(() => document.getElementById('modalNuevo').classList.remove('open'));

  h.paso('3. La fecha de pago espera a que terminen de escribirla');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(600);
  await h.limpiarOps();
  // Lo que suelta el navegador mientras se teclea el año: 0002, 0020, 0202… y al final la buena
  for(const v of ['0002-11-20', '0020-11-20', '0202-11-20', mas(17)]){
    await p.evaluate(v => { const t = document.getElementById('inscProximoPago'); t.value = v; t.dispatchEvent(new Event('change', { bubbles:true })); }, v);
    await p.waitForTimeout(150);
  }
  check((await h.ops('inscripciones', 'update')).length === 0, 'mientras escriben no guarda nada');
  await p.waitForTimeout(1300);
  const ups = await h.ops('inscripciones', 'update');
  check(ups.length === 1 && ups[0].fecha_proximo_pago === mas(17), 'al terminar guarda una sola vez, la fecha buena');
  check((await h.ops('actividad_usuario', 'insert')).filter(a => a.accion === 'fecha_cobro_movida').length === 1, 'y una sola anotación en la actividad');
  await h.limpiarOps();
  await p.evaluate(() => { const t = document.getElementById('inscProximoPago'); t.focus(); t.value = '0020-01-01'; t.dispatchEvent(new Event('change', { bubbles:true })); t.blur(); });
  await p.waitForTimeout(1300);
  check((await h.ops('inscripciones', 'update')).length === 0, 'si la dejan a medias (año 0020), no guarda esa fecha');
  await p.evaluate(f => { const t = document.getElementById('inscProximoPago'); t.focus(); t.value = f; t.dispatchEvent(new Event('change', { bubbles:true })); t.blur(); }, mas(25));
  await p.waitForTimeout(300);
  check((await h.ops('inscripciones', 'update')).some(u => u.fecha_proximo_pago === mas(25)), 'al salir de la casilla guarda en ese momento');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('4. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await nuevo();
  await p.evaluate(() => { const s = document.getElementById('nuevoCiudad'); s.innerHTML = opcionesCiudad(null); s.value = 'cN'; s.dispatchEvent(new Event('change', { bubbles:true })); });
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await p.$eval('#nuevoCiudadSinCurso', x => x.scrollIntoView());
  await h.captura('ciudad-sin-curso-celular.png');

  await h.terminar();
})();
