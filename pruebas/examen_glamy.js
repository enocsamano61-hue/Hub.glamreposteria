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
        seccion:'board', boton:'lead', donde:'su lead: "Confirmar pago" o "No se encontró"', quien:'quien tiene el permiso "Confirmar pagos" (Cobranza)' } })] }),
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

/* Cambio de fecha de un curso (preguntas de Jared, 24 oct): "confirmados" = aceptaron la nueva fecha, no pagos.
   La herramienta curso regresa siempre el mismo ejemplo (17 inscritas: 10 aceptaron, 7 sin avisar; 3 de ellas llegaron con la fecha nueva). */
const CURSO_CF = { encontrado:true, curso:{ evento_id:ID(30), fecha:mas(90), ciudad:'Ciudad Ejemplo', curso:'LOS PASTELES MAS SABROSOS DE LA CHEF', sede:'Salón' },
  numeros:{ inscritas:17, liquidadas:1, deben:16, total_que_deben:11350, cobrado:12600, pagos_por_confirmar:0, llegaron:0, no_llegaron:0, sin_marcar_llegada:17, diplomas_entregados:0 },
  cambio_de_fecha:{ fecha_anterior:mas(-2), fecha_nueva:mas(90), inscritas:{ acepto:10, sin_avisar:7 }, inscritas_con_fecha_nueva:3, inscritas_de_otro_curso:0,
    nota_nuevas:'Todas las inscritas del curso están en la lista y ya cuentan en "inscritas". inscritas_con_fecha_nueva = se inscribieron cuando el curso ya tenía la fecha nueva: en la lista dicen "Nueva" y el equipo decide si les toca regalo.', leads:{ sin_avisar:13 },
    regalos:{ aceptaron_sin_regalo:3, falta_enviar_acceso:2, acceso_enviado:5 },
    significado:'Estados del aviso del cambio de fecha (NO son pagos): acepto = aceptó la nueva fecha; avisada = ya se le mandó el WhatsApp y no ha contestado; sin_avisar = falta avisarle; reembolso = pidió reembolso; reembolsada = ya se le devolvió; no_va = ya no va.' },
  lista:Array.from({ length:10 }, (_, i) => ({ tipo:'inscrita', inscripcion_id:ID(40 + i), nombre:'Alumna Ejemplo ' + (i + 1), telefono:'55000001' + String(i).padStart(2, '0'), estado_cambio:'acepto' })) };
const usoCurso = r => (r.llamadas || []).some(l => l.nombre === 'curso');
const hablaDePagos = t => /pagos? por confirmar/i.test(t) && !/\b10\b/.test(t);
const CASOS_CF = [
  { nombre:'Cambio de fecha: ¿cuáles aceptaron? (Jared)', pregunta:'de los 17 de ciudad ejemplo cuales son los que aceptaron el cambio de fecha?',
    revisar: (r, t) => usoCurso(r) && (r.llamadas || []).some(l => l.nombre === 'curso' && l.entrada.filtro === 'cambio_aceptaron') && /Alumna Ejemplo/.test(t) },
  { nombre:'Cambio de fecha: ¿cuántos faltan? (Jared)', pregunta:'hay un boton que dice cuando ya saben del cambio de fecha, para que esten confirmados de la fecha anterior y de esta, ya sabes cuantos de los 17 de ciudad ejemplo faltan?',
    revisar: (r, t) => usoCurso(r) && /\b7\b/.test(t) && !hablaDePagos(t) },
  { nombre:'Cambio de fecha: confirmados y por confirmar (Jared)', pregunta:'en ciudad ejemplo de los que ya tienen pago para esta fecha dime cuantos estan confirmados y cuantos me faltan por confirmar del cambio',
    revisar: (r, t) => usoCurso(r) && /\b10\b/.test(t) && /\b7\b/.test(t) && !hablaDePagos(t) },
  { nombre:'Cambio de fecha: las nuevas (28 oct)', pregunta:'en ciudad ejemplo, ¿cuántas se inscribieron ya con la fecha nueva? ¿también están en la lista?',
    revisar: (r, t) => usoCurso(r) && /\b3\b/.test(t) && /(lista|Nueva)/i.test(t) },
  { nombre:'Cambio de fecha: regalos sin enviar (Fase 1)', pregunta:'en ciudad ejemplo, ¿a cuántas que aceptaron el cambio les falta que se les envíe el acceso del curso de regalo?',
    revisar: (r, t) => usoCurso(r) && /\b2\b/.test(t) },
];

