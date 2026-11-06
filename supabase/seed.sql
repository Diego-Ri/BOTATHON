-- =============================================================================
-- Seed de demostración · Botathon 2026
-- Solo para entorno de demo. Limpia datos de negocio y deja catálogos/parámetros.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Limpieza de datos de negocio (no toca catálogos, parámetros ni profiles)
-- -----------------------------------------------------------------------------
truncate table
  public.auditoria,
  public.simulaciones,
  public.planificacion_mensual,
  public.planificacion_versiones,
  public.atenciones_sic,
  public.sic_registros,
  public.aprobaciones,
  public.asignaciones_profesional,
  public.cambios_dotacion,
  public.licencias,
  public.dotacion_mensual,
  public.dotacion_registros,
  public.importacion_errores,
  public.importaciones
restart identity cascade;

delete from public.profesionales;

-- -----------------------------------------------------------------------------
-- Institutos
-- -----------------------------------------------------------------------------
insert into public.institutos (codigo, nombre, region, zona) values
  ('STG', 'Instituto Teletón Santiago', 'Región Metropolitana', 'centro'),
  ('CON', 'Instituto Teletón Concepción', 'Biobío', 'sur'),
  ('VAL', 'Instituto Teletón Valparaíso', 'Valparaíso', 'centro'),
  ('ANT', 'Instituto Teletón Antofagasta', 'Antofagasta', 'norte'),
  ('ARI', 'Instituto Teletón Arica', 'Arica y Parinacota', 'norte'),
  ('TEM', 'Instituto Teletón Temuco', 'La Araucanía', 'sur'),
  ('PDM', 'Instituto Teletón Puerto Montt', 'Los Lagos', 'sur'),
  ('COY', 'Instituto Teletón Coyhaique', 'Aysén', 'austral')
on conflict (codigo) do update
  set nombre = excluded.nombre,
      region = excluded.region,
      zona = excluded.zona,
      activo = true;

-- -----------------------------------------------------------------------------
-- Áreas
-- -----------------------------------------------------------------------------
insert into public.areas (codigo, nombre, atencion_grupal) values
  ('MED', 'Medicina', false),
  ('KIN', 'Kinesiología', false),
  ('TO',  'Terapia Ocupacional', false),
  ('PSI', 'Psicología', false),
  ('FON', 'Fonoaudiología', false),
  ('EDU', 'Educación', true),
  ('ENF', 'Enfermería', false),
  ('ASO', 'Asistente Social', true),
  ('ART', 'Arte', true),
  ('DEP', 'Deporte', true),
  ('LAB', 'Unidad Laboral', true)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      atencion_grupal = excluded.atencion_grupal,
      activo = true;

-- -----------------------------------------------------------------------------
-- Cargos homologados
-- -----------------------------------------------------------------------------
insert into public.cargos_homologados (codigo, nombre) values
  ('MED', 'Médico Fisiatra'),
  ('KIN', 'Kinesiólogo'),
  ('TO',  'Terapeuta Ocupacional'),
  ('PSI', 'Psicólogo'),
  ('FON', 'Fonoaudiólogo'),
  ('EDU', 'Educador'),
  ('ENF', 'Enfermería'),
  ('ASO', 'Asistente Social'),
  ('ART', 'Profesor de Arte'),
  ('DEP', 'Profesor de Deporte'),
  ('LAB', 'Terapeuta Laboral'),
  ('OTRO', 'Otro')
on conflict (codigo) do update
  set nombre = excluded.nombre,
      activo = true;

