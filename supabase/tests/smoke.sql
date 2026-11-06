-- Pruebas SQL de humo. Ejecutar con `supabase test db` (requiere Docker local)
-- o pegando el contenido en el SQL Editor después de aplicar seed.sql.

do $$
begin
  if (select count(*) from public.institutos) < 1 then
    raise exception 'No hay institutos';
  end if;
  if (select count(*) from public.cargos) < 1 then
    raise exception 'No hay cargos';
  end if;
  if (select count(*) from public.profesionales) < 1 then
    raise exception 'No hay profesionales';
  end if;
  if (select count(*) from public.dotacion_mensual) < 1 then
    raise exception 'No hay dotación mensual';
  end if;
  if (select count(*) from public.planificacion_mensual) < 1 then
    raise exception 'No hay planificación calculada';
  end if;
end $$;

do $$
begin
  if public.fn_horas_jornada_legal(2026, 4) <> 44 then
    raise exception 'Abril 2026 debería tener 44 horas legales';
  end if;
  if public.fn_horas_jornada_legal(2026, 5) <> 42 then
    raise exception 'Mayo 2026 debería tener 42 horas legales';
  end if;
  if public.fn_parametro('meta_gestion', '2026-06-01') <> 0.90 then
    raise exception 'La meta de gestión debería ser 0.90';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from public.v_planificacion_nacional) then
    raise exception 'La vista nacional está vacía';
  end if;
  if not exists (select 1 from public.v_planificacion_instituto) then
    raise exception 'La vista por instituto está vacía';
  end if;
  if not exists (select 1 from public.v_planificacion_profesional) then
    raise exception 'La vista por profesional está vacía';
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'institutos', 'dotacion_mensual', 'asignaciones_profesional',
    'atenciones_sic', 'planificacion_mensual', 'profiles'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = t
        and c.relrowsecurity
    ) then
      raise exception 'RLS no está habilitado en %', t;
    end if;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from public.v_dotacion_inconsistencias) then
    raise exception 'Hay inconsistencias de dotación en el seed';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rpc_ingestar_buk'
  ) then
    raise exception 'Falta la función rpc_ingestar_buk';
  end if;
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fn_generar_planificacion'
  ) then
    raise exception 'Falta la función fn_generar_planificacion';
  end if;
end $$;

select 'Smoke test SQL OK' as resultado;