/* Fase 1 (27 oct 2026): cómo se usa lo nuevo, sin datos. Se revisa el texto: el nombre del botón, sin los emojis que el Hub ya no tiene. */
const SIN_EMOJIS_HUB = t => !/[✅💜❌➕🎁💬📅🏦🧹📊]/u.test(t);
const CASOS_FASE1 = [
  { nombre:'Fase 1: dónde escribir un comentario', pregunta:'¿dónde escribo un comentario en la ficha de una alumna inscrita?',
    revisar: t => /Agregar comentario/.test(t) && SIN_EMOJIS_HUB(t) },
  { nombre:'Fase 1: le avisé desde mi celular', pregunta:'le avisé del cambio de fecha a una alumna desde mi celular, ¿cómo lo marco en el hub?',
    revisar: t => /Ya le avis/i.test(t) && SIN_EMOJIS_HUB(t) },
  { nombre:'Fase 1: ya mandé el acceso del regalo', pregunta:'ya le mandé el acceso del curso de regalo a una alumna que aceptó el cambio de fecha, ¿qué toco?',
    revisar: t => /Ya se envi/i.test(t) && SIN_EMOJIS_HUB(t) },
  { nombre:'Fase 1: el aviso de actualización', pregunta:'me salió un aviso de nueva actualización y no me deja seguir, ¿qué hago?',
    revisar: t => /(pregunta|cuestionario)/i.test(t) && /(hasta abajo|al final|leer|lee)/i.test(t) },
  { nombre:'Fase 1: alumna del Excel sin lead', pregunta:'una alumna vino del excel, ¿tiene lead? antes la pestaña Lead salía gris',
    revisar: t => /lead/i.test(t) && /(crea|cread|siempre)/i.test(t) },
  { nombre:'Fase 1: nombra los botones sin emojis', pregunta:'¿cómo confirmo el pago que reportó un lead?',
    revisar: t => /Confirmar pago/.test(t) && SIN_EMOJIS_HUB(t) },  { nombre:'Fecha de pago: la promesa de una inscrita va en su ficha (28 oct)', pregunta:'una alumna ya inscrita sin pago me dijo que paga el 3 de noviembre, ¿dónde pongo esa fecha para que cobranza la vea?',
    revisar: t => /ficha/i.test(t) && /fecha de pago/i.test(t) },
  { nombre:'Vigilante: el lead sigue a su inscripción (28 oct)', pregunta:'si cambio de curso a una alumna inscrita, ¿su lead se queda en la ciudad de antes?',
    revisar: t => /lead/i.test(t) && /(nuev|se va|tambi[eé]n|con ella|se mueve|pasa)/i.test(t) && !/s[ií],? se queda/i.test(t) },
  { nombre:'Comprobantes: dónde se sube (28 oct)', pregunta:'¿dónde subo el comprobante de pago que me mandó una clienta?',
    revisar: t => /comprobante/i.test(t) && /(Registrar pago|Adjuntar comprobante)/.test(t) },
  { nombre:'Kits: falta pagar el envío (28 oct)', pregunta:'el kit de una alumna ya está listo pero no ha pagado el envío, ¿en qué columna lo pongo?',
    revisar: t => /Por pagar env[ií]o/.test(t) },
  { nombre:'Usuarios: crear el usuario de alguien nuevo (28 oct)', pregunta:'¿cómo le creo su usuario del hub a una vendedora nueva?',
    revisar: t => /Nuevo usuario/.test(t) && /contrase[ñn]a temporal/i.test(t) },
  { nombre:'Usuarios: dar de baja no borra nada (28 oct)', pregunta:'si doy de baja a una vendedora que ya se fue, ¿se borran sus leads y sus ventas?',
    revisar: t => /(no se borra|se quedan|se conserva|no se pierde)/i.test(t) && !/s[ií],? se borran/i.test(t) },
  { nombre:'Usuarios: solo Enoc hace administradores (28 oct)', pregunta:'soy administradora, ¿puedo hacer administrador a alguien del equipo?',
    revisar: t => /Enoc/.test(t) },
  { nombre:'Academia: ver rápido cómo va el kit de una alumna (29 oct)', pregunta:'¿dónde veo rápido en qué va el kit de cada alumna de la academia sin abrir el tablero de kits?',
    revisar: t => /Alumnas/.test(t) && /(estado|Por pagar|Enviado|decisi[oó]n)/i.test(t) },
  { nombre:'Cobranza: calendario de quién paga cada día (29 oct)', pregunta:'¿hay algún calendario donde vea por día quién me tiene que pagar?',
    revisar: t => /Calendario/.test(t) && /Cobranza/.test(t) && /⟦ir:cobranza⟧/.test(t) },
  { nombre:'Cambio de fecha: marcar Aceptó desde su ficha (29 oct, Eliab)', pregunta:'estoy contestando el whatsapp de una alumna inscrita que aceptó el cambio de fecha, ¿puedo marcarlo sin ir al calendario?',
    revisar: t => /ficha/i.test(t) && /Acept[oó]/.test(t) },
  { nombre:'Kits: cancelar el kit y qué pasa con lo pagado (29 oct, Tamar)', pregunta:'una alumna ya no quiere su kit porque se gradúa el próximo año, ¿cómo lo quito y qué pasa con lo que pagó?',
    revisar: t => /Cancelar el kit/.test(t) && /(motivo|dinero|pag[oó])/i.test(t) && !/no (existe|hay) (forma|opci[oó]n)/i.test(t) },
  { nombre:'Gente nueva: le explica con calma y con botón (28 oct)', pregunta:'¿cómo registro un lead?', nueva_dias:1,
    revisar: t => /Nuevo lead/.test(t) && /⟦ir:board⟧/.test(t) && /(Glamy|asistente)/i.test(t) },
];