-- -----------------------------------------------------------------------------
-- Cargos
-- -----------------------------------------------------------------------------
insert into public.cargos (codigo, nombre, area_id, cargo_homologado_id)
select v.codigo, v.nombre, a.id, ch.id
from (values
  ('MED', 'Médico Fisiatra', 'MED', 'MED'),
  ('KIN', 'Kinesiólogo', 'KIN', 'KIN'),
  ('TO',  'Terapeuta Ocupacional', 'TO', 'TO'),
  ('PSI', 'Psicólogo', 'PSI', 'PSI'),
  ('FON', 'Fonoaudiólogo', 'FON', 'FON'),
  ('EDU', 'Educador', 'EDU', 'EDU'),
  ('ENF', 'Enfermero/a', 'ENF', 'ENF'),
  ('ASO', 'Asistente Social', 'ASO', 'ASO'),
  ('ART', 'Profesor de Arte', 'ART', 'ART'),
  ('DEP', 'Profesor de Deporte', 'DEP', 'DEP'),
  ('LAB', 'Terapeuta Laboral', 'LAB', 'LAB')
) as v(codigo, nombre, area, homologado)
join public.areas a on a.codigo = v.area
join public.cargos_homologados ch on ch.codigo = v.homologado
on conflict (codigo) do update
  set nombre = excluded.nombre,
      area_id = excluded.area_id,
      cargo_homologado_id = excluded.cargo_homologado_id,
      activo = true;

-- -----------------------------------------------------------------------------
-- Tramos, contratos y períodos
-- -----------------------------------------------------------------------------
insert into public.tramos_jornada (codigo, nombre, horas_min, horas_max, orden) values
  ('GE40', '40 horas o más', 40, null, 1),
  ('22A40', 'Entre 22 y 40 horas', 22, 40, 2),
  ('LT22', 'Menos de 22 horas', null, 22, 3)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      horas_min = excluded.horas_min,
      horas_max = excluded.horas_max,
      orden = excluded.orden;

insert into public.tipos_contrato (codigo, nombre) values
  ('INDEFINIDO', 'Indefinido'),
  ('PLAZO_FIJO', 'Plazo fijo'),
  ('REEMPLAZO', 'Reemplazo')
on conflict (codigo) do update
  set nombre = excluded.nombre,
      activo = true;

insert into public.periodos_planificacion (anio, nombre, mes_inicio, mes_fin, horas_jornada_legal) values
  (2026, 'Enero-Abril', 1, 4, 44),
  (2026, 'Mayo-Diciembre', 5, 12, 42)
on conflict (anio, nombre) do update
  set mes_inicio = excluded.mes_inicio,
      mes_fin = excluded.mes_fin,
      horas_jornada_legal = excluded.horas_jornada_legal;

-- -----------------------------------------------------------------------------
-- Parámetros de distribución
-- -----------------------------------------------------------------------------
delete from public.param_distribucion;
insert into public.param_distribucion
  (cargo_homologado_id, tramo_id, pct_directo, pct_indirecto, pct_nas, vigencia_desde)
select ch.id, t.id, v.dir, v.ind, v.nas, '2026-01-01'
from public.cargos_homologados ch
join (values
  ('MED', 0.55, 0.20, 0.25),
  ('KIN', 0.70, 0.15, 0.15),
  ('TO',  0.65, 0.15, 0.20),
  ('PSI', 0.60, 0.20, 0.20),
  ('FON', 0.70, 0.15, 0.15),
  ('EDU', 0.65, 0.10, 0.25),
  ('ENF', 0.60, 0.15, 0.25),
  ('ASO', 0.55, 0.15, 0.30),
  ('ART', 0.70, 0.10, 0.20),
  ('DEP', 0.70, 0.10, 0.20),
  ('LAB', 0.60, 0.15, 0.25),
  ('OTRO', 0.60, 0.20, 0.20)
) as v(codigo, dir, ind, nas) on v.codigo = ch.codigo
cross join public.tramos_jornada t;

-- -----------------------------------------------------------------------------
-- Minutos estándar por atención
-- -----------------------------------------------------------------------------
delete from public.param_minutos_atencion;
insert into public.param_minutos_atencion (cargo_id, tipo_atencion, minutos, vigencia_desde)
select c.id, 'directa', v.minutos, '2026-01-01'
from public.cargos c
join (values
  ('MED', 30),
  ('KIN', 45),
  ('TO',  45),
  ('PSI', 60),
  ('FON', 45),
  ('EDU', 60),
  ('ENF', 30),
  ('ASO', 60),
  ('ART', 60),
  ('DEP', 60),
  ('LAB', 60)
) as v(codigo, minutos) on v.codigo = c.codigo;

