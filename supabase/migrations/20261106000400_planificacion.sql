-- =============================================================================
-- 04 · Planificación y métricas
-- =============================================================================

create table if not exists public.planificacion_versiones (
  id              uuid primary key default gen_random_uuid(),
  anio            int not null,
  numero_version  int not null,
  estado          text not null default 'borrador'
                  check (estado in ('borrador', 'aprobada', 'reemplazada')),
  motor_version   text not null default 'v1',
  creado_por      uuid references auth.users(id),
  aprobado_por    uuid references auth.users(id),
  aprobado_en     timestamptz,
  notas           text,
  created_at      timestamptz not null default now(),
  unique (anio, numero_version)
);

create table if not exists public.planificacion_mensual (
  id                          uuid primary key default gen_random_uuid(),
  version_id                  uuid not null references public.planificacion_versiones(id) on delete cascade,
  profesional_id              uuid not null references public.profesionales(id),
  instituto_id                uuid not null references public.institutos(id),
  anio                        int not null,
  mes                         int not null check (mes between 1 and 12),
  cargo_id                    uuid references public.cargos(id),
  tramo_id                    uuid references public.tramos_jornada(id),
  horas_contratadas_mes       numeric(8,2) not null default 0,
  horas_promedio_anual        numeric(8,2),
  pct_directo                 numeric(5,4),
  pct_indirecto               numeric(5,4),
  pct_nas                     numeric(5,4),
  horas_asignaciones          numeric(8,2) not null default 0,
  horas_disponibles           numeric(8,2) not null default 0,
  horas_directas              numeric(8,2) not null default 0,
  horas_indirectas            numeric(8,2) not null default 0,
  horas_nas                   numeric(8,2) not null default 0,
  atenciones_directas_plan    numeric(10,2) not null default 0,
  atenciones_grupales_plan    numeric(10,2) not null default 0,
  atenciones_indirectas_plan  numeric(10,2) not null default 0,
  atenciones_total_plan       numeric(10,2) not null default 0,
  meta_gestion                numeric(10,2) not null default 0,
  foja                        numeric(6,4) not null default 0,
  detalle                     jsonb not null default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  unique (version_id, profesional_id, instituto_id, anio, mes)
);

create table if not exists public.simulaciones (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid references auth.users(id),
  anio              int not null,
  parametros_cambio jsonb not null,
  resultado         jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index if not exists idx_planificacion_version
  on public.planificacion_mensual(version_id);
create index if not exists idx_planificacion_periodo
  on public.planificacion_mensual(anio, mes);
create index if not exists idx_planificacion_inst
  on public.planificacion_mensual(instituto_id, anio, mes);
create index if not exists idx_planificacion_prof
  on public.planificacion_mensual(profesional_id, anio, mes);
create index if not exists idx_planificacion_detalle
  on public.planificacion_mensual using gin(detalle);
create index if not exists idx_simulaciones_anio
  on public.simulaciones(anio);

-- -----------------------------------------------------------------------------
-- Comentarios
-- -----------------------------------------------------------------------------
comment on table public.planificacion_versiones is 'Versión de cálculo por año. Permite comparar y aprobar planes sin perder historia.';
comment on table public.planificacion_mensual is 'Resultado del cálculo por profesional, instituto y mes. detalle guarda los insumos y supuestos usados.';
comment on table public.simulaciones is 'Snapshot de una simulación de parámetros y su resultado agregado.';
