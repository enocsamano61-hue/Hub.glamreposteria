/* EXAMEN DE GLAMY — preguntas típicas contra la función real (modo prueba, datos de ejemplo).
   Revisa que mande a la sección correcta (p. ej. un pago de lead sin confirmar NO va a Calendario/Recepción).
   No corre en correr_todas.js: llama a la IA (cuesta unos centavos). Se corre antes de publicar Glamy:
     GLAMY_LLAVE=<llave temporal> node pruebas/examen_glamy.js
   La llave temporal se da de alta en glamy_prueba_llave (huella sha256 y caducidad corta).
   Datos inventados: nadie real. */
const URL = 'https://bomlszsnixazhnsegeik.supabase.co/functions/v1/glamy';
const LLAVE = process.env.GLAMY_LLAVE;
if(!LLAVE){ console.log('Falta GLAMY_LLAVE'); process.exit(1); }

const HOY = new Date().toLocaleDateString('en-CA', { timeZone:'America/Mexico_City' });
const mas = n => { const d = new Date(HOY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const ddmm = f => f.split('-').reverse().join('/');
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const persona = (extra) => ({ encontradas:1, personas:[{ persona_id:ID(1), nombre:'Alumna Ejemplo', telefono:'5500000001', vip:false, cursos:[], leads:[], ...extra }] });
const curso = (fecha, extra) => ({ inscripcion_id:ID(10), curso:'LOS PASTELES MAS SABROSOS DE LA CHEF', ciudad:'Tuxpan', fecha, paquete:'BASICO',
  estatus:'Aún no vence su pago', asistencia:'sin marcar', vendedora:'Vendedora Ejemplo', precio:1400, pagado:700, debe:700, pagos_por_confirmar:0, ...extra });
const lead = (extra) => ({ lead_id:ID(20), estatus:'Aún no vence su pago', vendedora:'Vendedora Ejemplo', ciudad_interes:'Tuxpan', creado:'10/10/2026',
  curso_ligado:'Tuxpan · ' + ddmm(mas(40)), ...extra });

// Cada caso: pregunta, lo que regresa buscar_persona, botones que DEBE tener (alguno) y los que NO debe tener.
const CASOS = [
  { nombre:'Pago de lead sin confirmar (caso Jazmín)', pregunta:'¿Cómo va el pago de 5500000001? dice que ya depositó',
    datos: persona({ leads:[lead({ estatus:'Pago por confirmar', pago_reportado:{ monto:700, banco:'MERCADO PAGO', fecha:mas(-2) },
      siguiente_paso:{ situacion:`Reportó un pago de $700 MERCADO PAGO del ${ddmm(mas(-2)).slice(0,5)} que falta confirmar en el banco. Todavía NO está inscrita.`,
        seccion:'board', boton:'lead', donde:'su lead: "✅ Confirmar pago" o "❌ No se encontró"', quien:'quien tiene el permiso "Confirmar pagos" (Cobranza)' } })] }),
    debe:[`⟦lead:${ID(20)}⟧`], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Inscrita que debe (curso futuro)', pregunta:'¿Cuánto debe 5500000001 y dónde le cobro?',
    datos: persona({ cursos:[curso(mas(60), { siguiente_paso:{ situacion:`Inscrita; debe $700 antes de su curso del ${ddmm(mas(60))}.`, seccion:'cobranza', donde:'Cobranza → Por cobrar, o en su ficha', quien:'Cobranza' } })] }),
    debe:['⟦ir:cobranza⟧', `⟦ficha:${ID(10)}⟧`], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Pago por confirmar en la ficha (curso futuro)', pregunta:'5500000001 mandó comprobante, ¿dónde confirmo su pago?',
    datos: persona({ cursos:[curso(mas(60), { pagos_por_confirmar:1, siguiente_paso:{ situacion:`Tiene 1 pago(s) por confirmar en su ficha (curso del ${ddmm(mas(60))}).`, seccion:'cobranza', donde:'su ficha (botón de la ficha): "ya llegó" o "no llegó"', quien:'Cobranza, cuando lo vea en el banco' } })] }),
    debe:[`⟦ficha:${ID(10)}⟧`], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Su curso es hoy', pregunta:'Ya llegó 5500000001 a su curso, ¿dónde le cobro lo que falta?',
    datos: persona({ cursos:[curso(HOY, { siguiente_paso:{ situacion:'Su curso es HOY: llegada, cobro de lo que falte y pagos por confirmar.', seccion:'calendario', donde:'Calendario → el día → Entrar a recepción', quien:'Recepción' } })] }),
    debe:['⟦ir:calendario⟧', `⟦ficha:${ID(10)}⟧`], noDebe:[] },
  { nombre:'Cambio de fecha sin avisar', pregunta:'¿Ya sabe 5500000001 que su curso cambió de fecha?',
    datos: persona({ cursos:[curso(mas(95), { cambio_de_fecha:'sin_avisar', siguiente_paso:{ situacion:`Su curso cambió de fecha (ahora ${ddmm(mas(95))}) y falta avisarle y saber si acepta. Además debe $700 (Cobranza).`, seccion:'cobranza', donde:'Cobranza → Embudo por curso → lista Cambio de fecha', quien:'su vendedora o Cobranza' } })] }),
    debe:['⟦ir:cobranza⟧'], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Promesa de anticipo vencida', pregunta:'¿Qué pasó con 5500000001? iba a dar su anticipo',
    datos: persona({ leads:[lead({ fecha_promesa_anticipo:mas(-3), siguiente_paso:{ situacion:`Su promesa de anticipo venció el ${ddmm(mas(-3)).slice(0,5)}.`, seccion:'cobranza', donde:'Cobranza → Embudo por curso (Promesa vencida) o su lead', quien:'su vendedora y Cobranza' } })] }),
    debe:['⟦ir:cobranza⟧', `⟦lead:${ID(20)}⟧`], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'No llegó a su curso', pregunta:'5500000001 no fue a su curso, ¿qué hago?',
    datos: persona({ cursos:[curso(mas(-5), { asistencia:'no_llego', siguiente_paso:{ situacion:`No llegó a su curso del ${ddmm(mas(-5))}: recuperarla o cerrar su caso.`, seccion:'nollegaron', donde:'No llegaron', quien:'Cobranza' } })] }),
    debe:['⟦ir:nollegaron⟧'], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Diploma pendiente', pregunta:'5500000001 pregunta por su diploma',
    datos: persona({ cursos:[curso(mas(-10), { asistencia:'llego', debe:0, pagado:1400, siguiente_paso:{ situacion:'Llegó y pagó; falta entregarle su diploma.', seccion:'academia', donde:'Academia → Certificados', quien:'Academia' } })] }),
    debe:['⟦ir:academia⟧'], noDebe:['⟦ir:calendario⟧', '⟦ir:cobranza⟧'] },
  { nombre:'Sin datos: confirmar pago de un lead', pregunta:'¿Cómo confirmo el pago que reportó una vendedora en un lead?', datos:null,
    debe:['⟦ir:board⟧'], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Sin datos: cobrar saldo de inscrita', pregunta:'¿Dónde le cobro el saldo a una alumna inscrita para enero?', datos:null,
    debe:['⟦ir:cobranza⟧'], noDebe:['⟦ir:calendario⟧'] },
  { nombre:'Sin datos: día del curso', pregunta:'Hoy es el curso, ¿dónde marco que ya llegaron?', datos:null,
    debe:['⟦ir:calendario⟧'], noDebe:[] },
  { nombre:'Sin datos: venderle otro curso a una ex alumna', pregunta:'Una alumna de antes quiere ir al curso de otra ciudad, ¿cómo la inscribo?', datos:null,
    debe:['⟦ir:historial⟧', '⟦ir:board⟧'], noDebe:['⟦ir:calendario⟧'] },
];

/* Glamy BI (modo bi): se revisa con qué herramientas y datos contestó (lenguaje sencillo → métricas). */
// Datos de ejemplo con números para cualquier columna que pida (si vinieran vacíos, Glamy con razón vuelve a preguntar).
const VALORES_EJ = Object.fromEntries(['inscritas', 'con_pago', 'liquidadas', 'inscritas_deben', 'por_cobrar', 'bajas', 'no_van', 'promesa_vigente', 'promesas_vencidas',
  'leads_promesa', 'leads_por_confirmar', 'pagos_por_confirmar', 'cobrado'].map((m, i) => [m, 3 + i]));
const MATRIZ_EJ = { tipo:'matriz', por:'ciudad', proximos:true, columnas:Object.keys(VALORES_EJ).map(m => ({ metrica:m, nombre:m, formato:'num' })),
  filas:[{ clave:'c1', etiqueta:'Ciudad Uno', fecha:mas(90), valores:VALORES_EJ }, { clave:'c2', etiqueta:'Ciudad Dos', fecha:mas(95), valores:VALORES_EJ }], totales:VALORES_EJ };
const CONSULTA_EJ = { metrica:'x', nombre:'Ejemplo', formato:'num', por:'ciudad', filas:[{ clave:'c1', etiqueta:'Ciudad Uno', valor:5 }], total:5 };
const tablas = r => (r.llamadas || []).filter(l => l.nombre === 'bi_tabla');
const consultas = r => (r.llamadas || []).filter(l => l.nombre === 'bi_consulta');
const metricasDe = r => [...tablas(r).flatMap(l => l.entrada.metricas || []), ...consultas(r).map(l => l.entrada.metrica)];
const prox = r => [...tablas(r), ...consultas(r)].length > 0 && [...tablas(r), ...consultas(r)].every(l => l.entrada.proximos === true || l.entrada.proximos === 'true');
const CASOS_BI = [
  { nombre:'BI: la pregunta de Enoc (ciudades pendientes, una sola tabla)',
    pregunta:'quiero saber en cada ciudad pendiente a la que iremos, cuantas alumnas inscritas con anticpio, cuantas con fecha de pago pendiente y cuantas confirmaron que no van a ir, las quiero ver en una sola tabla, que las filas sean las ciudades',
    revisar: r => tablas(r).length === 1 && prox(r) && ['inscritas_deben', 'promesa_vigente', 'no_van'].every(m => metricasDe(r).includes(m))
      && !metricasDe(r).includes('bajas') && (tablas(r)[0].entrada.por || 'ciudad') === 'ciudad' },
  { nombre:'BI: "cuántas cancelaron en las que faltan"', pregunta:'¿cuántas cancelaron o dijeron que ya no van en las ciudades que faltan?',
    revisar: r => metricasDe(r).includes('no_van') && prox(r) },
  { nombre:'BI: "prometieron pagar y ya se les pasó"', pregunta:'¿cuántas prometieron pagar y ya se les pasó la fecha? por ciudad',
    revisar: r => metricasDe(r).includes('promesas_vencidas') && !metricasDe(r).includes('promesa_vigente') },
  { nombre:'BI: "cuánto nos deben de los cursos que vienen"', pregunta:'¿cuánto nos deben de los cursos que vienen?',
    revisar: r => metricasDe(r).includes('por_cobrar') && prox(r) },
  { nombre:'BI: "mandaron comprobante y no se ha confirmado"', pregunta:'¿cuántas mandaron comprobante y todavía no se confirma?',
    revisar: r => metricasDe(r).some(m => m === 'leads_por_confirmar' || m === 'pagos_por_confirmar') },
  { nombre:'BI: "ya pagaron todo y las que deben", una tabla', pregunta:'por ciudad, las que ya pagaron todo y las que todavía deben, en una tabla',
    revisar: r => tablas(r).length === 1 && metricasDe(r).includes('liquidadas') && metricasDe(r).some(m => m === 'inscritas_deben' || m === 'por_cobrar') },
];

(async () => {
  let ok = 0, mal = 0, costo = 0;
  for(const c of CASOS){
    const simular = c.datos ? { buscar_persona:c.datos } : {};
    const r = await fetch(URL, { method:'POST', headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ accion:'prueba', llave:LLAVE, pregunta:c.pregunta, seccion:'inicio', simular }) }).then(x => x.json());
    costo += r.costo_usd || 0;
    // Igual que el Hub: una marca mal cerrada (⟦ir:board⟦) también cuenta como botón.
    const t = String(r.texto || '').replace(/⟦((?:ir|ficha|lead):[^⟧⟦\]\s]{1,60})[⟦\]]/g, '⟦$1⟧');
    const bien = c.debe.some(b => t.includes(b)) && !c.noDebe.some(b => t.includes(b)) && !r.error;
    bien ? ok++ : mal++;
    console.log(`${bien ? '✓' : '✗'} ${c.nombre}`);
    if(!bien) console.log('   esperaba alguno de', c.debe.join(' '), c.noDebe.length ? '· sin ' + c.noDebe.join(' ') : '', '\n   ' + t.replace(/\n/g, '\n   ') + (r.error ? '\n   error: ' + r.error : ''));
  }
  for(const c of CASOS_BI){
    const r = await fetch(URL, { method:'POST', headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ accion:'prueba', modo:'bi', llave:LLAVE, pregunta:c.pregunta, simular:{ bi_tabla:MATRIZ_EJ, bi_consulta:CONSULTA_EJ, bi_giras:[] } }) }).then(x => x.json());
    costo += r.costo_usd || 0;
    const bien = !r.error && c.revisar(r);
    bien ? ok++ : mal++;
    console.log(`${bien ? '✓' : '✗'} ${c.nombre}`);
    if(!bien) console.log('   llamó:', JSON.stringify(r.llamadas || []), '\n   ' + String(r.texto || '').replace(/\n/g, '\n   ') + (r.error ? '\n   error: ' + r.error : ''));
  }
  console.log(`\nexamen_glamy: ${ok}/${ok + mal} · costo US$${costo.toFixed(4)}`);
  process.exitCode = mal ? 1 : 0;
})();
