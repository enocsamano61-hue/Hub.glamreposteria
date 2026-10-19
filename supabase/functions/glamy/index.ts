/* =========================================================
   GLAMY — asistente del Hub (Supabase Edge Function).
   - Revisa la sesión de quien pregunta y sus límites (40 preguntas al día,
     tope mensual de gasto).
   - Llama a Claude Haiku 5.5 con el manual del Hub y herramientas de
     SOLO LECTURA. Las consultas de datos corren con la sesión de quien
     pregunta (RLS + secciones de su rol, en las funciones glamy_* de la base).
   - Los pedidos (hub_pedidos) los crea con la llave de servicio.
   - Anota el uso en glamy_uso (sin el texto de la conversación).
   La llave de Anthropic vive en el secreto ANTHROPIC_API_KEY.
   Ver docs/migraciones/2026-10-19-glamy.md
   ========================================================= */
import Anthropic from "npm:@anthropic-ai/sdk@0.135.0";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { MANUAL } from "./manual.ts";

const MODELO = "claude-haiku-5-5";
const LIMITE_DIARIO = 40;          // preguntas por persona al día
const TOPE_MENSUAL_USD = 25;       // se detiene si el mes llega a esto (además del tope en la consola de Anthropic)
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
    description: "Busca alumnas, leads o cualquier persona por celular (7 o más dígitos, con o sin lada) o por nombre. Regresa sus cursos (ciudad, fecha, estatus, si llegó, pagado, lo que debe, pagos por confirmar, diploma), sus leads y, si el rol lo permite, su información de la Academia. Úsala siempre que peguen un número o pregunten por alguien.",
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
    name: "mis_pedidos",
    description: "Los pedidos al Hub que ha hecho quien te habla y en qué estado van.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_pedidos_abiertos",
    description: "Lista los pedidos al Hub que siguen abiertos (número, título, sección y estado) para no duplicar uno. Úsala SIEMPRE antes de crear_pedido.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "crear_pedido",
    description: "Manda a Enoc un pedido de algo que el Hub no hace (o un error). Solo después de entenderlo bien y de revisar con buscar_pedidos_abiertos que no exista ya.",
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

type Usuario = { id: string; nombre: string; rol: string; es_admin: boolean; recibe_pedidos: boolean };
// Lo único que se usa del cliente con la sesión del usuario: llamar funciones glamy_*.
type ClienteRpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

