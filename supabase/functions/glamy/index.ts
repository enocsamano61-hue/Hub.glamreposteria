/* =========================================================
   GLAMY — asistente del Hub (Supabase Edge Function).
   - Revisa la sesión de quien pregunta. Sin límite de preguntas: por ahora
     solo se mide (Enoc lo ve en la sección Glamy → Uso).
   - Llama a Claude Haiku 5.5 con el manual del Hub y herramientas de
     SOLO LECTURA. Las consultas de datos corren con la sesión de quien
     pregunta (RLS + secciones de su rol, en las funciones glamy_* de la base).
   - Los tickets (tabla hub_pedidos) los crea con la llave de servicio.
   - Anota el uso en glamy_uso (sin el texto de la conversación).
   La llave de Anthropic vive en el secreto ANTHROPIC_API_KEY.
   Ver docs/migraciones/2026-10-19-glamy.md
   ========================================================= */
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { MANUAL } from "./manual.ts";

const MODELO = "claude-haiku-5-5";
const MAX_VUELTAS = 6;             // llamadas al modelo por pregunta (cada herramienta es una vuelta)
// USD por millón de tokens de Claude Haiku 5.5 (prompts de hasta 100K tokens).
const PRECIO = { entrada: 0.10, salida: 0.50, cacheLectura: 0.01, cacheEscritura: 0.125 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const servicio = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "" });

const ESTADOS: Record<string, string> = { nuevo: "Nuevo", en_revision: "En revisión", en_desarrollo: "En desarrollo", hecho: "Hecho", descartado: "Descartado" };
const hoyMX = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });   // AAAA-MM-DD
const corto = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/* Herramientas. Las de datos llaman funciones glamy_* de la base con la sesión del usuario. */
const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "buscar_persona",
    description: "Busca alumnas, leads o cualquier persona por celular (7 o más dígitos, con o sin lada) o por nombre. Regresa sus cursos (ciudad, fecha, estatus, si llegó, pagado, lo que debe, pagos por confirmar, diploma, cambio de fecha), sus leads (estatus, curso ligado, pago reportado, promesa de anticipo, último comentario) y, si el rol lo permite, su información de la Academia. Cada curso y cada lead trae siguiente_paso (qué sigue, quién lo hace y a qué sección mandar): úsalo para decir qué hacer. Úsala siempre que peguen un número o pregunten por alguien.",
    input_schema: { type: "object", properties: { texto: { type: "string", description: "Celular o nombre a buscar" } }, required: ["texto"] },
  },
  {
    name: "curso",
    description: "Cómo va un curso de la gira: inscritas, llegaron, liquidadas, quién debe y cuánto, pagos por confirmar y diplomas entregados. Con 'filtro' regresa además la lista (hasta 40) de ese grupo. Sin fecha toma el curso de esa ciudad más cercano a hoy; sin ciudad ni fecha, el curso más cercano a hoy.",
    input_schema: {
      type: "object",
      properties: {
        ciudad: { type: "string", description: "Nombre de la ciudad (puede ir sin acentos)" },
        fecha: { type: "string", description: "Fecha del curso AAAA-MM-DD, si la saben" },
        filtro: { type: "string", enum: ["deben", "por_confirmar", "llegaron", "no_llegaron", "sin_marcar", "sin_diploma", "liquidadas", "todas"], description: "Grupo a listar" },
      },
    },
  },
  {
    name: "proximos_cursos",
    description: "Los próximos cursos programados (fecha, ciudad, curso, sede e inscritas).",
    input_schema: { type: "object", properties: { limite: { type: "integer", description: "Cuántos (1 a 20, por defecto 8)" } } },
  },
  {
    name: "mis_tareas",
    description: "Los pendientes del bloc 📝 de quien te habla (tareas asignadas, avisos del sistema y notas sin terminar).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "mis_tickets",
    description: "Los tickets que ha levantado quien te habla y en qué estado van.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_tickets_abiertos",
    description: "Lista los tickets que siguen abiertos (número, título, sección y estado) para no duplicar uno. Úsala SIEMPRE antes de crear_ticket.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "crear_ticket",
    description: "Le levanta a Enoc un ticket de algo que el Hub no hace (o un error). Solo después de entenderlo bien y de revisar con buscar_tickets_abiertos que no exista ya.",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título corto y claro (máx. 80 letras)" },
        seccion: { type: "string", description: "Sección del Hub donde aplica" },
        que_necesita: { type: "string", description: "Qué necesita, en claro y en tercera persona" },
        para_que: { type: "string", description: "Para qué: qué problema le resuelve" },
        ejemplo: { type: "string", description: "Un ejemplo concreto" },
        resumen: { type: "string", description: "Resumen de lo que platicaron" },
      },
      required: ["titulo", "que_necesita"],
    },
  },
];

