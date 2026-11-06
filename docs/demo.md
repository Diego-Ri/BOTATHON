# Guion de demo · 5 minutos

## Antes de empezar (checklist)

- [ ] Proyecto Supabase despierto (free tier se pausa por inactividad).
- [ ] `npm run db:seed` ejecutado (42 profesionales, 552 filas de plan).
- [ ] Sesión iniciada como `central@botathon.cl` (o `service_role` para la ingesta).
- [ ] Payload de ejemplo listo (`docs/blue-prism.md`).
- [ ] Pestañas abiertas: SQL Editor, Table Editor, dashboard de vistas.

## 0:00–0:45 · Problema

"Hoy la planificación de Teletón vive en un Excel de 600 profesionales, con fórmulas encadenadas,
sin trazabilidad y con carga manual desde BUK. Cada cambio de jornada o asignación obliga a
rehacer el cálculo. El desafío es convertir ese Excel en un sistema parametrizable y trazable."

## 0:45–1:45 · Ingesta BUK (Blue Prism)

1. Mostrar el archivo Excel simulado de BUK.
2. Blue Prism valida y llama `rpc_ingestar_buk`.
3. En Supabase, mostrar:

```sql
select fuente, archivo_nombre, estado, filas_total, filas_ok, filas_error
from importaciones order by created_at desc limit 5;

select fila, columna, codigo, mensaje, severidad
from importacion_errores order by id desc limit 10;
```

4. Mostrar que un archivo repetido devuelve `duplicada: true` (idempotencia).
5. Mostrar el diff:

```sql
select campo, valor_anterior, valor_nuevo, vigencia_desde
from cambios_dotacion order by id desc limit 10;
```

## 1:45–2:45 · Recálculo y versión

1. Blue Prism (o planificación central) llama:

```sql
select fn_generar_planificacion(2026, 'Demo: cambio de jornada');
```

2. Mostrar la nueva versión:

```sql
select numero_version, estado, notas, created_at
from planificacion_versiones order by numero_version desc;
```

3. Mostrar el efecto en una profesional:

```sql
select anio, mes, codigo_buk, instituto, horas_contratadas_mes, horas_directas,
       atenciones_total_plan, meta_gestion, foja
from v_planificacion_profesional
where codigo_buk = 'PROF-001'
order by mes;
```

## 2:45–3:45 · Dashboards

```sql
-- Nacional por mes
select * from v_planificacion_nacional order by mes;

-- Instituto + área + cargo
select anio, mes, instituto, area, cargo, profesionales,
       atenciones_planificadas, meta_gestion, foja
from v_planificacion_instituto
where mes = 6
order by instituto, area;

-- FOJA por instituto
select * from v_foja_mensual where mes = 6 order by foja desc;
```

Mensaje clave: "La jefatura ve solo su instituto; planificación central ve todo el país".

## 3:45–4:30 · Planificado vs SIC y alertas

```sql
select anio, mes, codigo_buk, instituto, atenciones_planificadas,
       atenciones_sic, desviacion_pct
from v_cumplimiento_sic
where desviacion_pct is not null
order by abs(desviacion_pct) desc
limit 10;

select count(*) as alertas from v_alertas_desviacion;
```

## 4:30–5:00 · Simulación y cierre

```sql
select fn_simular_parametros(2026, '{
  "cargo_homologado_id": "<id de MED>",
  "tramo_id": "<id de GE40>",
  "pct_directo": 0.65,
  "pct_indirecto": 0.15,
  "pct_nas": 0.20
}'::jsonb);
```

Cierre: "La regla se cambia sin tocar código, el impacto se ve antes de aplicarla y todo queda
auditado. Blue Prism automatiza la ingesta; la base de datos garantiza el cálculo y la trazabilidad."

## Frases de respaldo

- **Trazabilidad:** `auditoria` guarda antes/después, usuario y justificación.
- **Multi-instituto:** `dotacion_mensual` tiene una fila por instituto/mes.
- **Reemplazos y vacantes:** campos `es_reemplazo`, `reemplaza_a_id`, `es_vacante`.
- **Cambio legal 44→42 h:** `periodos_planificacion` y horas mensuales.
- **Aysén:** `calendario_mensual.dias_vacaciones` distinto.
- **Datos personales:** solo código BUK y nombre seudónimo; RLS por rol.