/* Glamy BI (modo bi): se revisa con qué herramientas y datos contestó (lenguaje sencillo → métricas). */
// Datos de ejemplo con números para cualquier columna que pida (si vinieran vacíos, Glamy con razón vuelve a preguntar).
const VALORES_EJ = Object.fromEntries(['inscritas', 'con_pago', 'liquidadas', 'inscritas_deben', 'por_cobrar', 'bajas', 'no_van', 'promesa_vigente', 'promesas_vencidas',
  'leads_promesa', 'leads_por_confirmar', 'pagos_por_confirmar', 'cobrado', 'inscritas_sin_pago', 'inscritas_por_confirmar'].map((m, i) => [m, 3 + i]));
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
  { nombre:'BI: "inscritas que no han dado nada" (misma regla que el Embudo)', pregunta:'¿cuántas inscritas de los cursos que vienen no han dado nada de anticipo?',
    revisar: r => metricasDe(r).includes('inscritas_sin_pago') && prox(r) },
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
  for(const c of CASOS_CF){
    const r = await fetch(URL, { method:'POST', headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ accion:'prueba', llave:LLAVE, pregunta:c.pregunta, seccion:'calendario', simular:{ curso:CURSO_CF } }) }).then(x => x.json());
    costo += r.costo_usd || 0;
    const t = String(r.texto || '');
    const bien = !r.error && c.revisar(r, t);
    bien ? ok++ : mal++;
    console.log(`${bien ? '✓' : '✗'} ${c.nombre}`);
    if(!bien) console.log('   llamó:', JSON.stringify(r.llamadas || []), '\n   ' + t.replace(/\n/g, '\n   ') + (r.error ? '\n   error: ' + r.error : ''));
  }
  for(const c of CASOS_FASE1){
    const r = await fetch(URL, { method:'POST', headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ accion:'prueba', llave:LLAVE, pregunta:c.pregunta, seccion:'inicio', simular:{}, nueva_dias:c.nueva_dias }) }).then(x => x.json());
    costo += r.costo_usd || 0;
    const t = String(r.texto || '');
    const bien = !r.error && c.revisar(t);
    bien ? ok++ : mal++;
    console.log(`${bien ? '✓' : '✗'} ${c.nombre}`);
    if(!bien) console.log('   llamó:', JSON.stringify(r.llamadas || []), '\n   ' + t.replace(/\n/g, '\n   ') + (r.error ? '\n   error: ' + r.error : ''));
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
