/* Pasar a curso en línea + saldo de Glamy (11 nov 2026).
   - Ficha de la inscrita: "Pasar a curso en línea" (curso en línea de entrada el mismo, precio = lo que pagó, motivo);
     con un pago por confirmar no deja; llama a la base (inscripcion_pasar_a_linea) y queda en la actividad.
   - Ya pasada: aviso "Pasó a curso en línea", sin cobro ni botones de curso; un administrador la puede regresar.
   - Panel de Glamy: saldo desde la recarga (recargas - gasto con las pruebas), exámenes aparte y "Registrar recarga".
   Datos de ejemplo. */
const { abrirHub } = require('./arnes');

const HOY = new Date().toLocaleDateString('en-CA');
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ev = { id:'ev1', fecha:mas(80), fecha_por_definir:false, sede:'Salón', curso_id:'cur1', ciudad_id:'cA', ciudades:{ id:'cA', nombre:'Ciudad A' } };
const persona = { id:'p1', nombre:'ALUMNA EN LINEA', telefono_principal:'5560000001', telefono_alternativo:null };
const pagos = [{ id:'g1', monto:700, fecha:mas(-30), hora:'10:00', banco:'BANCO', verificacion:'confirmado' },
               { id:'g2', monto:800, fecha:mas(-2), hora:'11:00', banco:'BANCO', verificacion:'confirmado' }];
const insc = (extra) => ({ id:'i1', persona_id:'p1', evento_id:'ev1', anticipo:1500, restante:0, liquidado:true, precio_pactado:1500, paquete:'BASICO',
  estatus_id:12, asesor_id:'u2', notas_migracion:null, fecha_proximo_pago:null, monto_proximo_pago:null, asistencia:null,
  venta_en_linea_id:null, paso_a_linea_en:null, personas:{ ...persona }, eventos:{ ...ev }, pagos:pagos.map(p=>({ ...p })), ...extra });

