/* Cursos en línea (5 nov 2026, ticket #6): los cursos grabados de la Academia se venden sueltos, aparte de la gira.
   - Sección "Cursos en línea": ventas por grupo (por cerrar, por confirmar, falta dar acceso, con acceso, canceladas) y catálogo.
   - Nueva venta: teléfono (si ya está en el Hub se usa la misma persona), curso con su precio del catálogo, promesa y vendedora.
   - Registrar pago: queda por confirmar. Solo quien tiene "Confirmar pagos en línea" (o administradores) lo confirma y da el acceso.
   - Dar acceso: solo liquidada; se escribe el cupón y se abre WhatsApp con el link de la Academia, el del curso y el cupón.
   - El semáforo "Te toca cobrar" de la vendedora trae sus promesas en línea, marcadas "En línea".
   La base (venta_en_linea_resumen y las funciones de alta, pago, confirmación y acceso) se simula aquí; en la base real
   la prueban las historias (H14). Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const VENDEDORA = { id:'u2', nombre:'Vendedora Prueba', rol:'Ventas', es_admin:false, es_vendedor:true };
const ADMIN = { id:'u1', nombre:'Admin Prueba', rol:'Gerente', es_admin:true, es_vendedor:false };

(async () => {
  const h = await abrirHub({ tablas:{ personas:[{ id:'pX', nombre:'ALUMNA YA CONOCIDA', telefono_principal:'5590000001' }], leads:[], inscripciones:[], pagos:[], interacciones:[],
      mensajes_predeterminados:[],
      cursos_en_linea:[
        { id:'k1', nombre:'Rosca de reyes', precio:899, link:'https://academia.ejemplo/rosca', activo:true, orden:1 },
        { id:'k2', nombre:'Macarons', precio:null, link:null, activo:true, orden:2 }] },
    usuario:VENDEDORA,
    equipo:[{ id:'u1', nombre:'Admin Prueba', es_vendedor:false, rol:'Gerente' }, { id:'u2', nombre:'Vendedora Prueba', es_vendedor:true, rol:'Ventas' }] });
  const { p, check } = h;
  // La base simulada: ventas y pagos, y su estado calculado como venta_en_linea_resumen
  await p.evaluate(() => {
    const db = window.__linea = { ventas:[], pagos:[], n:0 };
    const curso = id => window.__tablas.cursos_en_linea.find(c => c.id === id);
    const resumen = v => {
      const ps = db.pagos.filter(x => x.venta_id === v.id);
      const pagado = ps.filter(x => x.verificacion !== 'no_llego').reduce((s, x) => s + x.monto, 0);
      const confirmado = ps.filter(x => x.verificacion === 'confirmado').reduce((s, x) => s + x.monto, 0);
      const estado = v.cancelada_en ? 'cancelada' : v.acceso_dado_en ? 'con_acceso' : v.precio != null && confirmado >= v.precio ? 'liquidada'
        : v.precio != null && pagado >= v.precio ? 'por_confirmar' : pagado > 0 ? 'abonando' : 'prometida';
      return { pagado, confirmado, por_confirmar: pagado - confirmado, debe: v.precio == null ? null : Math.max(v.precio - pagado, 0), estado };
    };
    window.__rpc.ventas_en_linea_lista = () => db.ventas.map(v => { const per = window.__tablas.personas.find(x => x.id === v.persona_id);
      return { ...v, nombre:per?.nombre, telefono:per?.telefono_principal, curso:curso(v.curso_id).nombre, link:curso(v.curso_id).link, ...resumen(v) }; });
    window.__rpc.venta_en_linea_crear = a => { const id = 'v' + (++db.n);
      db.ventas.push({ id, persona_id:a.p_persona, curso_id:a.p_curso, precio:a.p_precio ?? curso(a.p_curso).precio, fecha_promesa:a.p_fecha_promesa, asesor_id:a.p_asesor, nota:a.p_nota,
        cupon:null, acceso_dado_en:null, cancelada_en:null, creado_en:new Date().toISOString() }); return id; };
    window.__rpc.pago_en_linea_registrar = a => { const id = 'pg' + (++db.n); db.pagos.push({ id, venta_id:a.p_venta, monto:a.p_monto, fecha:a.p_fecha, banco:a.p_banco, verificacion:'por_confirmar' });
      window.__tablas.pagos_en_linea = db.pagos; return id; };
    window.__rpc.pago_en_linea_confirmar = a => { db.pagos.find(x => x.id === a.p_pago).verificacion = a.p_llego ? 'confirmado' : 'no_llego'; return null; };
    window.__rpc.venta_en_linea_dar_acceso = a => { const v = db.ventas.find(x => x.id === a.p_venta); v.cupon = a.p_cupon; v.acceso_dado_en = new Date().toISOString(); v.acceso_dado_por = usuarioActual.id; return null; };
    window.__rpc.venta_en_linea_editar = a => { db.ventas.find(x => x.id === a.p_venta).fecha_promesa = a.p_fecha_promesa; return null; };
    window.__tablas.pagos_en_linea = db.pagos;
    MENSAJES = [];
  });
  const lista = () => p.textContent('#elLista');

  h.paso('1. La sección y el catálogo');
  await p.evaluate(() => setActiveSection('enlinea'));
  await p.waitForTimeout(500);
  check(await p.isVisible('#btnNuevaVentaLinea') && (await p.textContent('#viewTitle')).includes('Cursos en línea'), 'la sección se abre con su botón de venta nueva');
  await p.click('#elTabs [data-el-tab="catalogo"]');
  await p.waitForTimeout(300);
  check((await p.textContent('#elCatalogo')).includes('Rosca de reyes') && (await p.textContent('#elCatalogo')).includes('Macarons'), 'el catálogo lista los cursos');
  check(await p.isDisabled('[data-el-curso="k1"] .el-cat-precio'), 'una vendedora no cambia precios ni links');
  await h.captura('en-linea-catalogo.png');
  await p.click('#elTabs [data-el-tab="ventas"]');
  await p.waitForTimeout(300);

  h.paso('2. Nueva venta (persona nueva) con el precio del catálogo');
  await p.click('#btnNuevaVentaLinea');
  await p.waitForSelector('#modalVentaLinea.open');
  await p.fill('#vlTel', '55 9000 0002');
  await p.dispatchEvent('#vlTel', 'change');
  await p.waitForTimeout(200);
  check((await p.textContent('#vlTelHint')).includes('Persona nueva'), 'avisa que es persona nueva');
  await p.fill('#vlNombre', 'Alumna En Linea');
  await p.selectOption('#vlCurso', 'k1');
  check((await p.inputValue('#vlPrecio')) === '899', 'el precio arranca con el del catálogo');
  await p.fill('#vlPromesa', mas(-1));
  await h.captura('en-linea-nueva.png');
  await h.limpiarOps();
  await p.click('#vlGuardarNueva');
  await p.waitForTimeout(600);
  const per = (await h.ops('personas', 'insert'))[0];
  const crear = (await h.ops('rpc:venta_en_linea_crear', 'rpc'))[0];
  check(per && per.telefono_principal === '5590000002', 'da de alta a la persona a 10 dígitos');
  check(crear && crear.p_curso === 'k1' && crear.p_precio === 899 && crear.p_asesor === 'u2' && crear.p_fecha_promesa === mas(-1), 'registra la venta con curso, precio, promesa y vendedora');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'venta_en_linea_creada'), 'queda en la actividad');
  check(await p.isVisible('#vlRegistrarPago') && (await p.textContent('#vlTitulo')).includes('Prometida'), 'abre su ficha: Prometida, con "Registrar pago"');

  h.paso('3. Si ya está en el Hub, se usa la misma persona');
  await p.evaluate(() => document.getElementById('modalVentaLinea').classList.remove('open'));
  await p.click('#btnNuevaVentaLinea');
  await p.fill('#vlTel', '5590000001');
  await p.dispatchEvent('#vlTel', 'change');
  await p.waitForTimeout(300);
  check((await p.textContent('#vlTelHint')).includes('Ya está en el Hub'), 'la reconoce por su teléfono');
  await p.selectOption('#vlCurso', 'k2');
  check((await p.inputValue('#vlPrecio')) === '', 'curso sin precio en el catálogo: la casilla queda vacía para escribir el acordado');
  await p.fill('#vlPrecio', '650');
  await h.limpiarOps();
  await p.click('#vlGuardarNueva');
  await p.waitForTimeout(600);
  check((await h.ops('personas', 'insert')).length === 0 && (await h.ops('rpc:venta_en_linea_crear', 'rpc'))[0]?.p_persona === 'pX', 'no duplica a la persona');
  await p.evaluate(() => document.getElementById('modalVentaLinea').classList.remove('open'));

  h.paso('4. La vendedora registra el pago; no lo puede confirmar ni dar acceso');
  await p.evaluate(() => abrirVentaLinea('v1'));
  await p.waitForTimeout(300);
  check((await p.inputValue('#vlPagoMonto')) === '899', 'propone lo que debe');
  await h.limpiarOps();
  await p.click('#vlRegistrarPago');
  await p.waitForTimeout(500);
  check((await h.ops('rpc:pago_en_linea_registrar', 'rpc'))[0]?.p_monto === 899, 'registra el pago');
  check((await p.textContent('#vlTitulo')).includes('falta confirmar') && !(await p.$('[data-el-conf]')) && !(await p.$('#vlDarAcceso')), 'queda "Pagado · falta confirmar", sin botones de confirmar ni de acceso');
  await h.captura('en-linea-por-confirmar.png');
  await p.evaluate(() => document.getElementById('modalVentaLinea').classList.remove('open'));

  h.paso('5. Quien confirma: confirma el pago y da el acceso con el cupón');
  await p.evaluate(u => { usuarioActual = u; }, ADMIN);
  await p.evaluate(() => { enl.filtro = 'por_confirmar'; return renderEnLinea(); });
  await p.waitForTimeout(300);
  check((await lista()).includes('Alumna En Linea'), 'sale en "Por confirmar"');
  await p.evaluate(() => abrirVentaLinea('v1'));
  await p.waitForTimeout(300);
  await h.limpiarOps();
  await p.click('[data-el-conf="si"]');
  await p.waitForTimeout(500);
  check((await h.ops('rpc:pago_en_linea_confirmar', 'rpc'))[0]?.p_llego === true, 'confirma que llegó');
  check((await p.textContent('#vlTitulo')).includes('falta dar acceso') && await p.isVisible('#vlDarAcceso'), 'queda liquidada y sale "Dar acceso"');
  await p.click('#vlDarAcceso');
  await p.waitForTimeout(200);
  check((await h.ops('rpc:venta_en_linea_dar_acceso', 'rpc')).length === 0, 'sin cupón no da el acceso');
  await p.fill('#vlCupon', 'ROSCA100');
  await h.captura('en-linea-dar-acceso.png');
  await p.click('#vlDarAcceso');
  await p.waitForSelector('#modalWhats.open');
  const texto = await p.inputValue('#waTexto');
  check((await h.ops('rpc:venta_en_linea_dar_acceso', 'rpc'))[0]?.p_cupon === 'ROSCA100', 'guarda el cupón');
  check(texto.includes('academiaglamr.cursosdereposteria.com.mx') && texto.includes('https://academia.ejemplo/rosca') && texto.includes('ROSCA100'),
    'el WhatsApp lleva el link de la Academia, el del curso y el cupón');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'acceso_en_linea_dado'), 'queda en la actividad');
  await h.captura('en-linea-whatsapp.png');
  await p.evaluate(() => { document.getElementById('modalWhats').classList.remove('open'); document.getElementById('modalVentaLinea').classList.remove('open'); });
  await p.evaluate(() => { enl.filtro = 'con_acceso'; pintarEnLinea(); });
  check((await lista()).includes('Alumna En Linea') && (await lista()).includes('Con acceso'), 'pasa a "Con acceso"');

  h.paso('6. El semáforo de la vendedora trae sus promesas en línea');
  await p.evaluate(u => { usuarioActual = u; }, VENDEDORA);
  await p.evaluate(() => { cobDatos = { leads:[], inscritas:[], comp:new Map() }; window.cargarCobranza = async () => true; });
  await p.evaluate(() => setActiveSection('inicio'));
  await p.waitForTimeout(400);
  await p.evaluate(() => renderTocaCobrar());
  await p.waitForTimeout(500);
  await p.click('#tocaCobrar [data-tc-sem="gris"]').catch(() => {});   // (la de Macarons no tiene fecha de promesa: gris)
  await p.waitForTimeout(200);
  const tcTxt = await p.textContent('#tocaCobrar');
  check(tcTxt.includes('En línea') && tcTxt.includes('Alumna Ya Conocida'), 'la promesa en línea sale en su semáforo, marcada "En línea"');
  await h.captura('en-linea-semaforo.png');

  h.paso('7. Cobranza tiene su pestaña "En línea"');
  await p.evaluate(() => setActiveSection('cobranza'));
  await p.waitForTimeout(300);
  await p.click('#cobTabs [data-cob-ir="enlinea"]');
  await p.waitForTimeout(400);
  check(await p.isVisible('#view-enlinea'), 'lleva a Cursos en línea');

  h.paso('8. Celular');
  await p.setViewportSize({ width:390, height:800 });
  await p.evaluate(() => { enl.filtro = 'todas'; return renderEnLinea(); });
  await p.waitForTimeout(400);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'sin scroll de lado');
  await h.captura('en-linea-celular.png');
  await p.evaluate(() => abrirVentaLinea('v2'));
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'ni en la ficha de la venta');
  await h.captura('en-linea-ficha-celular.png');

  await h.terminar();
})();