/* Glamy BI (Reportes → Glamy BI, solo administradores): consulta métricas con definición fija
   (función bi_consulta de la base) y el Hub dibuja la gráfica con lo que regresa. */
const BI_METRICAS = ["inscritas", "con_pago", "liquidadas", "inscritas_deben", "inscritas_sin_pago", "inscritas_por_confirmar", "cobrado", "por_cobrar", "ticket_promedio", "vip", "asistencia",
  "no_llegaron", "bajas", "no_van", "pagos", "pagos_por_confirmar", "num_pagos", "leads", "conversion", "leads_abiertos", "leads_promesa", "promesa_vigente",
  "leads_por_confirmar", "promesas_vencidas", "contactos", "cambio_fecha", "cambio_aceptaron", "regalos_academia"];
const BI_POR = ["total", "ciudad", "curso", "vendedora", "estado", "paquete", "mes", "semana", "dia", "semana_gira"];
const BI_GRAFICAS = ["kpi", "barras", "barras_horizontales", "linea", "dona", "tabla"];
const HERRAMIENTAS_BI: Anthropic.Tool[] = [
  {
    name: "bi_consulta",
    description: "Glamy BI: consulta UNA métrica del Hub con definición fija y la regresa lista para graficar (el Hub dibuja la gráfica). " +
      "Métricas: inscritas, con_pago (pagaron algo, incluye liquidadas), liquidadas, inscritas_deben (\"Con anticipo (deben)\": pagaron una parte y deben el resto), " +
      "inscritas_sin_pago (inscritas que no han pagado nada), inscritas_por_confirmar (inscritas con un pago que falta ver en el banco), " +
      "cobrado (lo pagado por inscripción, por fecha del curso), por_cobrar (lo que deben, $), ticket_promedio, vip, asistencia (%), no_llegaron, " +
      "bajas (solo inscritas que ya no van), no_van (cancelaron o dijeron que no irán: inscritas que ya no van + leads que dijeron que no van), " +
      "pagos (por fecha de pago), pagos_por_confirmar ($), num_pagos, leads, conversion (% de leads inscritos), leads_abiertos, " +
      "promesa_vigente (dijeron que pagan en cierta fecha y la fecha todavía no llega), promesas_vencidas (la fecha ya pasó y no pagan), " +
      "leads_promesa (todas las promesas: vigentes y vencidas), leads_por_confirmar (mandaron comprobante y falta verlo en el banco), " +
      "contactos (historial de contacto), cambio_fecha (por estado), cambio_aceptaron, regalos_academia. " +
      "Sin curso ni fechas usa la gira activa. Regresa también la meta (si hay) y, para cobrado, la proyección al cierre. " +
      "Llámala hasta 3 veces por respuesta si necesitas varias vistas.",
    input_schema: {
      type: "object",
      properties: {
        metrica: { type: "string", enum: BI_METRICAS },
        por: { type: "string", enum: BI_POR, description: "Cómo agrupar. semana_gira = semana 1, 2, 3… de la gira (sirve para comparar giras)." },
        curso: { type: "string", description: "'activo' (la gira actual, por defecto), 'todas', o el nombre de una gira/curso." },
        comparar: { type: "string", description: "Nombre de otra gira para comparar (opcional). Para tendencias usa por=semana_gira." },
        ciudad: { type: "string", description: "Nombre de una ciudad (opcional)." },
        vendedora: { type: "string", description: "Nombre de una vendedora (opcional)." },
        desde: { type: "string", description: "AAAA-MM-DD (opcional)." },
        hasta: { type: "string", description: "AAAA-MM-DD (opcional)." },
        proximos: { type: "boolean", description: "true = solo cursos que todavía no pasan (ciudades pendientes, las que faltan, a las que iremos). Filtra por la fecha del curso, también a los leads." },
        grafica: { type: "string", enum: BI_GRAFICAS, description: "kpi = un número; barras_horizontales para rankings; linea para tendencias; dona solo para partes de un todo (máx. 6)." },
        titulo: { type: "string", description: "Título corto de la gráfica." },
      },
      required: ["metrica", "grafica", "titulo"],
    },
  },
  {
    name: "bi_tabla",
    description: "Glamy BI: tabla resumen (matriz) con VARIAS métricas a la vez, una fila por ciudad, curso, vendedora, estado o mes. " +
      "Úsala cuando pidan un resumen con varios datos por fila (p. ej. 'por ciudad: inscritas, cuántas deben, anticipos pendientes…'). " +
      "Mismas métricas que bi_consulta (máx. 10). Llámala UNA sola vez por respuesta con TODAS las columnas. El Hub la dibuja con totales, colores y metas.",
    input_schema: {
      type: "object",
      properties: {
        metricas: { type: "array", items: { type: "string", enum: BI_METRICAS }, description: "Columnas, en orden (2 a 10)." },
        por: { type: "string", enum: BI_POR, description: "Una fila por… (ciudad por defecto)." },
        curso: { type: "string", description: "'activo' (por defecto), 'todas' o el nombre de una gira." },
        ciudad: { type: "string" }, vendedora: { type: "string" },
        desde: { type: "string", description: "AAAA-MM-DD (opcional)." }, hasta: { type: "string", description: "AAAA-MM-DD (opcional)." },
        proximos: { type: "boolean", description: "true = solo cursos que todavía no pasan (ciudades pendientes): salen TODAS esas ciudades con la fecha de su curso, ordenadas por fecha." },
        titulo: { type: "string", description: "Título corto de la tabla." },
      },
      required: ["metricas", "titulo"],
    },
  },
  {
    name: "bi_giras",
    description: "Lista las giras (cursos) con sus fechas e inscritas, para saber cuál es la activa y cuál fue la pasada.",
    input_schema: { type: "object", properties: {} },
  },
];