insert into public.param_minutos_atencion (cargo_id, tipo_atencion, minutos, vigencia_desde)
select c.id, 'indirecta', 30, '2026-01-01'
from public.cargos c;

-- -----------------------------------------------------------------------------
-- Atención grupal
-- -----------------------------------------------------------------------------
delete from public.param_atencion_grupal;
insert into public.param_atencion_grupal
  (area_id, instituto_id, pct_grupal, pacientes_por_grupo, vigencia_desde)
select a.id, null, 0.50, 8, '2026-01-01'
from public.areas a
where a.atencion_grupal;

insert into public.param_atencion_grupal
  (area_id, instituto_id, pct_grupal, pacientes_por_grupo, vigencia_desde)
select a.id, i.id, 0.50, 10, '2026-01-01'
from public.areas a
cross join public.institutos i
where a.atencion_grupal
  and i.codigo in ('STG', 'CON');

-- -----------------------------------------------------------------------------
-- Catálogo de asignaciones especiales
-- -----------------------------------------------------------------------------
insert into public.asignaciones_catalogo
  (codigo, nombre, horas_semanales, requiere_autorizacion) values
  ('LIDER', 'Líder de equipo', 2, false),
  ('TUTOR', 'Tutor docente', 1, true),
  ('COMITE', 'Comité paritario', 0.5, false),
  ('SINDICATO', 'Reunión sindical', 0.25, false),
  ('COORD', 'Coordinador clínico', 3, true),
  ('DOCENCIA', 'Docencia', 2, true),
  ('INVEST', 'Investigación', 2, true)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      horas_semanales = excluded.horas_semanales,
      requiere_autorizacion = excluded.requiere_autorizacion,
      activo = true;

-- -----------------------------------------------------------------------------
-- Parámetros del sistema
-- -----------------------------------------------------------------------------
delete from public.parametros_sistema;
insert into public.parametros_sistema (clave, valor, descripcion, vigencia_desde) values
  ('meta_gestion', '0.90'::jsonb, 'Piso mínimo de cumplimiento de la proyección anual', '2026-01-01'),
  ('max_asignaciones', '2'::jsonb, 'Máximo de asignaciones activas para profesionales sobre el umbral', '2026-01-01'),
  ('umbral_horas_max_asignaciones', '30'::jsonb, 'Sobre esta jornada semanal aplica el máximo de asignaciones', '2026-01-01'),
  ('umbral_desviacion', '0.10'::jsonb, 'Desviación planificado vs SIC para generar alerta', '2026-01-01');

-- -----------------------------------------------------------------------------
-- Feriados 2026
-- -----------------------------------------------------------------------------
delete from public.feriados where fecha >= '2026-01-01' and fecha < '2027-01-01';
insert into public.feriados (fecha, nombre, region, es_regional) values
  ('2026-01-01', 'Año Nuevo', null, false),
  ('2026-04-03', 'Viernes Santo', null, false),
  ('2026-04-04', 'Sábado Santo', null, false),
  ('2026-05-01', 'Día Nacional del Trabajo', null, false),
  ('2026-05-21', 'Día de las Glorias Navales', null, false),
  ('2026-06-07', 'Asalto y Toma del Morro', 'Arica y Parinacota', true),
  ('2026-06-20', 'Día Nacional de los Pueblos Indígenas', null, false),
  ('2026-06-29', 'San Pedro y San Pablo', null, false),
  ('2026-07-16', 'Virgen del Carmen', null, false),
  ('2026-08-15', 'Asunción de la Virgen', null, false),
  ('2026-08-20', 'Natalicio de Bernardo O''Higgins', 'Ñuble', true),
  ('2026-09-18', 'Independencia Nacional', null, false),
  ('2026-09-19', 'Glorias del Ejército', null, false),
  ('2026-10-12', 'Encuentro de Dos Mundos', null, false),
  ('2026-10-31', 'Día de las Iglesias Evangélicas', null, false),
  ('2026-11-01', 'Todos los Santos', null, false),
  ('2026-12-08', 'Inmaculada Concepción', null, false),
  ('2026-12-25', 'Navidad', null, false);

