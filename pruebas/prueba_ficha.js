/* Ficha de la inscrita (fase 1): cobro primero, comentario/vendedor/próximo
   pago se guardan solos, "Más información" y modo Cobranza. */
const { abrirHub } = require('./arnes');

const INSC = {
  id:'i1', anticipo:1400, restante:500, precio_pactado:1900, liquidado:false, estatus_id:11,
  asesor_id:'u2', notas_migracion:'Nota vieja', fecha_proximo_pago:null,
  personas:{ id:'p1', nombre:'Alumna Prueba Uno', telefono_principal:'0000000000' },
  eventos:{ fecha:'2026-09-27', sede:'Salón', ciudades:{ nombre:'Ciudad Prueba' } },
};

(async () => {
  const h = await abrirHub();
  const { p, check } = h;
  const abrir = async (extra = {}, opts = {}) => {
    await p.evaluate(([fila, o]) => { window.__tablas.inscripciones = [fila]; window.__tablas.pagos = []; window.__ops = []; return abrirModalInscripcion('i1', o); },
      [{ ...INSC, ...extra }, opts]);
    await p.waitForTimeout(150);
  };
  const txt = s => p.textContent(s);
  const visible = s => p.isVisible(s);
  const cerrar = () => p.evaluate(() => cerrarModalInscripcion());
  const updates = () => h.ops('inscripciones', 'update');

  h.paso('1. Ficha con saldo: lo que debe arriba, botón Liquida');
  await abrir();
  check((await txt('#cobroResumen')).includes('Debe') && (await txt('#cobroResumen')).includes('$500'), 'resumen muestra Debe $500');
  check((await txt('#guardarInscPago')).trim() === 'Liquida $500', 'botón dice Liquida $500');
  check(!(await p.evaluate(() => document.getElementById('inscFichaMas').open)), '"Más información" cerrado al abrir');
  check(!(await visible('#inscVendedorSelect')), 'vendedor escondido en Más información');
  check(await visible('#modalInscNotasEdit'), 'comentario visible');
  check(await p.$('#guardarInscNotas') === null && await p.$('#guardarInscVendedor') === null && await p.$('#guardarInscProximoPago') === null, 'ya no hay botones Guardar sueltos');
  check(await p.$('#tabInscPago') === null, 'ya no existe la pestaña Agregar pago');
  await h.captura('ficha-computadora.png');

  h.paso('2. Comentario se guarda solo, sin tocar montos');
  await p.fill('#modalInscNotasEdit', 'Llegó con su hermana');
  check((await txt('#inscNotasEstado')).includes('escribiendo'), 'estado escribiendo…');
  check((await updates()).length === 0, 'no guarda mientras escribe');
  await p.waitForTimeout(800);
  let ups = await updates();
  check(ups.length === 1 && ups[0].notas_migracion === 'Llegó con su hermana' && Object.keys(ups[0]).length === 1, 'guardó solo notas_migracion: ' + JSON.stringify(ups));
  check((await txt('#inscNotasEstado')).includes('✓ Guardado'), 'estado ✓ Guardado');
  check((await h.ops('pagos', 'insert')).length === 0, 'no registró pagos');

  h.paso('3. Cerrar antes de que termine el tiempo también guarda');
  await abrir();
  await p.fill('#modalInscNotasEdit', 'Texto rápido');
  await cerrar();
  await p.waitForTimeout(100);
  check((await updates()).some(u => u.notas_migracion === 'Texto rápido'), 'guardó al cerrar');
  await p.waitForTimeout(700);
  check((await updates()).filter(u => 'notas_migracion' in u).length === 1, 'no lo guardó dos veces');

  h.paso('4. Comentario que falla avisa');
  await abrir();
  await h.fallar(op => op.tabla === 'inscripciones' && op.tipo === 'update');
  await p.fill('#modalInscNotasEdit', 'Esto falla');
  await p.waitForTimeout(800);
  check((await txt('#inscNotasEstado')).includes('No se guardó'), 'estado ⚠ No se guardó');
  await h.fallar(null);
  await cerrar();

  h.paso('5. Forma de pago con un toque');
  await abrir();
  await p.click('#cobroFormas [data-forma="Efectivo"]');
  check(await p.inputValue('#modalPagoBanco') === 'Efectivo', 'banco = Efectivo');
  check(await p.getAttribute('#cobroFormas [data-forma="Efectivo"]', 'class') === 'activo', 'chip activo');
  await p.click('#cobroFormas [data-forma="Efectivo"]');
  check(await p.inputValue('#modalPagoBanco') === '', 'segundo toque la quita');
  await p.fill('#modalPagoBanco', 'transferencia');
  check(await p.getAttribute('#cobroFormas [data-forma="Transferencia"]', 'class') === 'activo', 'escrito a mano también marca el chip');
  await p.click('#cobroFormas [data-forma="Tarjeta"]');
  check(await p.inputValue('#modalPagoBanco') === 'Tarjeta', 'cambia a Tarjeta');

  h.paso('6. Liquida con un clic (monto vacío)');
  await p.click('#guardarInscPago');
  await p.waitForTimeout(200);
  const pg = await h.ops('pagos', 'insert');
  check(pg.length === 1 && pg[0].monto === 500 && pg[0].banco === 'Tarjeta' && pg[0].confirmado_por === 'u1', 'pago de $500 en tarjeta: ' + JSON.stringify(pg));
  ups = await updates();
  check(ups.some(u => u.anticipo === 1900 && u.restante === 0 && u.liquidado === true && u.estatus_id === 12), 'queda liquidada y en Pagó el curso');
  check(!(await p.evaluate(() => document.getElementById('modalInscripcion').classList.contains('open'))), 'la ficha se cierra');

  h.paso('7. Abono parcial');
  await abrir();
  await p.fill('#modalPagoMonto', '200');
  check((await txt('#guardarInscPago')).trim() === 'Registrar abono de $200', 'botón: Registrar abono de $200');
  check((await txt('#cobroPreview')).includes('$300'), 'vista previa: queda debiendo $300');
  await p.fill('#modalPagoMonto', '500');
  check((await txt('#guardarInscPago')).trim() === 'Liquida $500', 'escribir el saldo exacto también dice Liquida');
  await p.fill('#modalPagoMonto', '200');
  await p.click('#guardarInscPago');
  await p.waitForTimeout(200);
  check((await h.ops('pagos', 'insert'))[0]?.monto === 200, 'pago de $200');
  check((await updates()).some(u => u.anticipo === 1600 && u.restante === 300 && u.liquidado === false && !('estatus_id' in u)), 'debe $300, estatus sin cambio');

  h.paso('8. Pagar de más sigue preguntando');
  await abrir();
  await p.fill('#modalPagoMonto', '800');
  await p.click('#guardarInscPago');
  await p.waitForTimeout(150);
  check(await p.isVisible('#modalConfirmar.open'), 'pide confirmación');
  await p.click('#confirmarNo');
  await p.waitForTimeout(100);
  check((await h.ops('pagos', 'insert')).length === 0, 'cancelar no registra');
  await cerrar();

  h.paso('9. Ya liquidada');
  await abrir({ anticipo:1900, restante:0, liquidado:true });
  check((await txt('#cobroResumen')).includes('Liquidada'), 'dice Liquidada');
  check((await txt('#guardarInscPago')).trim() === 'Registrar pago', 'botón: Registrar pago');
  await p.click('#guardarInscPago');
  await p.waitForTimeout(100);
  check((await h.ops('pagos', 'insert')).length === 0, 'sin monto no registra nada');
  await cerrar();

  h.paso('10. Vendedor se guarda al elegirlo');
  await abrir();
  await p.click('#inscFichaMas > summary');
  await p.selectOption('#inscVendedorSelect', 'u1');
  await p.waitForTimeout(100);
  check(await p.isVisible('#modalConfirmar.open'), 'pregunta antes de quitarle la venta a otra vendedora');
  await p.click('#confirmarNo');
  await p.waitForTimeout(100);
  check(await p.inputValue('#inscVendedorSelect') === 'u2', 'cancelar regresa a la vendedora de antes');
  check((await updates()).length === 0, 'cancelar no guarda');
  await p.fill('#modalInscNotasEdit', 'Nota nueva');
  await p.selectOption('#inscVendedorSelect', 'u1');
  await p.waitForTimeout(100);
  await p.fill('#confirmarMotivo', 'La atendió en la puerta');
  await p.click('#confirmarSi');
  await p.waitForTimeout(200);
  ups = await updates();
  const upV = ups.find(u => 'asesor_id' in u);
  check(upV && upV.asesor_id === 'u1' && upV.notas_migracion.startsWith('Nota nueva') && upV.notas_migracion.includes('La atendió en la puerta'), 'guardó vendedor con rastro, sin perder la nota escrita');
  check(ups.findIndex(u => u.notas_migracion === 'Nota nueva') < ups.indexOf(upV), 'primero guardó la nota pendiente');
  check((await txt('#inscVendedorEstado')).includes('✓ Guardado'), 'estado ✓ Guardado en vendedor');
  await cerrar();

  h.paso('11. Sin vendedor previo no pregunta');
  await abrir({ asesor_id:null });
  await p.click('#inscFichaMas > summary');
  await p.selectOption('#inscVendedorSelect', 'u2');
  await p.waitForTimeout(150);
  check(!(await p.isVisible('#modalConfirmar.open')), 'no pregunta');
  check((await updates()).some(u => u.asesor_id === 'u2' && !('notas_migracion' in u)), 'guardó sin rastro');
  await cerrar();

  h.paso('12. Próximo pago se guarda al elegir la fecha');
  await abrir();
  await p.click('#inscFichaMas > summary');
  await p.fill('#inscProximoPago', '2026-10-02');
  await p.dispatchEvent('#inscProximoPago', 'change');
  await p.waitForTimeout(150);
  check((await updates()).some(u => u.fecha_proximo_pago === '2026-10-02'), 'guardó la fecha');
  check((await txt('#inscProximoPagoEstado')).includes('✓ Guardado'), 'estado ✓ Guardado');
  await cerrar();

  h.paso('13. Estatus y Corregir siguen en Más información');
  await abrir();
  await p.click('#inscFichaMas > summary');
  check(await visible('#guardarInscEstatus'), 'Marcar estatus visible');
  await p.click('#tabInscCorregir');
  check(await visible('#guardarInscCorreccion') && !(await visible('#guardarInscEstatus')), 'pestaña Corregir funciona');
  await h.captura('ficha-mas-info.png');
  await cerrar();

  h.paso('14. Cobro directo desde Cobranza (soloCobro)');
  await abrir({}, { soloCobro:true });
  check(!(await visible('#modalInscNotasEdit')) && !(await visible('#inscFichaMas')), 'solo el cobro');
  check(await visible('#guardarInscPago') && await visible('#cobroFichaCompleta'), 'botón y Ver ficha completa');
  check(await p.evaluate(() => document.activeElement.id) === 'modalPagoMonto', 'cursor en el monto');
  await p.click('#cobroFichaCompleta');
  check(await visible('#modalInscNotasEdit') && await visible('#inscFichaMas'), 'Ver ficha completa muestra todo');
  await cerrar();

  h.paso('15. Celular 390 px');
  await p.setViewportSize({ width:390, height:844 });
  await abrir();
  check(await p.evaluate(() => { const m = document.querySelector('#modalInscripcion .modal'); return m.scrollWidth <= m.clientWidth + 1; }), 'sin scroll horizontal en la ficha');
  check(await p.evaluate(() => [...document.querySelectorAll('#cobroFormas button')].every(b => b.scrollWidth <= b.clientWidth + 1)), 'las formas de pago caben');
  await h.captura('ficha-celular.png');
  await cerrar();

  await h.terminar();
})();