async function ejecutar(nombre: string, entrada: Record<string, unknown>, sb: ClienteRpc, usuario: Usuario, seccion: string) {
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
    case "mis_pedidos": {
      const { data, error } = await servicio.from("hub_pedidos").select("numero, titulo, estado, nota_admin, creado_en")
        .eq("creado_por", usuario.id).order("creado_en", { ascending: false }).limit(15);
      if (error) throw new Error(error.message);
      return { pedidos: (data ?? []).map((p) => ({ ...p, estado: ESTADOS[p.estado] ?? p.estado })) };
    }
    case "buscar_pedidos_abiertos": {
      // Solo título, sección y estado: nunca quién lo pidió.
      const { data, error } = await servicio.from("hub_pedidos").select("numero, titulo, seccion, estado")
        .in("estado", ["nuevo", "en_revision", "en_desarrollo"]).order("numero", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return { abiertos: (data ?? []).map((p) => ({ ...p, estado: ESTADOS[p.estado] ?? p.estado })) };
    }
    case "crear_pedido": {
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

/* Preguntas frecuentes del tutorial, en orden fijo (para que el prompt se pueda guardar en caché). */
let FAQ: { texto: string; en: number } | null = null;
async function faq() {
  if (FAQ && Date.now() - FAQ.en < 10 * 60_000) return FAQ.texto;
  const { data } = await servicio.from("tutorial_faq").select("seccion_id, pregunta, respuesta").eq("activo", true)
    .order("seccion_id").order("orden");
  const texto = (data ?? []).map((f) => `- [${f.seccion_id}] ${f.pregunta} → ${f.respuesta}`).join("\n");
  FAQ = { texto: texto ? `\n# Preguntas frecuentes del tutorial\n${texto}\n` : "", en: Date.now() };
  return FAQ.texto;
}

/* Conversación con el modelo: vuelve a llamarlo mientras pida herramientas (máx. MAX_VUELTAS). */
type Uso = { entrada: number; salida: number; cacheLectura: number; cacheEscritura: number };
async function conversar(historial: Anthropic.MessageParam[], sistema: Anthropic.TextBlockParam[],
                         usarHerramienta: (nombre: string, entrada: Record<string, unknown>) => Promise<unknown>) {
  const uso: Uso = { entrada: 0, salida: 0, cacheLectura: 0, cacheEscritura: 0 };
  const usadas: string[] = [];
  let texto = "", error: string | null = null;
  const mensajes = [...historial];
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const r = await anthropic.messages.create({
        model: MODELO, max_tokens: 2048, output_config: { effort: "low" },
        system: sistema, tools: HERRAMIENTAS, messages: mensajes,
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
  // Las herramientas no tocan datos de nadie ni crean pedidos.
  if (cuerpo?.accion === "prueba") {
    const llave = String(cuerpo.llave ?? "");
    const { data: valida } = llave
      ? await servicio.from("glamy_prueba_llave").select("hash").eq("hash", await huella(llave)).gt("expira_en", new Date().toISOString()).maybeSingle()
      : { data: null };
    if (!valida) return responder({ error: "No autorizado" }, 401);
    const historial = [{ role: "user" as const, content: corto(cuerpo.pregunta, 500) || "¿Qué haces?" }];
    const sistema: Anthropic.TextBlockParam[] = [
      { type: "text", text: MANUAL + await faq(), cache_control: { type: "ephemeral" } },
      { type: "text", text: "# Quién te escribe\nPrueba técnica del sistema (modo prueba: las herramientas no regresan datos reales)." },
    ];
    const r = await conversar(historial, sistema, async (nombre) => ({ modo_prueba: true, herramienta: nombre, nota: "Sin datos en modo prueba." }));
    return responder({ ...r, costo_usd: Number(costoUSD(r.uso).toFixed(6)) });
  }

  // Sesión de quien pregunta.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: sesion } = await servicio.auth.getUser(token);
  if (!sesion?.user) return responder({ error: "Inicia sesión en el Hub." }, 401);
  const { data: usuario } = await servicio.from("usuarios").select("id, nombre, rol, es_admin, recibe_pedidos")
    .eq("auth_user_id", sesion.user.id).maybeSingle<Usuario>();
  if (!usuario) return responder({ error: "Tu usuario no está dado de alta en el Hub." }, 403);

  // Límites: 40 preguntas al día y tope mensual.
  const hoy = hoyMX();
  const { count } = await servicio.from("glamy_uso").select("id", { count: "exact", head: true }).eq("usuario_id", usuario.id).eq("fecha", hoy);
  if ((count ?? 0) >= LIMITE_DIARIO) {
    return responder({ texto: `Ya hiciste las ${LIMITE_DIARIO} preguntas de hoy 🙈. Mañana seguimos. Si es urgente, avísale a Enoc.`, restantes: 0 });
  }
  const { data: mes } = await servicio.from("glamy_uso").select("costo_usd").gte("fecha", hoy.slice(0, 8) + "01");
  const gastoMes = (mes ?? []).reduce((s, f) => s + Number(f.costo_usd || 0), 0);
  if (gastoMes >= TOPE_MENSUAL_USD) {
    return responder({ texto: "Glamy ya llegó a su límite de este mes 😴. Avísale a Enoc si lo necesitas.", restantes: 0 });
  }

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
Secciones que puede abrir: ${(secciones ?? []).join(", ")}${usuario.recibe_pedidos ? ", pedidos (recibe los pedidos de Glamy)" : ""}.
Solo pon botones ⟦ir:…⟧ de secciones que puede abrir.`;

  const sistema: Anthropic.TextBlockParam[] = [
    { type: "text", text: MANUAL + await faq(), cache_control: { type: "ephemeral" } },
    { type: "text", text: contexto },
  ];

  const { texto, uso, usadas, error } = await conversar(historial, sistema,
    (nombre, entrada) => ejecutar(nombre, entrada, sbUsuario as unknown as ClienteRpc, usuario, seccion));

  const costo = costoUSD(uso);
  await servicio.from("glamy_uso").insert({
    usuario_id: usuario.id, fecha: hoy, tokens_entrada: uso.entrada, tokens_salida: uso.salida,
    tokens_cache_lectura: uso.cacheLectura, tokens_cache_escritura: uso.cacheEscritura,
    costo_usd: Number(costo.toFixed(6)), herramientas: usadas, error,
  });
  return responder({ texto, restantes: Math.max(LIMITE_DIARIO - (count ?? 0) - 1, 0), herramientas: usadas });
});