-- -----------------------------------------------------------------------------
-- Calendario mensual 2026
-- Calcula días hábiles descontando fines de semana y feriados nacionales/regionales.
-- -----------------------------------------------------------------------------
delete from public.calendario_mensual where anio = 2026;
insert into public.calendario_mensual
  (instituto_id, anio, mes, dias_habiles, dias_inhabiles, dias_vacaciones)
select
  i.id,
  2026,
  m.mes,
  (
    select count(*)
    from generate_series(
      make_date(2026, m.mes, 1),
      (make_date(2026, m.mes, 1) + interval '1 month - 1 day')::date,
      interval '1 day'
    ) d
    where extract(isodow from d) < 6
      and not exists (
        select 1
        from public.feriados f
        where f.fecha = d::date
          and (
            f.instituto_id = i.id
            or (f.instituto_id is null and (f.region is null or f.region = i.region))
          )
      )
  )::numeric,
  (
    select count(*)
    from generate_series(
      make_date(2026, m.mes, 1),
      (make_date(2026, m.mes, 1) + interval '1 month - 1 day')::date,
      interval '1 day'
    ) d
    where extract(isodow from d) >= 6
  )::numeric,
  0
from public.institutos i
cross join generate_series(1, 12) as m(mes);

-- Aysén tiene vacaciones en meses distintos al resto (ejemplo del desafío).
update public.calendario_mensual
set dias_vacaciones = 5
where instituto_id = (select id from public.institutos where codigo = 'COY')
  and mes in (2, 7, 9);

-- -----------------------------------------------------------------------------
-- Profesionales demo
-- -----------------------------------------------------------------------------
insert into public.profesionales (codigo_buk, nombre_seudonimo)
select 'PROF-' || lpad(n::text, 3, '0'), 'Profesional Demo ' || lpad(n::text, 3, '0')
from generate_series(1, 40) as n
on conflict (codigo_buk) do update
  set nombre_seudonimo = excluded.nombre_seudonimo;

insert into public.profesionales (codigo_buk, nombre_seudonimo, metadata) values
  ('VAC-001', 'Vacante Kinesiología STG', '{"es_vacante": true}'::jsonb),
  ('VAC-002', 'Vacante Terapia Ocupacional CON', '{"es_vacante": true}'::jsonb)
on conflict (codigo_buk) do update
  set nombre_seudonimo = excluded.nombre_seudonimo,
      metadata = excluded.metadata;

-- -----------------------------------------------------------------------------
-- Dotación mensual 2026
-- 44 h hasta abril, 42 h desde mayo para jornadas completas.
-- -----------------------------------------------------------------------------
with base as (
  select
    'PROF-' || lpad(n::text, 3, '0') as codigo,
    (array['STG','CON','VAL','ANT','ARI','TEM','PDM','COY'])[1 + ((n - 1) % 8)] as inst_codigo,
    (array['MED','KIN','TO','PSI','FON','EDU','ENF','ASO','ART','DEP','LAB'])[1 + ((n - 1) % 11)] as cargo_codigo,
    case when n % 5 = 0 then 22 when n % 4 = 0 then 30 else 44 end as horas_base,
    case when n % 7 = 0 then 'PLAZO_FIJO' else 'INDEFINIDO' end as tipo_codigo,
    make_date(2026, 1 + (n % 3), 1) as fecha_inicio
  from generate_series(1, 40) as n
)
insert into public.dotacion_mensual
  (profesional_id, instituto_id, anio, mes, cargo_id, tipo_contrato_id,
   horas_semanales, fecha_inicio, fecha_termino, es_reemplazo, es_vacante, incluir_en_planificacion)
select
  p.id,
  i.id,
  2026,
  m.mes,
  c.id,
  tc.id,
  case when m.mes <= 4 then b.horas_base else least(b.horas_base, 42) end,
  b.fecha_inicio,
  null,
  false,
  false,
  true
