# MasterValidationSec · Panel de metas asistenciales

Frontend en **React + TypeScript + Vite** para gestionar metas mensuales, horas
directas/indirectas/NAS, KPIs de gestión, consolidado jerárquico y exportación
de reportes. Se entrega con datos demo deterministas y una capa de datos ya
separada para conectar el backend sin reescribir las vistas.

> Estado: frontend funcional. No incluye autenticación real ni base de datos.
> El corte de la demo es **octubre de 2026**.

## 1. Arranque

```bash
cd panel-metas-gestion
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de producción
npm test           # pruebas de motor, filtros, conciliación y exportadores
```

Requisitos: Node 22+ y npm 9+.

La sesión demo se guarda en `localStorage`; no se solicita contraseña. Para
volver a empezar, cierra sesión desde el menú del usuario o borra el
almacenamiento del navegador.

## 2. Propuesta funcional: roles, usuarios y vistas

### 2.1 Roles: 4

| Rol | Alcance de datos | Puede ver | Puede exportar |
| --- | --- | --- | --- |
| Profesional asistencial | Solo su ficha | Inicio, Mi meta, KPIs, Planificado | No |
| Jefatura de área | Su área completa | Todo excepto Configuración | Sí |
| Dirección de instituto | Todas las áreas de su instituto | Todo excepto Configuración | Sí |
| Dirección nacional | Nacional, los 3 institutos | Todo, incluida Configuración | Sí |

El alcance no es solo visual: `alcanceDeUsuario` lo convierte en un `Scope` y el
repositorio lo aplica a cada consulta. En producción el backend debe repetir la
validación desde la sesión.

### 2.2 Usuarios demo: 5

| Usuario | Rol | Alcance demo |
| --- | --- | --- |
| Camila Rojas Pérez | Profesional (Kinesiología) | INR · Rehabilitación Física |
| Matías Fuentes Silva | Profesional (Enfermería) | INT · Medicina Respiratoria |
| Paula Herrera Díaz | Jefatura de área | INR · Rehabilitación Física |
| Andrés Salinas Montoya | Dirección de instituto | INR completo |
| Valentina Soto Mena | Dirección nacional | 3 institutos, 9 áreas, 72 profesionales |

**Dimensionamiento de producción:** 86 cuentas estimadas = 72 profesionales
(1 por ficha) + 9 jefaturas de área + 3 direcciones de instituto + 2 cuentas
nacionales (dirección y analista). Si se agregan reemplazos o analistas por
instituto, el número crece sin cambiar los roles ni las vistas.

### 2.3 Vistas: 8 (7 de gestión + login)

| # | Vista | Ruta | Contenido principal | Roles |
| --- | --- | --- | --- | --- |
| 1 | Login / selector demo | `/login` | 5 perfiles para probar todos los alcances | Sin sesión |
| 2 | Inicio | `/` | KPIs, serie mensual, alertas, horas y ranking | Todos |
| 3 | Mi meta del mes | `/mi-meta` | Meta mensual, atenciones y desglose de horas | Todos¹ |
| 4 | KPIs de gestión | `/kpis` | Meta de gestión 90%, FOJA, fórmulas y conciliación | Todos |
| 5 | Consolidado | `/consolidado` | Drill-down instituto → área → profesional | Jefaturas+ |
| 6 | Planificado vs SIC | `/planificado` | Serie mensual, semáforo, umbral y alertas | Todos |
| 7 | Reportes | `/reportes` | Vista previa y exportación PDF/Excel | Jefaturas+ |
| 8 | Configuración | `/configuracion` | Parámetros, matriz de roles y contrato backend | Dirección nacional |

¹ Un profesional ve directamente su ficha; jefaturas y direcciones ven una
lista de profesionales del alcance y abren una ficha en un clic. La etiqueta del
menú cambia a “Meta por profesional”.

Además existen estados de **403** (vista no permitida) y **404**.

## 3. Criterios de aceptación y dónde se cumplen

