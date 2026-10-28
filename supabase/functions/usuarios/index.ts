/* =========================================================
   USUARIOS — alta, baja y contraseña temporal (Supabase Edge Function).
   - Solo administradores activos del Hub (se revisa la sesión de quien llama).
   - Solo quien recibe los tickets (Enoc) crea administradores o da "Recibe tickets",
     y solo él da de baja o le cambia la contraseña a un administrador.
   - Nunca se borra un usuario: "baja" lo bloquea en Auth y lo marca activo = false.
   - La contraseña temporal se regresa una sola vez (no se guarda en ningún lado);
     al entrar, el Hub le pide cambiarla (debe_cambiar_password).
   Ver docs/migraciones/2026-10-28-usuarios.md
   ========================================================= */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const servicio = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const corto = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

type Usuario = { id: string; auth_user_id: string | null; nombre: string; email: string; rol: string; es_admin: boolean; recibe_pedidos: boolean; activo: boolean };
const CAMPOS = "id, auth_user_id, nombre, email, rol, es_admin, recibe_pedidos, activo";

// Contraseña temporal fácil de dictar: sin letras que se confunden (0/O, 1/l/I).
function contrasenaTemporal() {
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  const t = Array.from(b, (x) => letras[x % letras.length]).join("");
  return `Glam-${t.slice(0, 4)}-${t.slice(4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  let cuerpo: Record<string, unknown>;
  try { cuerpo = await req.json(); } catch { return responder({ error: "Petición inválida" }, 400); }

  // Quién llama: administrador activo del Hub.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: sesion } = await servicio.auth.getUser(token);
  if (!sesion?.user) return responder({ error: "Inicia sesión en el Hub." }, 401);
  const { data: yo } = await servicio.from("usuarios").select(CAMPOS).eq("auth_user_id", sesion.user.id).maybeSingle<Usuario>();
  if (!yo || !yo.activo || !yo.es_admin) return responder({ error: "Solo los administradores pueden hacer esto." }, 403);
  const dueno = yo.recibe_pedidos;   // Enoc

  const accion = String(cuerpo.accion ?? "");

  if (accion === "crear") {
    const nombre = corto(cuerpo.nombre, 80), email = corto(cuerpo.email, 120).toLowerCase(), rol = corto(cuerpo.rol, 60);
    const esAdmin = cuerpo.es_admin === true, recibe = cuerpo.recibe_pedidos === true, vende = cuerpo.es_vendedor === true;
    if (!nombre || !rol) return responder({ error: "Falta el nombre o el rol." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responder({ error: "Ese correo no es válido." }, 400);
    if ((esAdmin || recibe) && !dueno) return responder({ error: "Solo quien recibe los tickets puede crear administradores o dar \"Recibe tickets\"." }, 403);
    const { data: existe } = await servicio.from("usuarios").select("nombre, activo").eq("email", email).maybeSingle();
    if (existe) return responder({ error: `Ese correo ya es de ${existe.nombre}${existe.activo ? "" : " (dado de baja: usa Reactivar)"}.` }, 409);
    const password = contrasenaTemporal();
    const { data: cuenta, error: e1 } = await servicio.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } });
    if (e1 || !cuenta?.user) {
      const ya = /already|registered|exists/i.test(e1?.message ?? "");
      return responder({ error: ya ? "Ese correo ya tiene cuenta para entrar, pero no está en Usuarios. Avísale a Enoc." : "No se pudo crear la cuenta: " + (e1?.message ?? "") }, ya ? 409 : 500);
    }
    const { data: nuevo, error: e2 } = await servicio.from("usuarios").insert({
      auth_user_id: cuenta.user.id, nombre, email, rol, es_admin: esAdmin, recibe_pedidos: recibe, es_vendedor: vende,
      debe_cambiar_password: true, bienvenida_pendiente: true, creado_por: yo.id,
    }).select("id").single();
    if (e2) {
      // Se deshace la cuenta recién creada (todavía no tiene nada) para poder intentarlo otra vez.
      await servicio.auth.admin.deleteUser(cuenta.user.id);
      return responder({ error: "No se pudo dar de alta: " + e2.message }, 500);
    }
    return responder({ ok: true, usuario_id: nuevo.id, nombre, email, password });
  }

  if (accion === "contrasena" || accion === "baja" || accion === "reactivar") {
    const { data: u } = await servicio.from("usuarios").select(CAMPOS).eq("id", corto(cuerpo.usuario_id, 40)).maybeSingle<Usuario>();
    if (!u) return responder({ error: "No encontré a esa persona." }, 404);
    if (u.id === yo.id) return responder({ error: "Esto no se puede hacer con tu propio usuario." }, 400);
    if ((u.es_admin || u.recibe_pedidos) && !dueno) return responder({ error: "A un administrador solo lo puede cambiar quien recibe los tickets." }, 403);
    if (!u.auth_user_id) return responder({ error: "Esa persona no tiene cuenta para entrar." }, 400);

    if (accion === "baja") {
      if (!u.activo) return responder({ error: "Ya está dado de baja." }, 400);
      // Bloqueada en Auth (no puede entrar ni renovar su sesión); sus datos se quedan.
      const { error: e1 } = await servicio.auth.admin.updateUserById(u.auth_user_id, { ban_duration: "876000h" });
      if (e1) return responder({ error: "No se pudo bloquear su cuenta: " + e1.message }, 500);
      const { error: e2 } = await servicio.from("usuarios").update({ activo: false, baja_en: new Date().toISOString(), baja_por: yo.id, es_vendedor: false }).eq("id", u.id);
      if (e2) return responder({ error: "Se bloqueó su cuenta pero no se guardó la baja: " + e2.message }, 500);
      return responder({ ok: true, nombre: u.nombre });
    }

    // Contraseña nueva o reactivar: en los dos casos se le da una contraseña temporal.
    if (accion === "contrasena" && !u.activo) return responder({ error: "Está dado de baja: usa Reactivar." }, 400);
    if (accion === "reactivar" && u.activo) return responder({ error: "Ya está activo." }, 400);
    const password = contrasenaTemporal();
    const cambios: Record<string, unknown> = { password };
    if (accion === "reactivar") cambios.ban_duration = "none";
    const { error: e1 } = await servicio.auth.admin.updateUserById(u.auth_user_id, cambios);
    if (e1) return responder({ error: "No se pudo cambiar su cuenta: " + e1.message }, 500);
    const fila: Record<string, unknown> = { debe_cambiar_password: true };
    if (accion === "reactivar") Object.assign(fila, { activo: true, baja_en: null, baja_por: null });
    const { error: e2 } = await servicio.from("usuarios").update(fila).eq("id", u.id);
    if (e2) return responder({ error: "Se cambió su contraseña pero no se guardó en Usuarios: " + e2.message }, 500);
    return responder({ ok: true, nombre: u.nombre, email: u.email, password });
  }

  return responder({ error: "Acción desconocida." }, 400);
});