type Usuario = { id: string; nombre: string; rol: string; es_admin: boolean; recibe_pedidos: boolean };
// Lo único que se usa del cliente con la sesión del usuario: llamar funciones glamy_*.
type ClienteRpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

async function ejecutar(nombre: string, entrada: Record<string, unknown>, sb: ClienteRpc, usuario: Usuario, seccion: string, bi: unknown[]) {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  };
  switch (nombre) {
    case "buscar_persona":
      return rpc("glamy_buscar_persona", { p_texto: corto(entrada.texto, 80) });
    case "curso": {
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(entrada.fecha ?? "")) ? String(entrada.fecha) : null;
      const filtros = ["deben", "por_confirmar", "llegaron", "no_llegaron", "sin_marcar", "sin_diploma", "liquidadas", "todas"];
      return rpc("glamy_curso", {
        p_ciudad: corto(entrada.ciudad, 60) || null, p_fecha: fecha,
        p_filtro: filtros.includes(String(entrada.filtro)) ? String(entrada.filtro) : null,
      });
    }
    case "proximos_cursos":
      return rpc("glamy_proximos_cursos", { p_limite: Number(entrada.limite) || 8 });
    case "mis_tareas":
      return rpc("glamy_mis_tareas", {});
    case "bi_giras":
      if (!usuario.es_admin) throw new Error("Glamy BI es solo para administradores.");
      return rpc("bi_giras", {});
    case "bi_tabla": {
      if (!usuario.es_admin) throw new Error("Glamy BI es solo para administradores.");
      const spec: Record<string, unknown> = { grafica: "matriz" };
      for (const k of ["por", "curso", "ciudad", "vendedora", "desde", "hasta", "titulo"]) {
        const v = corto(entrada[k], k === "titulo" ? 80 : 60);
        if (v) spec[k] = v;
      }
      spec.metricas = (Array.isArray(entrada.metricas) ? entrada.metricas : []).map((m) => String(m)).filter((m) => BI_METRICAS.includes(m)).slice(0, 10);
      if (entrada.proximos === true || entrada.proximos === "true") spec.proximos = true;
      const datos = await rpc("bi_matriz", { p_spec: spec });
      // Una sola tabla por respuesta: si la vuelve a pedir, la nueva reemplaza a la anterior.
      const previa = bi.findIndex((x) => (x as { spec: { grafica?: string } }).spec.grafica === "matriz");
      if (previa >= 0) bi.splice(previa, 1);
      if (bi.length < 4) bi.push({ spec, datos });
      return datos;
    }
    case "bi_consulta": {
      if (!usuario.es_admin) throw new Error("Glamy BI es solo para administradores.");
      // Solo las llaves conocidas, recortadas; la base valida y resuelve nombres.
      const spec: Record<string, string | boolean> = {};
      for (const k of ["metrica", "por", "curso", "comparar", "ciudad", "vendedora", "desde", "hasta", "grafica", "titulo"]) {
        const v = corto(entrada[k], k === "titulo" ? 80 : 60);
        if (v) spec[k] = v;
      }
      if (entrada.proximos === true || entrada.proximos === "true") spec.proximos = true;
      if (!BI_GRAFICAS.includes(String(spec.grafica))) spec.grafica = "barras";
      const datos = await rpc("bi_consulta", { p_spec: spec });
      if (bi.length < 4) bi.push({ spec, datos });
      return datos;
    }
    case "mis_tickets": {
      const { data, error } = await servicio.from("hub_pedidos").select("numero, titulo, estado, nota_admin, creado_en")
        .eq("creado_por", usuario.id).order("creado_en", { ascending: false }).limit(15);
      if (error) throw new Error(error.message);
      return { tickets: (data ?? []).map((p) => ({ ...p, estado: ESTADOS[p.estado] ?? p.estado })) };
    }
    case "buscar_tickets_abiertos": {
      // Solo título, sección y estado: nunca quién lo pidió.
      const { data, error } = await servicio.from("hub_pedidos").select("numero, titulo, seccion, estado")
        .in("estado", ["nuevo", "en_revision", "en_desarrollo"]).order("numero", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return { abiertos: (data ?? []).map((p) => ({ ...p, estado: ESTADOS[p.estado] ?? p.estado })) };
    }
    case "crear_ticket": {
      const fila = {
        creado_por: usuario.id,
        titulo: corto(entrada.titulo, 80), que_necesita: corto(entrada.que_necesita, 1500),
        seccion: corto(entrada.seccion, 60) || seccion || null, para_que: corto(entrada.para_que, 800) || null,
        ejemplo: corto(entrada.ejemplo, 800) || null, resumen: corto(entrada.resumen, 2000) || null,
      };
      if (!fila.titulo || !fila.que_necesita) throw new Error("Falta el título o qué necesita.");
      const { data, error } = await servicio.from("hub_pedidos").insert(fila).select("numero").single();
      if (error) throw new Error(error.message);
      return { creado: true, numero: data.numero };
    }
  }
  throw new Error("Herramienta desconocida: " + nombre);
}

