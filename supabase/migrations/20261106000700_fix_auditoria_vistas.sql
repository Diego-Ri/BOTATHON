-- =============================================================================
-- 07 · Correcciones posteriores al primer despliegue
-- =============================================================================

-- La tabla profiles usa user_id como PK, no id. El trigger de auditoría
-- debe obtener la clave de forma genérica para no romper el alta de usuarios.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_just text := nullif(current_setting('app.justificacion', true), '');
  v_record_id text;
begin
  if tg_op = 'DELETE' then
    v_record_id := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'user_id', '');
    insert into public.auditoria (tabla, registro_id, accion, datos_antes, usuario_id, justificacion)
    values (tg_table_name, v_record_id, tg_op, to_jsonb(old), v_user, v_just);
    return old;
  elsif tg_op = 'UPDATE' then
    v_record_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', '');
    insert into public.auditoria (tabla, registro_id, accion, datos_antes, datos_despues, usuario_id, justificacion)
    values (tg_table_name, v_record_id, tg_op, to_jsonb(old), to_jsonb(new), v_user, v_just);
    return new;
  else
    v_record_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'user_id', '');
    insert into public.auditoria (tabla, registro_id, accion, datos_despues, usuario_id, justificacion)
    values (tg_table_name, v_record_id, tg_op, to_jsonb(new), v_user, v_just);
    return new;
  end if;
end;
$$;

-- Si no hay datos SIC para un mes, no debe aparecer como desviación -100%.
-- Se deja NULL y las alertas lo ignoran.
-- Hay que recrear las vistas porque cambia el tipo de una columna.
drop view if exists public.v_alertas_desviacion;
drop view if exists public.v_cumplimiento_sic;

create view public.v_cumplimiento_sic
with (security_invoker = true) as
select
  v.version_anio as anio,
  v.mes,
  v.profesional_id,
  p.codigo_buk,
  p.nombre_seudonimo,
  v.instituto_id,
  i.nombre as instituto,
  v.atenciones_total_plan as atenciones_planificadas,
  s.atenciones_total as atenciones_sic,
  case
    when s.atenciones_total is not null
      then s.atenciones_total - v.atenciones_total_plan
    else null
  end as diferencia,
  case
    when s.atenciones_total is not null and v.atenciones_total_plan > 0
      then round((s.atenciones_total - v.atenciones_total_plan) / v.atenciones_total_plan, 4)
    else null
  end as desviacion_pct
from public.v_planificacion_vigente v
join public.profesionales p on p.id = v.profesional_id
join public.institutos i on i.id = v.instituto_id
left join public.atenciones_sic s
  on s.profesional_id = v.profesional_id
 and s.instituto_id = v.instituto_id
 and s.anio = v.version_anio
 and s.mes = v.mes;

grant select on public.v_cumplimiento_sic to authenticated, service_role;
revoke all on public.v_cumplimiento_sic from anon;

create view public.v_alertas_desviacion
with (security_invoker = true) as
select *
from public.v_cumplimiento_sic
where desviacion_pct is not null
  and abs(desviacion_pct) > coalesce(public.fn_parametro('umbral_desviacion', current_date), 0.10)
order by abs(desviacion_pct) desc;

grant select on public.v_alertas_desviacion to authenticated, service_role;
revoke all on public.v_alertas_desviacion from anon;
