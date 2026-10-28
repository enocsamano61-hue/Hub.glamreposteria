/* HISTORIAS COMPLETAS contra la base real, sin dejar rastro (28 oct 2026).
   Recorren lo que hace el equipo de punta a punta y en cada paso revisan que todo cuadre: el Embudo,
   la lista del cambio de fecha y el lead; al final de cada historia, las reglas rojas del vigilante en 0.
   Las corre Claude antes de publicar, con la herramienta de SQL de Supabase. Todo pasa dentro de un
   bloque que termina en error a propósito, así la base queda igual. El resultado viene en ese mensaje:
   "HISTORIAS fallas=0 ..." = todo bien. Si falla una, no se publica.
   Las escrituras imitan las del Hub (hub/index.html): Registrar pago, Confirmar pago (inscribir desde el
   lead), No se encontró, Cambiar de curso, Ceder su lugar (ceder_lugar) y Reembolso
   (cambio_fecha_marcar + cambio_fecha_cerrar_reembolso). Personas de prueba inventadas. */
do $historias$
declare
  v_hoy date := (now() at time zone 'America/Mexico_City')::date;
  e0 uuid; ea uuid; eb uuid; v_admin uuid; v_yo uuid; v_vend uuid;
  st_pagado int; st_ppc int; st_anticipo int; st_novence int; st_intento int;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; l1 uuid; l2 uuid; l3 uuid; i1 uuid; i3 uuid; a1 uuid; a3 uuid;
  ok int := 0; mal text[] := '{}'; t text; rojos text;