| Criterio | Implementación |
| --- | --- |
| **Filtros jerárquicos** combinables (nacional, instituto, área, cargo, mes, profesional) y estado en la URL | `FilterBar` + `FiltersProvider`. La URL guarda `instituto`, `area`, `cargo`, `mes` y `profesional`; se normaliza la jerarquía y se aplica el alcance del rol. Enlaces compartibles y navegación atrás funcionan. |
| **Mi meta del mes** con atenciones objetivo y desglose de horas directas, indirectas y NAS | `/mi-meta`: hero con meta/realizadas, anillo de cumplimiento, dona de horas, fórmulas con sustitución numérica y serie individual. |
| **KPIs de gestión**: Meta de Gestión del 90% y % FOJA con fórmula visible | `/kpis`: tarjetas + dos `FormulaCard` con fórmula y cálculo (`realizadas ÷ objetivo × 100`, `(directas + indirectas) ÷ contratadas × 100`). |
| **Valores cuadran con el motor** | Los porcentajes se recalculan siempre sobre los totales (`calc.ts`); nunca se promedian. `TrazabilidadCard` verifica la conciliación de horas y el pie de tabla muestra la fórmula con los totales. |
| **Consolidado nacional con drill-down** por instituto, área y profesional | `/consolidado`: tabla por nivel, breadcrumb, `Nivel 1/2/3 de 3`, totales recalculados, badge “Totales conciliados” y acciones “Ver áreas” → “Ver profesionales” → “Abrir ficha” (3 clics). |
| **Planificado vs SIC** mensual, semáforo y umbral parametrizable | `/planificado`: gráfico de barras+línea, tabla mensual, alertas por profesional, control de umbral para dirección nacional (1–50%) y persistencia local. |
| **Exportación filtrada** a PDF/Excel para jefaturas | `ExportButton` en cada vista + centro `/reportes`. Ambos formatos incluyen filtros activos, parámetros, fecha, usuario y las mismas cifras del motor. El acceso está restringido a jefaturas+. |

## 4. Fórmulas, datos y supuestos

Datos demo: **3 institutos, 9 áreas, 72 profesionales, 10 meses (ene–oct 2026)
y 720 registros mensuales**. Son deterministas, por lo que las capturas y las
pruebas siempre muestran los mismos valores.

Definiciones implementadas en `src/domain/calc.ts`:

```text
Meta de gestión % = Atenciones realizadas ÷ Atenciones objetivo × 100
% FOJA            = (Horas directas + Horas indirectas) ÷ Horas contratadas × 100
Desviación SIC %  = (SIC − Planificado) ÷ Planificado × 100
Horas contratadas = Horas directas + Horas indirectas + Horas NAS
```

- **Horas directas:** atención directa al usuario.
- **Horas indirectas:** actividades clínicas indirectas (registro, coordinación).
- **NAS:** tiempo no asistencial.
- **SIC:** registro de producción efectivamente informado en el sistema SIC.
- **Umbral de desviación:** por defecto **10%**. Verde hasta la mitad del umbral
  (5%), ámbar hasta el umbral (10%) y rojo sobre el umbral (>10%).
- La meta de gestión y el objetivo FOJA parten en **90%** y son parametrizables.

> Supuesto explícito: FOJA se calcula como horas directas + indirectas sobre
> horas contratadas. Si el motor oficial usa otra definición, basta cambiarla en
> `calc.ts` y en sus pruebas; la UI y los reportes la toman de ahí.

## 5. Filtros y URL

Ejemplos:

```text
/consolidado
/consolidado?instituto=inst-inr
/consolidado?instituto=inst-inr&area=area-inr-fisica
/consolidado?instituto=inst-inr&area=area-inr-fisica&cargo=kinesiologia&mes=2026-10&profesional=prof-001
```

- Los filtros se **normalizan**: el filtro más específico manda
  (`profesional > área > instituto`).
- El mes inválido cae al último mes cerrado (`2026-10`).
- El alcance del rol pisa cualquier intento de salir de él (por ejemplo, un
  director que edita `instituto` en la URL vuelve a su instituto).
- Los filtros bloqueados por rol se muestran con candado y ayuda contextual.
- “Copiar enlace” permite compartir exactamente la vista filtrada.

## 6. Arquitectura