/* Preguntas frecuentes del Hub (tabla tutorial_faq), en orden fijo (para que el prompt se pueda guardar en caché). */
let FAQ: { texto: string; en: number } | null = null;
async function faq() {
  if (FAQ && Date.now() - FAQ.en < 10 * 60_000) return FAQ.texto;
  const { data } = await servicio.from("tutorial_faq").select("seccion_id, pregunta, respuesta").eq("activo", true)
    .order("seccion_id").order("orden");
  const texto = (data ?? []).map((f) => `- [${f.seccion_id}] ${f.pregunta} → ${f.respuesta}`).join("\n");
  FAQ = { texto: texto ? `\n# Preguntas frecuentes del Hub\n${texto}\n` : "", en: Date.now() };
  return FAQ.texto;
}

/* Conversación con el modelo: vuelve a llamarlo mientras pida herramientas (máx. MAX_VUELTAS). */
type Uso = { entrada: number; salida: number; cacheLectura: number; cacheEscritura: number };
async function conversar(historial: Anthropic.MessageParam[], sistema: Anthropic.TextBlockParam[],
                         usarHerramienta: (nombre: string, entrada: Record<string, unknown>) => Promise<unknown>,
                         herramientas: Anthropic.Tool[] = HERRAMIENTAS, esfuerzo: "low" | "medium" = "low") {
  const uso: Uso = { entrada: 0, salida: 0, cacheLectura: 0, cacheEscritura: 0 };
  const usadas: string[] = [];
  let texto = "", error: string | null = null;
  const mensajes = [...historial];
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const r = await anthropic.messages.create({
        model: MODELO, max_tokens: 2048, output_config: { effort: esfuerzo },
        system: sistema, tools: herramientas, messages: mensajes,
      });
      uso.entrada += r.usage.input_tokens; uso.salida += r.usage.output_tokens;
      uso.cacheLectura += r.usage.cache_read_input_tokens ?? 0; uso.cacheEscritura += r.usage.cache_creation_input_tokens ?? 0;
      if (r.stop_reason === "refusal") { texto = "Eso no lo puedo contestar 🙏. ¿Te ayudo con algo del Hub?"; break; }
      const llamadas = r.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (r.stop_reason !== "tool_use" || !llamadas.length) {
        texto = r.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        if (r.stop_reason === "max_tokens") texto += "…";
        break;
      }
      // Se regresa el turno completo (con sus bloques de razonamiento) y todos los resultados juntos.
      mensajes.push({ role: "assistant", content: r.content });
      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const ll of llamadas) {
        usadas.push(ll.name);
        try {
          const datos = await usarHerramienta(ll.name, (ll.input ?? {}) as Record<string, unknown>);
          resultados.push({ type: "tool_result", tool_use_id: ll.id, content: JSON.stringify(datos ?? null) });
        } catch (err) {
          resultados.push({ type: "tool_result", tool_use_id: ll.id, is_error: true, content: String((err as Error)?.message ?? err).slice(0, 300) });
        }
      }
      mensajes.push({ role: "user", content: resultados });
    }
    if (!texto) texto = "Me enredé con esa 😅. ¿Me lo preguntas de otra forma?";
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) error = "llave inválida";
    else if (err instanceof Anthropic.RateLimitError) error = "límite de la API";
    else if (err instanceof Anthropic.APIError) error = `API ${err.status}: ${String(err.message).slice(0, 200)}`;
    else error = String((err as Error)?.message ?? err).slice(0, 200);
    texto = err instanceof Anthropic.RateLimitError
      ? "Glamy está muy ocupada, intenta en un minuto 🙏."
      : "Glamy no pudo contestar ahorita 😕. Intenta de nuevo; si sigue, avísale a Enoc.";
  }
  return { texto, uso, usadas, error };
}
const costoUSD = (u: Uso) => (u.entrada * PRECIO.entrada + u.salida * PRECIO.salida + u.cacheLectura * PRECIO.cacheLectura
  + u.cacheEscritura * PRECIO.cacheEscritura) / 1e6;