begin
  -- Ayudantes (solo viven en esta corrida)
  execute $f$create function pg_temp.grupos(p_ev uuid, p_per uuid) returns text language sql as $s$
    select coalesce(string_agg(x.grupo || case when x.inscripcion_id is not null then '(i)' else '(l)' end, ',' order by x.grupo), '-')
      from public.embudo_cursos((select curso_id from public.eventos where id = p_ev), (select fecha from public.eventos where id = p_ev), p_ev) x
     where x.persona_id = p_per $s$$f$;
  execute $f$create function pg_temp.lista(p_ev uuid, p_per uuid) returns text language sql as $s$
    select coalesce(string_agg(case when x.inscripcion_id is not null then 'inscrita' else 'lead' end || ':' || x.estado || ':' || coalesce(a.origen, '-'), ','), '-')
      from public.cambio_fecha_lista(p_ev) x join public.cambio_fecha_avisos a on a.id = x.aviso_id where x.persona_id = p_per $s$$f$;
  execute $f$create function pg_temp.rojos() returns text language sql as $s$
    select coalesce(string_agg((x ->> 'regla') || '=' || (x ->> 'n'), ' '), '') from jsonb_array_elements(public.vigilante_calcular()) x
     where x ->> 'tipo' = 'rojo' and (x ->> 'n')::int > 0 $s$$f$;

  -- Quién: el administrador que recibe los tickets (ceder lugar y cerrar reembolso piden administrador o Cobranza)
  select u.auth_user_id, u.id into v_admin, v_yo from public.usuarios u where u.recibe_pedidos limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  select id into v_vend from public.usuarios where es_vendedor limit 1;
  select id into st_pagado from public.estatus where clave = 'pagado';
  select id into st_ppc from public.estatus where clave = 'pago_por_confirmar';
  select id into st_anticipo from public.estatus where clave = 'anticipo_vigente';
  select id into st_novence from public.estatus where clave = 'no_vence_pago';
  select id into st_intento from public.estatus where clave = 'primer_intento';
  -- Cursos: uno sin cambio de fecha (e0) y dos con cambio (ea, eb)
  select e.id into e0 from public.eventos e where e.fecha > v_hoy + 1 and e.curso_id is not null
     and not exists (select 1 from public.cambios_fecha c where c.evento_id = e.id) order by e.fecha limit 1;
  select e.id into ea from public.eventos e where e.fecha > v_hoy + 1 and e.curso_id is not null
     and exists (select 1 from public.cambios_fecha c where c.evento_id = e.id) order by e.fecha limit 1;
  select e.id into eb from public.eventos e where e.fecha > v_hoy + 1 and e.curso_id is not null and e.id <> ea
     and exists (select 1 from public.cambios_fecha c where c.evento_id = e.id) order by e.fecha limit 1;
  if e0 is null or ea is null or eb is null then raise exception 'HISTORIAS no hay cursos para probar (e0=%, ea=%, eb=%)', e0, ea, eb; end if;
  rojos := pg_temp.rojos();
  if rojos <> '' then mal := mal || ('Antes de empezar ya fallan reglas rojas: ' || rojos); end if;

  -- ===== H1. Lead nuevo → Registrar pago → Confirmar pago (curso sin cambio de fecha) =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA UNO', '0000000101') returning id into p1;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p1, e0, st_novence, v_vend, (select ciudad_id from public.eventos where id = e0)) returning id into l1;
  t := pg_temp.grupos(e0, p1); if t = 'sin_respuesta(l)' then ok := ok + 1; else mal := mal || ('H1 lead nuevo · Embudo: ' || t); end if;
  update public.leads set pago_reportado_monto = 700, pago_reportado_fecha = v_hoy, pago_reportado_banco = 'BANCO PRUEBA',
         pago_reportado_por = v_yo, pago_reportado_en = now(), estatus_antes_de_reporte = estatus_id, estatus_id = st_ppc, actualizado_en = now()
   where id = l1;
  t := pg_temp.grupos(e0, p1); if t = 'sin_confirmar(l)' then ok := ok + 1; else mal := mal || ('H1 pago registrado · Embudo: ' || t); end if;
  insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
  values (p1, e0, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA') returning id into i1;
  insert into public.pagos (inscripcion_id, monto, fecha, banco) values (i1, 700, v_hoy, 'BANCO PRUEBA');
  update public.leads set estatus_id = st_pagado, comentario = 'CERRADO: historia', actualizado_en = now() where id = l1;
  t := pg_temp.grupos(e0, p1); if t = 'anticipo(i)' then ok := ok + 1; else mal := mal || ('H1 confirmado · Embudo: ' || t); end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H1 vigilante: ' || rojos); end if;

  -- ===== H2. Registrar pago → "No se encontró" =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA DOS', '0000000102') returning id into p2;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p2, e0, st_intento, v_vend, (select ciudad_id from public.eventos where id = e0)) returning id into l2;
  update public.leads set pago_reportado_monto = 700, pago_reportado_fecha = v_hoy, pago_reportado_banco = 'BANCO PRUEBA',
         pago_reportado_por = v_yo, pago_reportado_en = now(), estatus_antes_de_reporte = estatus_id, estatus_id = st_ppc, actualizado_en = now()
   where id = l2;
  update public.leads set estatus_id = estatus_antes_de_reporte, estatus_antes_de_reporte = null, pago_reportado_monto = null, pago_reportado_fecha = null,
         pago_reportado_banco = null, pago_reportado_por = null, pago_reportado_en = null, comentario = 'PAGO NO ENCONTRADO: historia', actualizado_en = now()
   where id = l2;
  t := pg_temp.grupos(e0, p2); if t = 'sin_respuesta(l)' then ok := ok + 1; else mal := mal || ('H2 no se encontró · Embudo: ' || t); end if;
  if not exists (select 1 from public.inscripciones where persona_id = p2) then ok := ok + 1; else mal := mal || 'H2 quedó inscrita sin pago confirmado'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H2 vigilante: ' || rojos); end if;

  -- ===== H3. Inscrita → Cambiar de curso a uno con cambio de fecha → Aceptó → otro curso con cambio =====
  update public.inscripciones set evento_id = ea, notas_migracion = notas_migracion || ' || CAMBIÓ DE CURSO (historia)' where id = i1;
  if (select evento_id from public.leads where id = l1) = ea then ok := ok + 1; else mal := mal || 'H3 su lead se quedó en el curso anterior'::text; end if;
  t := pg_temp.lista(ea, p1); if t like 'inscrita:sin_avisar:%' then ok := ok + 1; else mal := mal || ('H3 lista del curso nuevo: ' || t); end if;
  t := pg_temp.grupos(ea, p1) || ' / antes: ' || pg_temp.grupos(e0, p1);
  if t = 'anticipo(i) / antes: -' then ok := ok + 1; else mal := mal || ('H3 Embudo: ' || t); end if;
  select a.id into a1 from public.cambio_fecha_avisos a where a.persona_id = p1 and a.inscripcion_id = i1
     and a.cambio_id = (select c.id from public.cambios_fecha c where c.evento_id = ea order by c.creado_en desc limit 1);
  perform public.cambio_fecha_marcar(a1, 'acepto', null);
  update public.inscripciones set evento_id = eb where id = i1;
  t := pg_temp.lista(eb, p1) || ' / antes: ' || pg_temp.lista(ea, p1);
  if t = 'inscrita:sin_avisar:otro_curso / antes: -' then ok := ok + 1; else mal := mal || ('H3 segundo cambio · listas: ' || t); end if;
  if exists (select 1 from public.cambio_fecha_avisos a join public.cambios_fecha c on c.id = a.cambio_id
              where a.persona_id = p1 and c.evento_id = eb and a.origen_nota like '%allá estaba: Aceptó%') then ok := ok + 1;
  else mal := mal || 'H3 la nota no dice qué tenía en el curso anterior'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H3 vigilante: ' || rojos); end if;

  -- ===== H4. Inscrita → Ceder su lugar a otra persona =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA CUATRO', '0000000104') returning id into p4;
  perform public.ceder_lugar(i1, p4, 'Prueba de historia');
  t := pg_temp.lista(eb, p4) || ' / la que cedió: ' || pg_temp.lista(eb, p1);
  if t like 'inscrita:%' || ' / la que cedió: -' then ok := ok + 1; else mal := mal || ('H4 lista: ' || t); end if;
  t := pg_temp.grupos(eb, p4) || ' / la que cedió: ' || pg_temp.grupos(eb, p1);
  if t = 'anticipo(i) / la que cedió: -' then ok := ok + 1; else mal := mal || ('H4 Embudo: ' || t); end if;
  if exists (select 1 from public.leads where persona_id = p4) then ok := ok + 1; else mal := mal || 'H4 quien recibió el lugar no tiene lead'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H4 vigilante: ' || rojos); end if;

  -- ===== H5. Lead capturado después del cambio de fecha → Aceptó → paga =====
  insert into public.personas (nombre, telefono_principal) values ('HISTORIA CINCO', '0000000105') returning id into p3;
  insert into public.leads (persona_id, evento_id, estatus_id, asesor_id, ciudad_interes_id)
  values (p3, ea, st_novence, v_vend, (select ciudad_id from public.eventos where id = ea)) returning id into l3;
  t := pg_temp.lista(ea, p3); if t = 'lead:sin_avisar:nueva' then ok := ok + 1; else mal := mal || ('H5 lead nuevo · lista: ' || t); end if;
  select a.id into a3 from public.cambio_fecha_avisos a where a.persona_id = p3
     and a.cambio_id = (select c.id from public.cambios_fecha c where c.evento_id = ea order by c.creado_en desc limit 1);
  perform public.cambio_fecha_marcar(a3, 'acepto', null);
  update public.leads set pago_reportado_monto = 700, pago_reportado_fecha = v_hoy, pago_reportado_banco = 'BANCO PRUEBA',
         pago_reportado_por = v_yo, pago_reportado_en = now(), estatus_antes_de_reporte = estatus_id, estatus_id = st_ppc, actualizado_en = now()
   where id = l3;
  t := pg_temp.lista(ea, p3); if t = 'lead:acepto:nueva' then ok := ok + 1; else mal := mal || ('H5 pago reportado · lista: ' || t); end if;
  insert into public.inscripciones (persona_id, evento_id, precio_pactado, paquete, anticipo, restante, liquidado, estatus_id, asesor_id, notas_migracion)
  values (p3, ea, 1400, 'BASICO', 700, 700, false, st_anticipo, v_vend, 'HISTORIA') returning id into i3;
  insert into public.pagos (inscripcion_id, monto, fecha, banco) values (i3, 700, v_hoy, 'BANCO PRUEBA');
  update public.leads set estatus_id = st_pagado, comentario = 'CERRADO: historia', actualizado_en = now() where id = l3;
  t := pg_temp.lista(ea, p3); if t = 'inscrita:acepto:nueva' then ok := ok + 1; else mal := mal || ('H5 inscrita · lista: ' || t); end if;
  perform public.cambio_fecha_regalo(a3, 'Pan de muerto', false);
  if (select regalo_curso from public.cambio_fecha_avisos where id = a3) = 'Pan de muerto' then ok := ok + 1; else mal := mal || 'H5 no se pudo registrar su regalo'::text; end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H5 vigilante: ' || rojos); end if;

  -- ===== H6. Inscrita → pide reembolso → Cobranza cierra su lugar =====
  perform public.cambio_fecha_marcar(a3, 'reembolso', 'historia');
  perform public.cambio_fecha_cerrar_reembolso(a3, 'historia');
  t := pg_temp.grupos(ea, p3); if t = 'no_van(i)' then ok := ok + 1; else mal := mal || ('H6 Embudo: ' || t); end if;
  t := pg_temp.lista(ea, p3); if t like 'inscrita:reembolsada:%' then ok := ok + 1; else mal := mal || ('H6 lista: ' || t); end if;
  rojos := pg_temp.rojos(); if rojos = '' then ok := ok + 1; else mal := mal || ('H6 vigilante: ' || rojos); end if;

  raise exception 'HISTORIAS fallas=% bien=% | %', coalesce(array_length(mal, 1), 0), ok, array_to_string(mal, ' || ');
end $historias$;
