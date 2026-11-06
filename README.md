# Botathon 2026 · "Cada hora cuenta"

Base de datos y capa de cálculo para el desafío de planificación asistencial de Teletón.
Implementada sobre **Supabase (PostgreSQL 17)**: esquema versionado con migraciones, RLS por rol,
ingesta idempotente de reportes BUK/SIC, cálculo parametrizable y vistas para dashboards.

- **Proyecto Supabase:** `wnihdcgjxazqupcdfvzj` (`us-east-2`)
- **Repositorio:** `Diego-Ri/BOTATHON`
- **Datos:** ficticios y anonimizados; no hay nombres ni RUT reales.

## Arquitectura

```
Blue Prism (lee y valida Excel BUK / SIC)
        │  POST /rest/v1/rpc/rpc_ingestar_buk | rpc_ingestar_sic
        ▼
Supabase Postgres
  ├── Capa cruda JSONB (dotacion_registros, sic_registros)
  ├── Dotación normalizada (dotacion_mensual, licencias, cambios_dotacion)
  ├── Parámetros editables con vigencia
  ├── fn_generar_planificacion()  →  planificacion_mensual
  └── Vistas v_planificacion_* / v_cumplimiento_sic
        ▼
Dashboards (nacional · instituto · área · cargo · mes)
```

## Estructura

```
supabase/
  migrations/        # 6 migraciones de dominio + 2 de ajustes
  seed.sql           # 42 profesionales, 8 institutos, parámetros y plan demo
  config.toml
  .gitignore
scripts/
  smoke-test.sh      # prueba de humo remota (solo lectura)
  create_demo_users.py
.github/workflows/
  supabase.yml       # db push automático en main
docs/
  modelo-datos.md    # ERD, diccionario y supuestos de cálculo
  blue-prism.md      # contrato de ingesta para Blue Prism
  demo.md            # guion de demo de 5 minutos
.env.example
```

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables locales (ya existe .env.local en este entorno)
cp .env.example .env.local   # si partes de cero
# completar SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF y claves

# 3. Login del CLI (una vez)
npx supabase login

# 4. Vincular y aplicar migraciones
npx supabase link --project-ref wnihdcgjxazqupcdfvzj
npm run db:push

# 5. Cargar datos de demo
npm run db:seed

# 6. Prueba de humo
npm run test:smoke
```

> El CLI 3.x puede aplicar migraciones en remoto con el access token, sin password de base.
> Para desarrollo local (`supabase start`) sí se necesita Docker.

## Usuarios demo

| Email | Rol | Alcance |
|---|---|---|
| `central@botathon.cl` | `planificacion_central` | Todo el país; parámetros, ingesta, cálculo |
| `jefatura@botathon.cl` | `jefatura_instituto` | Solo Instituto Santiago |
| `profesional@botathon.cl` | `profesional_lectura` | Solo sus propias filas |

La contraseña está en `.env.local` (`DEMO_USER_PASSWORD`). No se commitea.

## Qué incluye

- **Catálogos:** institutos, áreas, cargos, cargos homologados, tramos, tipos de contrato, períodos.
- **Parámetros editables con vigencia:** distribución directo/indirecto/NAS, minutos por atención,
  atención grupal, asignaciones especiales, feriados, calendario y parámetros globales.
- **Dotación BUK:** importaciones con hash idempotente, errores por fila, registros crudos JSONB,
  dotación mensual multi-instituto, licencias, reemplazos, vacantes y diff de cambios.
- **Asignaciones:** catálogo, asignaciones por profesional, aprobaciones y regla de máximo 2
  para jornadas sobre 30 h.
- **SIC:** ingesta de atenciones realizadas y comparación planificado vs ejecutado.
- **Cálculo:** `fn_generar_planificacion(anio)` versiona el plan y calcula por profesional/mes
  horas contratadas, distribución, asignaciones, horas disponibles, atenciones, Meta de Gestión
  (90 %) y FOJA.
- **Simulación:** `fn_simular_parametros(anio, cambios)` calcula el impacto de cambiar una regla.
- **Dashboards:** vistas nacional, instituto, profesional, cumplimiento SIC, alertas y FOJA.
- **Seguridad:** RLS por rol/instituto/profesional, auditoría por trigger y funciones
  `security definer` con `search_path` fijo.
- **Trazabilidad:** `planificacion_versiones`, `cambios_dotacion`, `auditoria`, `aprobaciones`.

## Reglas de cálculo (v1)

1. Horas contratadas del mes = horas semanales × días efectivos / 5.
   Días efectivos = días hábiles − vacaciones − licencias.
2. Promedio anual ponderado por días hábiles para determinar el tramo de jornada.
3. Distribución directo/indirecto/NAS según cargo homologado + tramo.
4. Se descuentan las asignaciones especiales aprobadas, prorrateadas por instituto.
5. Atenciones directas = `floor(horas directas × 60 / minutos estándar)`, con ajuste grupal.
6. Atenciones indirectas = `floor(horas indirectas × 60 / 30)`.
7. Meta de Gestión = atenciones planificadas × 90 % (parámetro).
8. FOJA = horas directas disponibles / horas contratadas.

> **Pendiente de calibración:** las fórmulas exactas del Excel (`Nac - Planificación Asistencial x mes`)
> deben contrastarse cuando el kit de datos esté disponible. Todos los insumos y supuestos quedan
> guardados en `planificacion_mensual.detalle` para ajustar sin perder trazabilidad.

## GitHub Actions

El workflow `.github/workflows/supabase.yml` aplica migraciones en cada push a `main`.
Configura estos secrets en el repositorio:

| Secret | Uso |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | CLI / Management API |
| `SUPABASE_PROJECT_REF` | `wnihdcgjxazqupcdfvzj` |
| `SUPABASE_URL` | Smoke test |
| `SUPABASE_SERVICE_ROLE_KEY` | Smoke test (solo CI) |

El `service_role` **nunca** debe exponerse en el frontend ni commitearse.

## Seguridad y datos personales

- RLS activo en todas las tablas de negocio.
- La capa cruda guarda JSONB, pero el modelo normalizado solo conserva el código BUK y un nombre
  seudónimo; no se almacenan RUT ni datos clínicos identificables.
- `auditoria` registra quién cambió qué, cuándo y con qué justificación (`app.justificacion`).
- La ingesta exige `service_role` o un usuario de planificación central.

## Documentación

- [Modelo de datos](docs/modelo-datos.md)
- [Integración Blue Prism](docs/blue-prism.md)
- [Guion de demo](docs/demo.md)