from base b
join public.profesionales p on p.codigo_buk = b.codigo
join public.institutos i on i.codigo = b.inst_codigo
join public.cargos c on c.codigo = b.cargo_codigo
left join public.tipos_contrato tc on tc.codigo = b.tipo_codigo
cross join generate_series(1, 12) as m(mes)
on conflict (profesional_id, instituto_id, anio, mes) do nothing;

-- Vacantes planificadas
insert into public.dotacion_mensual
  (profesional_id, instituto_id, anio, mes, cargo_id, tipo_contrato_id,
   horas_semanales, fecha_inicio, fecha_termino, es_reemplazo, es_vacante, incluir_en_planificacion)
select
  p.id,
  i.id,
  2026,
  m.mes,
  c.id,
  tc.id,
  case when m.mes <= 4 then 44 else 42 end,
  '2026-01-01',
  null,
  false,
  true,
  true
from public.profesionales p
join public.institutos i
  on i.codigo = case when p.codigo_buk = 'VAC-001' then 'STG' else 'CON' end
join public.cargos c
  on c.codigo = case when p.codigo_buk = 'VAC-001' then 'KIN' else 'TO' end
left join public.tipos_contrato tc on tc.codigo = 'INDEFINIDO'
cross join generate_series(1, 12) as m(mes)
where p.codigo_buk in ('VAC-001', 'VAC-002')
on conflict (profesional_id, instituto_id, anio, mes) do nothing;

-- -----------------------------------------------------------------------------
-- Multi-instituto: 5 profesionales reparten 50/50 entre dos institutos
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from public.dotacion_mensual d
    join public.profesionales p on p.id = d.profesional_id
    where p.codigo_buk in ('PROF-001','PROF-002','PROF-003','PROF-004','PROF-005')
      and d.anio = 2026
    group by d.profesional_id, d.mes
    having count(*) > 1
  ) then
    update public.dotacion_mensual d
    set horas_semanales = d.horas_semanales / 2
    where d.profesional_id in (
      select id from public.profesionales
      where codigo_buk in ('PROF-001','PROF-002','PROF-003','PROF-004','PROF-005')
    );

    insert into public.dotacion_mensual
      (profesional_id, instituto_id, anio, mes, cargo_id, tipo_contrato_id,
       horas_semanales, fecha_inicio, fecha_termino, es_reemplazo, es_vacante, incluir_en_planificacion)
    select
      d.profesional_id,
      case
        when d.instituto_id = (select id from public.institutos where codigo = 'CON')
          then (select id from public.institutos where codigo = 'STG')
        else (select id from public.institutos where codigo = 'CON')
      end,
      d.anio,
      d.mes,
      d.cargo_id,
      d.tipo_contrato_id,
      d.horas_semanales,
      d.fecha_inicio,
      d.fecha_termino,
      d.es_reemplazo,
      d.es_vacante,
      d.incluir_en_planificacion
    from public.dotacion_mensual d
    join public.profesionales p on p.id = d.profesional_id
    where p.codigo_buk in ('PROF-001','PROF-002','PROF-003','PROF-004','PROF-005')
      and d.anio = 2026
    on conflict (profesional_id, instituto_id, anio, mes) do nothing;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Reemplazos: vigencia marzo-agosto
-- -----------------------------------------------------------------------------
update public.dotacion_mensual d
set es_reemplazo = true,
    reemplaza_a_id = (select id from public.profesionales where codigo_buk = 'PROF-012'),
    fecha_inicio = '2026-03-01',
    fecha_termino = '2026-08-31'
where d.profesional_id = (select id from public.profesionales where codigo_buk = 'PROF-010');

delete from public.dotacion_mensual d
where d.profesional_id = (select id from public.profesionales where codigo_buk = 'PROF-010')
  and d.mes not between 3 and 8;

update public.dotacion_mensual d
set es_reemplazo = true,
    reemplaza_a_id = (select id from public.profesionales where codigo_buk = 'PROF-013'),
    fecha_inicio = '2026-03-01',
    fecha_termino = '2026-08-31'
where d.profesional_id = (select id from public.profesionales where codigo_buk = 'PROF-011');