(async () => {
  const h = await abrirHub({ tablas:{ interacciones:[], comprobantes:[], cambio_fecha_avisos:[],
      inscripciones:[insc()],
      cursos_en_linea:[{ id:'cl1', nombre:'Los Pasteles más sabrosos de la chef', precio:null, activo:true, orden:1 },
                       { id:'cl2', nombre:'Macarons', precio:450, activo:true, orden:2 }],
      ventas_en_linea:[{ id:'v1', precio_pactado:1500, acceso_dado_en:null, cancelada_en:null, cursos_en_linea:{ nombre:'Los Pasteles más sabrosos de la chef' } }],
      glamy_recargas:[{ fecha:'2026-10-19', monto_usd:10, nota:'inicial' }],
      glamy_uso:[{ usuario_id:'u2', fecha:HOY, creado_en:new Date().toISOString(), costo_usd:0.30, herramientas:[], error:null, prueba:false },
                 { usuario_id:null, fecha:HOY, creado_en:new Date().toISOString(), costo_usd:1.14, herramientas:[], error:null, prueba:true }] },
    usuario:{ id:'u1', nombre:'Admin Prueba', rol:'Dueña', es_admin:true, recibe_pedidos:true } });
  const { p, check } = h;
  await p.evaluate(() => { GIRAS = [{ id:'cur1', nombre:'LOS PASTELES MAS SABROSOS DE LA CHEF', corto:'Pasteles' }]; window.renderCalendario = async () => {}; });
  await p.evaluate(() => { window.__rpc.inscripcion_pasar_a_linea = a => ({ venta:'v1', pagado:1500, precio:a.p_precio, curso:'x' });
                           window.__rpc.inscripcion_regresar_a_presencial = a => ({ pagado:1500, liquidado:true }); });

  h.paso('1. Ficha: "Pasar a curso en línea"');
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  check(await p.isVisible('#btnPasarLinea'), 'sale el botón junto a Ceder su lugar y Cambiar de curso');
  await p.click('#btnPasarLinea');
  await p.waitForTimeout(300);
  check((await p.inputValue('#plCurso')) === 'cl1', 'de entrada, el mismo curso en línea');
  check((await p.inputValue('#plPrecio')) === '1500', 'el precio arranca con lo que pagó');
  check((await p.textContent('#plResumen')).includes('liquidada'), 'dice que queda liquidada en línea');
  await p.fill('#plMotivo', 'Lo tomará en línea');
  await p.fill('#plPrecio', '1000');
  await p.click('#plOk');
  await p.waitForTimeout(300);
  check((await h.ops('rpc:inscripcion_pasar_a_linea', 'rpc')).length === 0 && (await p.textContent('#toast')).includes('no puede ser menor'), 'precio menor a lo pagado: no deja');
  await p.fill('#plPrecio', '1500');
  await h.captura('pasar-linea-ficha.png');
  await p.click('#plOk');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(600);
  const rpc = (await h.ops('rpc:inscripcion_pasar_a_linea', 'rpc'))[0];
  check(rpc && rpc.p_insc === 'i1' && rpc.p_curso === 'cl1' && rpc.p_precio === 1500 && rpc.p_motivo === 'Lo tomará en línea', 'la base la pasa con curso, precio y motivo');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'paso_a_linea'), 'queda en la actividad');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('2. Con un pago por confirmar no deja');
  await p.evaluate(() => { const i = window.__tablas.inscripciones[0]; i.pagos[1].verificacion = 'por_confirmar'; });
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  await p.click('#btnPasarLinea');
  await p.waitForTimeout(200);
  check((await p.textContent('#toast')).includes('pago por confirmar') && await p.isHidden('#fichaPasarLinea'), 'pide confirmarlo antes');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('3. Ya pasada: aviso, sin cobro, y "Regresar a presencial" (administrador)');
  await p.evaluate(() => { const t = window.__tablas.inscripciones; t[0] = { ...t[0], venta_en_linea_id:'v1', paso_a_linea_en:new Date().toISOString(), estatus_id:6, anticipo:0, liquidado:false,
    pagos:t[0].pagos.map(x=>({ ...x, verificacion:'paso_a_linea' })) }; });
  await h.limpiarOps();
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(600);
  const aviso = await p.textContent('#fichaEnLinea');
  check(aviso.includes('Pasó a curso en línea') && aviso.includes('Los Pasteles más sabrosos de la chef') && aviso.includes('$1,500'), 'su ficha dice a qué curso pasó y cuánto');
  check(await p.isHidden('#panelInscPago') && await p.isHidden('#btnPasarLinea') && await p.isHidden('#btnCederLugar') && await p.isHidden('#btnCambiarCurso'), 'sin cobro ni botones de curso');
  await h.captura('pasar-linea-aviso.png');
  await p.click('#plRegresar');
  await p.fill('#plRegresarMotivo', 'Siempre sí va');
  await p.click('#plRegresarOk');
  await p.waitForSelector('#modalConfirmar.open');
  await p.click('#confirmarSi');
  await p.waitForTimeout(500);
  check((await h.ops('rpc:inscripcion_regresar_a_presencial', 'rpc')).some(a => a.p_insc === 'i1' && a.p_motivo === 'Siempre sí va'), 'un administrador la regresa');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'regreso_a_presencial'), 'queda en la actividad');
  await p.evaluate(() => cerrarModalInscripcion());

  h.paso('4. Panel de Glamy: saldo desde la recarga');
  await p.evaluate(() => { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById('view-glamy').classList.add('active'); gl.tab = 'uso'; renderGlamySeccion(); });
  await p.waitForTimeout(600);
  const panel = await p.textContent('#glTabUso');
  check(panel.includes('Saldo (desde la recarga)') && panel.includes('$8.56') && panel.includes('recargado $10.00') && panel.includes('gastado $1.44'), 'recargado $10, gastado $1.44 (equipo + pruebas), quedan $8.56');
  check(panel.includes('Exámenes de Glamy este mes') && panel.includes('$1.14'), 'los exámenes salen aparte');
  check(/Este mes1 pregunta|Este mes\s*1/.test(panel.replace(/\s+/g, ' ')) || panel.includes('$0.300'), 'el uso del equipo no cuenta las pruebas');
  await h.captura('glamy-saldo.png');
  await h.limpiarOps();
  await p.click('#guRecargaAbrir');
  await p.fill('#guRecargaMonto', '20');
  await p.click('#guRecargaGuardar');
  await p.waitForTimeout(500);
  check((await h.ops('glamy_recargas', 'insert')).some(r => Number(r.monto_usd) === 20 && r.fecha === HOY), 'se anota la recarga');
  check((await h.ops('actividad_usuario', 'insert')).some(a => a.accion === 'glamy_recarga'), 'queda en la actividad');

  h.paso('5. Celular');
  await p.setViewportSize({ width:390, height:844 });
  await p.waitForTimeout(300);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'panel sin scroll de lado');
  await h.captura('glamy-saldo-celular.png');
  await p.evaluate(() => { const t = window.__tablas.inscripciones; t[0] = { ...t[0], venta_en_linea_id:null, estatus_id:12, anticipo:1500, liquidado:true, pagos:t[0].pagos.map(x=>({ ...x, verificacion:'confirmado' })) }; });
  await p.evaluate(() => abrirModalInscripcion('i1'));
  await p.waitForTimeout(500);
  await p.click('#btnPasarLinea');
  await p.waitForTimeout(200);
  check(await p.evaluate(() => document.documentElement.scrollWidth <= 392), 'ficha sin scroll de lado');
  await p.evaluate(() => document.getElementById('fichaPasarLinea').scrollIntoView());
  await h.captura('pasar-linea-celular.png');

  await h.terminar();
})();