const INSTRUCCIONES_BI = `

# Modo Glamy BI (te escribe desde Reportes → Glamy BI)
Eres su analista de datos, como un Power BI que platica.
1. Para cualquier pregunta de números usa bi_consulta (y bi_giras si necesitas saber cuál fue la gira pasada). Elige la métrica, cómo agrupar y la gráfica que mejor respondan: tendencias → linea por semana, mes o semana_gira (con comparar si compara giras); rankings → barras_horizontales por ciudad o vendedora; partes de un todo → dona (máx. 6 partes); un solo número → kpi.
2. El Hub dibuja la gráfica con lo que regresa la herramienta: NO repitas la tabla ni todos los números.
3. Responde así, corto:
**Lectura**
- 2 o 3 renglones con lo importante: cifras concretas, contra qué se compara, quién destaca y quién se queda atrás.
**Recomendaciones**
- 1 a 3 acciones concretas que salgan SOLO de esos datos (a quién llamar primero, qué ciudad reforzar, qué revisar). Si los datos no alcanzan para recomendar, dilo.
4. Si comparas con periodos viejos, menciona el límite del dato (campo desde_confiable). No inventes cifras.
5. Si piden algo que el catálogo no tiene, dilo y ofrece levantar un ticket.
6. Si piden un resumen con varios datos por fila (por ciudad, curso o vendedora), usa bi_tabla UNA sola vez con todas las columnas (nunca dos tablas), no varias gráficas sueltas.
7. Si hay meta, di el avance (% de la meta). Si hay proyección, dila con su supuesto ("si sigue el ritmo de $X por semana").
8. Si la pregunta se puede entender de más de una forma (p. ej. "anticipos pendientes" = leads que prometieron y no pagan, o inscritas que todavía deben; "pendientes de pago" = por confirmar o por cobrar), contesta con la interpretación más probable, dilo en una frase, y al final agrega **Para afinar** con 1 o 2 preguntas de seguimiento, cada una en su propio renglón con esta marca exacta: ⟦seguir:la pregunta completa como la escribiría Jared⟧ (el Hub las vuelve botones). No las pongas si la pregunta fue clara.
9. Te hablan con palabras sencillas, no con los nombres de las métricas. Tradúcelas así (y en una frase di cómo lo entendiste, p. ej. "Tomé 'fecha de pago pendiente' como las que prometieron pagar y su fecha todavía no llega"):
- "ciudades pendientes", "las que faltan", "a las que iremos", "próximas", "lo que viene" → proximos: true (solo cursos que no han pasado; con bi_tabla por ciudad salen todas esas ciudades con su fecha).
- "con anticipo", "dieron anticipo", "apartaron su lugar", "deben el resto" → inscritas_deben. "pagaron algo", "con pago" → con_pago. "ya pagaron todo", "liquidaron" → liquidadas. "inscritas" a secas → inscritas.
- "fecha de pago pendiente", "prometieron pagar", "dijeron que pagan el…", "promesas" (sin decir vencidas) → promesa_vigente. "ya se les pasó la fecha", "quedaron mal", "promesas vencidas" → promesas_vencidas.
- "mandaron comprobante", "dicen que ya pagaron", "por confirmar" → leads_por_confirmar (cuántas) o pagos_por_confirmar ($); si preguntan por inscritas → inscritas_por_confirmar.
- "inscritas sin pago", "no han dado nada", "apartaron sin pagar" → inscritas_sin_pago.
- "cancelaron", "no van", "ya no van", "se bajaron", "dijeron que no irán", "pidieron reembolso" → no_van (incluye leads). Solo si piden únicamente inscritas → bajas.
- "cuánto nos deben", "saldo", "falta cobrar" → por_cobrar. "cuánto llevamos", "lo cobrado", "ingresos" → cobrado. "pagos de la semana/mes" → pagos (por fecha de pago).
- "faltaron", "no llegaron" → no_llegaron. "interesadas", "prospectos", "en seguimiento" → leads_abiertos.
- "en una sola tabla", "que las filas sean las ciudades" → bi_tabla por ciudad.`;