delete from public.dotacion_mensual d
where d.profesional_id = (select id from public.profesionales where codigo_buk = 'PROF-011')
  and d.mes not between 3 and 8;

-- -----------------------------------------------------------------------------
-- Licencias
-- -----------------------------------------------------------------------------
insert into public.licencias (profesional_id, tipo, fecha_desde, fecha_hasta)
select p.id, 'licencia_medica', '2026-06-01', '2026-06-30'
from public.profesionales p
where p.codigo_buk = 'PROF-014'
  and not exists (
    select 1 from public.licencias l
    where l.profesional_id = p.id and l.fecha_desde = '2026-06-01'
  );

insert into public.licencias (profesional_id, tipo, fecha_desde, fecha_hasta)
select p.id, 'licencia_medica', '2026-09-01', '2026-09-15'
from public.profesionales p
where p.codigo_buk = 'PROF-015'
  and not exists (
    select 1 from public.licencias l
    where l.profesional_id = p.id and l.fecha_desde = '2026-09-01'
  );

-- -----------------------------------------------------------------------------
-- Asignaciones especiales
-- -----------------------------------------------------------------------------
insert into public.asignaciones_profesional
  (profesional_id, asignacion_id, horas_semanales, vigencia_desde, estado, justificacion)
select p.id, a.id, a.horas_semanales, '2026-01-01', 'aprobada', 'Asignación demo'
from (values
  ('PROF-016', 'LIDER'),
  ('PROF-017', 'TUTOR'),
  ('PROF-017', 'COMITE'),
  ('PROF-018', 'COMITE'),
  ('PROF-019', 'SINDICATO'),
  ('PROF-020', 'COORD'),
  ('PROF-021', 'DOCENCIA'),
  ('PROF-022', 'INVEST'),
  ('PROF-023', 'LIDER'),
  ('PROF-023', 'TUTOR'),
  ('PROF-024', 'COMITE'),
  ('PROF-024', 'SINDICATO'),
  ('PROF-025', 'LIDER')
) as v(codigo, asignacion)
join public.profesionales p on p.codigo_buk = v.codigo
join public.asignaciones_catalogo a on a.codigo = v.asignacion
where not exists (
  select 1
  from public.asignaciones_profesional x
  where x.profesional_id = p.id
    and x.asignacion_id = a.id
    and x.vigencia_desde = '2026-01-01'
);

insert into public.aprobaciones (asignacion_id, estado, comentario)
select a.id, 'aprobada', 'Aprobación demo'
from public.asignaciones_profesional a
join public.asignaciones_catalogo c on c.id = a.asignacion_id
where c.requiere_autorizacion
  and not exists (
    select 1 from public.aprobaciones x where x.asignacion_id = a.id
  );

-- -----------------------------------------------------------------------------
-- Generación de planificación demo
-- -----------------------------------------------------------------------------
do $$
declare
  v_version uuid;
begin
  if not exists (select 1 from public.planificacion_versiones where anio = 2026) then
    perform public.fn_generar_planificacion(2026, 'Plan demo inicial');
  end if;

  select id into v_version
  from public.planificacion_versiones
  where anio = 2026
  order by numero_version desc
  limit 1;

  -- SIC simulado para enero-junio, con desviaciones controladas.
  insert into public.atenciones_sic
    (profesional_id, instituto_id, anio, mes, atenciones_directas, atenciones_indirectas)
  select
    pm.profesional_id,
    pm.instituto_id,
    pm.anio,
    pm.mes,
    round(pm.atenciones_directas_plan * (0.85 + 0.10 * (pm.mes % 4))),
    round(pm.atenciones_indirectas_plan * (0.85 + 0.10 * (pm.mes % 4)))
  from public.planificacion_mensual pm
  where pm.version_id = v_version
    and pm.mes <= 6
  on conflict (profesional_id, instituto_id, anio, mes) do update
    set atenciones_directas = excluded.atenciones_directas,
        atenciones_indirectas = excluded.atenciones_indirectas,
        updated_at = now();
end $$;

commit;