```text
src/
  app/            Router, error boundary, 404
  components/
    charts/       Recharts: tendencia, horas, comparativo, ranking
    data/         PageHeader, KpiCard, FormulaCard, TrazabilidadCard
    export/       Modal de exportación reutilizable
    filters/      Contexto de filtros + barra jerárquica
    layout/       Shell, sidebar, topbar, navegación por rol
    ui/           Botones, cards, badge, campos, modal, feedback, semáforo
  data/
    seed.ts       Catálogo y 720 registros demo deterministas
    repository.ts DataRepository + MockRepository + HttpRepository
    queries.ts    Hooks de React Query (caché y estados)
  domain/
    types.ts      Tipos compartidos con el futuro backend
    calc.ts       Motor puro de cálculo
    selectors.ts  Agregaciones por nivel y alertas
    permissions.ts Matriz rol ↔ vista
    scope.ts      Alcance no negociable por usuario
  features/       Una carpeta por vista de negocio
  lib/
    filters.ts    Parseo, jerarquía, alcance, resumen de filtros
    export/       Modelo de reporte, PDF (jsPDF), Excel (ExcelJS), historial
    format.ts     Formatos es-CL
  store/          Sesión y configuración con Zustand + persist
```

Flujo de datos:

```text
URL → parse/normalizar → aplicar alcance → useMetas(filtros, scope)
    → DataRepository → registros crudos → calc/selectors → UI
                                                   └→ mismo modelo de reporte → PDF/Excel
```

Decisiones de diseño relevantes:

- **Una sola fuente de verdad numérica**: `calc.ts`/`selectors.ts`. La UI y los
  exportadores no hacen cálculos propios.
- **Agregar antes de calcular**: los porcentajes del consolidado se recalculan
  sobre la suma de registros; no se promedian porcentajes.
- **Filtros en la URL**: vistas compartibles, recargables y compatibles con el
  botón atrás.
- **Código de exportación bajo demanda**: jsPDF y ExcelJS se importan al generar
  el archivo, no en la carga inicial.
- **React Query** para caché, reintentos y estados de carga/error.
- **Zustand + persist** para sesión y parámetros mientras no exista backend.
- **Accesibilidad**: navegación semántica, foco visible, labels, `aria-live`,
  tablas con `caption`, semáforo con texto e icono (no solo color), modal con
  foco atrapado y cierre con Escape.
- **Responsive**: sidebar como drawer, filtros y tarjetas apiladas, tablas con
  scroll horizontal controlado.

## 7. Preparado para conectar el backend

El contrato está en [`docs/backend-contract.md`](docs/backend-contract.md).

Puntos de integración:

1. Copiar `.env.example` a `.env.local`.
2. Implementar los endpoints con los tipos de `src/domain/types.ts`.
3. Cambiar `VITE_REPOSITORIO=http` y `VITE_API_URL`. `HttpRepository` ya usa
   `fetch` con credenciales y transforma los filtros a query string.
4. Reemplazar la sesión demo por OIDC/SSO manteniendo `useUsuarioActual`.
5. Persistir `Configuracion` en `GET/PUT /api/configuracion` con auditoría.

Seguridad: la UI oculta filtros y vistas, pero el backend **debe** derivar el
`Scope` desde la sesión y devolver `403` si el usuario intenta consultar fuera
de su alcance. El cliente nunca debe ser la autoridad.

## 8. Pruebas

```bash
npm test
```

Cubren:

- fórmulas, límites del semáforo, división por cero y conciliación de horas;
- parseo/serialización de filtros, jerarquía y aplicación del alcance;
- tamaño y determinismo del seed;
- conciliación de totales en los tres niveles del consolidado;
- filtros y filas de los reportes;
- generación real de archivos PDF y XLSX no vacíos.

> En sistemas de archivos montados desde Windows/WSL, la prueba de Excel puede
> tardar cerca de un minuto por la carga de ExcelJS. En un disco nativo es
> considerablemente más rápida.

## 9. Alcance entregado y siguientes pasos

Entregado:

- 8 vistas, 4 roles, 5 usuarios demo y navegación por permisos.
- Filtros combinables con URL y alcance forzado.
- Motor de cálculo, consolidado de 3 niveles y alertas.
- Exportación PDF/Excel con contexto y filtros.
- Configuración de umbral/metas persistida localmente.
- Documentación de contrato backend y pruebas automatizadas.

Siguiente iteración:

- Backend real, SSO y persistencia de configuración con auditoría.
- Exportación e historial centralizados en servidor (hoy el historial es local).
- Paginación/virtualización para catálogos grandes (72 profesionales ya se
  muestran completos; con más volumen conviene paginar).
- Reglas de negocio adicionales por cargo o jornada si el organismo las define.
- Pruebas E2E de navegación y descarga en navegador real.