async function huella(texto: string) {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return responder({ error: "Petición inválida" }, 400); }

  // Ping: dice si la llave está y si el modelo responde. No gasta tokens ni muestra la llave.
  if (cuerpo?.accion === "ping") {
    const llave = !!Deno.env.get("ANTHROPIC_API_KEY");
    if (!llave) return responder({ llave: false, modelo: false });
    try { await anthropic.models.retrieve(MODELO); return responder({ llave: true, modelo: true }); }
    catch (err) { return responder({ llave: true, modelo: false, error: err instanceof Anthropic.APIError ? `${err.status}` : "sin conexión" }); }
  }

  // Prueba de punta a punta sin sesión del Hub: llave temporal (su huella vive en glamy_prueba_llave y caduca).
  // Las herramientas no tocan datos de nadie ni crean tickets. "simular" trae lo que regresaría cada
  // herramienta (datos de ejemplo del examen de Glamy: pruebas/examen_glamy.js).
  if (cuerpo?.accion === "prueba") {
    const llave = String(cuerpo.llave ?? "");
    const { data: valida } = llave
      ? await servicio.from("glamy_prueba_llave").select("hash").eq("hash", await huella(llave)).gt("expira_en", new Date().toISOString()).maybeSingle()
      : { data: null };
    if (!valida) return responder({ error: "No autorizado" }, 401);
    const historial = [{ role: "user" as const, content: corto(cuerpo.pregunta, 500) || "¿Qué haces?" }];
    const simular = (cuerpo.simular && typeof cuerpo.simular === "object") ? cuerpo.simular as Record<string, unknown> : {};
    // modo "bi": como Reportes → Glamy BI (administrador). Se regresa con qué datos llamó cada herramienta.
    const enBI = cuerpo.modo === "bi";
    const sistema: Anthropic.TextBlockParam[] = [
      { type: "text", text: MANUAL + await faq(), cache_control: { type: "ephemeral" } },
      { type: "text", text: "# Quién te escribe\nPrueba técnica del sistema (modo prueba: las herramientas regresan datos de ejemplo). "
        + (enBI ? `Rol: Dirección, administrador. Está en la sección "reportes".` + INSTRUCCIONES_BI
                : `Rol: Cobranza. Está en la sección "${corto(cuerpo.seccion, 30) || "inicio"}". Secciones que puede abrir: inicio, board, historial, cursos, cobranza, nollegaron, calendario, academia, mensajes.`) },
    ];
    const llamadas: { nombre: string; entrada: Record<string, unknown> }[] = [];
    const r = await conversar(historial, sistema, async (nombre, entrada) => {
      llamadas.push({ nombre, entrada });
      return simular[nombre] ?? { modo_prueba: true, herramienta: nombre, nota: "Sin datos en modo prueba." };
    }, enBI ? [...HERRAMIENTAS, ...HERRAMIENTAS_BI] : HERRAMIENTAS, enBI ? "medium" : "low");
    return responder({ ...r, llamadas, costo_usd: Number(costoUSD(r.uso).toFixed(6)) });
  }

  // Sesión de quien pregunta.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: sesion } = await servicio.auth.getUser(token);
  if (!sesion?.user) return responder({ error: "Inicia sesión en el Hub." }, 401);
  const { data: usuario } = await servicio.from("usuarios").select("id, nombre, rol, es_admin, recibe_pedidos")
    .eq("auth_user_id", sesion.user.id).maybeSingle<Usuario>();
  if (!usuario) return responder({ error: "Tu usuario no está dado de alta en el Hub." }, 403);

  // Sin límites por ahora: cada pregunta se anota en glamy_uso para medir.
  const hoy = hoyMX();

  // Conversación: solo texto, los últimos 16 mensajes, empezando y terminando con la persona.
  const historial: Anthropic.MessageParam[] = (Array.isArray(cuerpo.mensajes) ? cuerpo.mensajes : [])
    .filter((m: { rol?: string; texto?: string }) => (m?.rol === "user" || m?.rol === "assistant") && String(m?.texto ?? "").trim())
    .slice(-16)
    .map((m: { rol: "user" | "assistant"; texto: string }) => ({ role: m.rol, content: corto(m.texto, 2000) }));
  while (historial.length && historial[0].role !== "user") historial.shift();
  if (!historial.length || historial[historial.length - 1].role !== "user") return responder({ error: "Escribe tu pregunta." }, 400);

  // Con la sesión del usuario: las consultas respetan sus permisos.
  const sbUsuario = createClient(URL_SB, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: secciones } = await sbUsuario.rpc("glamy_secciones");
  const seccion = corto(cuerpo.seccion, 30);
  const fechaLarga = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const contexto = `# Quién te escribe
${usuario.nombre} (rol: ${usuario.rol}${usuario.es_admin ? ", administrador" : ""}). Hoy es ${fechaLarga}. Está en la sección "${seccion || "inicio"}".
Secciones que puede abrir: ${(secciones ?? []).join(", ")}${usuario.recibe_pedidos ? ", glamy (el uso de Glamy y los tickets; los recibe él)" : ""}.
Solo pon botones ⟦ir:…⟧ de secciones que puede abrir.`;

  // Glamy BI: solo administradores y solo desde Reportes → Glamy BI (ahí se dibujan las gráficas).
  const modoBI = cuerpo.modo === "bi" && usuario.es_admin;
  const sistema: Anthropic.TextBlockParam[] = [
    { type: "text", text: MANUAL + await faq(), cache_control: { type: "ephemeral" } },
    { type: "text", text: contexto + (modoBI ? INSTRUCCIONES_BI : "") },
  ];

  const bi: unknown[] = [];
  const { texto, uso, usadas, error } = await conversar(historial, sistema,
    (nombre, entrada) => ejecutar(nombre, entrada, sbUsuario as unknown as ClienteRpc, usuario, seccion, bi),
    modoBI ? [...HERRAMIENTAS, ...HERRAMIENTAS_BI] : HERRAMIENTAS, modoBI ? "medium" : "low");

  const costo = costoUSD(uso);
  await servicio.from("glamy_uso").insert({
    usuario_id: usuario.id, fecha: hoy, tokens_entrada: uso.entrada, tokens_salida: uso.salida,
    tokens_cache_lectura: uso.cacheLectura, tokens_cache_escritura: uso.cacheEscritura,
    costo_usd: Number(costo.toFixed(6)), herramientas: usadas, error,
  });
  return responder({ texto, herramientas: usadas, ...(modoBI ? { bi } : {}) });
});
