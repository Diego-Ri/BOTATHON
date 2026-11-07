# Contrato de backend propuesto · MasterValidationSec

Este documento define el contrato mínimo para conectar el frontend actual
(`VITE_REPOSITORIO=http`) sin modificar las vistas ni el motor de cálculo.

## 1. Principios

1. **El alcance se deriva de la sesión, no del cliente.** Aunque la UI envíe
   filtros, el backend debe intersectarlos con el alcance del usuario.
2. **Se devuelven registros crudos.** El frontend recalcula todos los
   porcentajes con `src/domain/calc.ts` para que los totales siempre cuadren.
3. **Los filtros son combinables** y se aplican con AND. La jerarquía
   `profesional > área > instituto` se normaliza en el cliente; el servidor debe
   validar que la combinación exista y esté dentro del alcance.
4. **Formato de período:** `YYYY-MM` (por ejemplo `2026-10`). El mes de corte de
   la demo es octubre de 2026.
5. **Respuestas numéricas sin redondear** en horas y atenciones. El formato
   `es-CL` se aplica solo en la UI y en los archivos exportados.

## 2. Sesión y alcance

La demo usa un selector local. En producción se reemplaza por OIDC/SSO y el
backend expone la sesión con el mismo tipo `Usuario`:

```ts
type Rol = 'profesional' | 'jefatura_area' | 'direccion_instituto' | 'direccion_nacional';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  cargo?: string;
  cargoId?: string;
  institutoId?: string;
  areaId?: string;
  profesionalId?: string;
  iniciales: string;
  descripcion: string;
}
```

Alcance efectivo:

| Rol | `institutoId` | `areaId` | `profesionalId` | `cargoId` |
| --- | --- | --- | --- | --- |
| profesional | fijo | fijo | fijo | fijo |
| jefatura_area | fijo | fijo | — | — |
| direccion_instituto | fijo | — | — | — |
| direccion_nacional | — | — | — | — |

Los valores fijos deben salir del token/sesión. Si el cliente intenta consultar
otro instituto, área o profesional, responder `403` (o devolver una colección
vacía sin revelar datos; se prefiere `403` explícito para errores de integración).

## 3. Endpoints

Base configurable con `VITE_API_URL` (por defecto `/api`). Todas las respuestas
son `application/json`. Autenticación por cookie de sesión (`credentials:
'include'`).

### `GET /api/catalogos`

Devuelve el catálogo completo. No incluye datos de metas.

```json
{
  "institutos": [{ "id": "inst-inr", "nombre": "Instituto Nacional de Rehabilitación", "sigla": "INR" }],
  "areas": [{ "id": "area-inr-fisica", "institutoId": "inst-inr", "nombre": "Rehabilitación Física" }],
  "cargos": [{ "id": "kinesiologia", "nombre": "Kinesiología" }],
  "profesionales": [
    {
      "id": "prof-001",
      "nombre": "Camila Rojas Pérez",
      "cargoId": "kinesiologia",
      "areaId": "area-inr-fisica",
      "institutoId": "inst-inr",
      "horasContratadas": 176,
      "activo": true
    }
  ],
  "periodos": [
    { "id": "2026-10", "anio": 2026, "mes": 10, "etiqueta": "octubre de 2026", "corta": "oct 2026", "cerrado": true }
  ],
  "periodoActual": "2026-10"
}
```

Consideración de volumen: 86 cuentas y ~72 profesionales es manejable sin
paginación. Si el catálogo crece, agregar paginación/búsqueda y ajustar la UI.

### `GET /api/metas`

Query params:

| Parámetro | Requerido | Ejemplo | Regla |
| --- | --- | --- | --- |
| `mes` | Sí | `2026-10` | `YYYY-MM` válido |
| `instituto` | No | `inst-inr` | debe pertenecer al alcance |
| `area` | No | `area-inr-fisica` | debe pertenecer al instituto filtrado |
| `cargo` | No | `kinesiologia` | filtro adicional |
| `profesional` | No | `prof-001` | debe pertenecer al área/cargo filtrados |

Respuesta: `MetaMensual[]` con una fila por profesional y mes.

```json
[
  {
    "id": "meta-prof-001-2026-10",
    "profesionalId": "prof-001",
    "periodo": "2026-10",
    "atencionesObjetivo": 285,
    "atencionesRealizadas": 292,
    "horasDirectas": 131.7,
    "horasIndirectas": 41.6,
    "horasNAS": 2.7,
    "horasContratadas": 176,
    "planificado": 286,
    "sic": 230
  }
]
```

Invariantes recomendadas:

- `atencionesObjetivo > 0`.
- `planificado > 0` (si no hay plan, usar `0` y el front mostrará “sin datos”).
- `horasDirectas + horasIndirectas + horasNAS ≈ horasContratadas` (tolerancia
  0,01). Si no cuadra, la UI lo advierte con “Revisar desglose”.
- `sic >= 0`, `atencionesRealizadas >= 0`.

### `GET /api/series`

Mismos filtros que `/metas`, pero **ignora `mes`** para devolver la serie
completa de períodos disponibles con esos filtros.

Respuesta: `PuntoSerie[]`, calculada por el backend con el mismo motor o por el
frontend si se prefiere devolver los registros. La UI actual espera los
indicadores ya agregados:

```json
[
  {
    "periodo": "2026-10",
    "indicadores": {
      "profesionales": 72,
      "atencionesObjetivo": 16246,
      "atencionesRealizadas": 15136,
      "horasDirectas": 7539.1,
      "horasIndirectas": 2238.8,
      "horasNAS": 914.1,
      "horasContratadas": 10692,
      "planificado": 16233,
      "sic": 16401,
      "metaGestion": 93.1,
      "foja": 91.5,
      "desviacion": 1.0,
      "horasAsistenciales": 9777.9
    }
  }
]
```

Alternativa recomendada: devolver `MetaMensual[]` de todos los períodos y dejar
la agregación en el cliente para garantizar una única implementación del motor.
En ese caso se agrega `GET /api/metas/serie` o un flag `incluirSerie=true`.

### `GET /api/configuracion`

```json
{
  "metaGestionObjetivo": 90,
  "fojaObjetivo": 90,
  "umbralDesviacion": 10
}
```

Lectura para todos los roles autenticados; escritura solo
`direccion_nacional`.

### `PUT /api/configuracion`

Body:

```json
{
  "metaGestionObjetivo": 92,
  "fojaObjetivo": 90,
  "umbralDesviacion": 12
}
```

Validaciones: `1 ≤ metaGestionObjetivo ≤ 100`, `1 ≤ fojaObjetivo ≤ 100`,
`1 ≤ umbralDesviacion ≤ 50`. Responder `200` con el objeto guardado. Registrar
auditoría (`usuarioId`, fecha, valores anteriores y nuevos).

Recomendación: agregar `version` o `updatedAt` para control de concurrencia
optimista si varias direcciones editan parámetros.

### `GET /api/auth/session`

Devuelve `Usuario`. Alternativa: OIDC y un endpoint de perfil. El frontend debe
seguir usando `useUsuarioActual`; solo cambia la implementación de la sesión.

### `POST /api/reportes/exportaciones` (opcional, siguiente iteración)

Hoy la exportación se genera en el navegador. Si se centraliza:

```json
{
  "formato": "pdf",
  "titulo": "Reporte de gestión",
  "filtros": {
    "instituto": "inst-inr",
    "area": "area-inr-fisica",
    "cargo": null,
    "mes": "2026-10",
    "profesional": null
  },
  "secciones": ["Detalle", "Serie mensual", "Alertas"]
}
```

Respuesta: archivo binario o `202` con URL temporal. Guardar usuario, fecha,
filtros y hash del archivo para auditoría.

## 4. Errores

Formato único:

```json
{
  "codigo": "FUERA_DE_ALCANCE",
  "mensaje": "El profesional solicitado no pertenece a tu alcance.",
  "detalle": { "profesionalId": "prof-050" }
}
```

| HTTP | Uso |
| --- | --- |
| 400 | Query inválida o combinación imposible |
| 401 | Sin sesión |
| 403 | Rol sin permiso o fuera de alcance |
| 404 | Recurso inexistente |
| 422 | Validación de parámetros o configuración |
| 500 | Error no controlado; no filtrar detalles internos |

No devolver datos de otro alcance para “explicar” un 403.

## 5. Modelo de datos sugerido

| Tabla | Campos clave | Restricciones |
| --- | --- | --- |
| `institutos` | `id`, `nombre`, `sigla` | PK `id` |
| `areas` | `id`, `instituto_id`, `nombre` | FK instituto |
| `cargos` | `id`, `nombre` | PK `id` |
| `profesionales` | `id`, `nombre`, `cargo_id`, `area_id`, `instituto_id`, `horas_contratadas`, `activo` | FKs; índice por instituto/área |
| `usuarios` | `id`, `email`, `nombre`, `rol`, `profesional_id`, `area_id`, `instituto_id`, `activo` | único email; alcance coherente |
| `metas_mensuales` | campos de `MetaMensual` | único (`profesional_id`, `periodo`); índices por período |
| `configuracion` | parámetros + `updated_at`, `updated_by` | una fila activa o histórico |
| `auditoria` | usuario, acción, entidad, antes/después, fecha | solo lectura |
| `exportaciones` | usuario, formato, filtros JSON, archivo, fecha | opcional |

Índices mínimos: `metas_mensuales(periodo)`,
`metas_mensuales(profesional_id, periodo)`, `profesionales(area_id)`,
`profesionales(instituto_id)`.

## 6. Fórmulas que el backend debe replicar (o dejar al frontend)

```text
Meta de gestión % = atencionesRealizadas / atencionesObjetivo × 100
FOJA %            = (horasDirectas + horasIndirectas) / horasContratadas × 100
Desviación %      = (sic − planificado) / planificado × 100
```

Si el backend agrega, debe sumar primero los registros y recalcular los
porcentajes sobre los totales. **No promediar porcentajes.**

## 7. Pasos de integración

1. Implementar `/catalogos`, `/metas`, `/series` y `/configuracion`.
2. Configurar CORS/cookies y CSRF según el dominio.
3. Reemplazar la sesión demo por OIDC/SSO.
4. Copiar `.env.example` a `.env.local` y usar
   `VITE_REPOSITORIO=http`, `VITE_API_URL=https://api...`.
5. Ejecutar `npm test` y las pruebas de contrato del backend con el mismo seed.
6. Verificar 401/403/422 y conciliación de totales en los tres niveles.
7. Retirar `MockRepository` del bundle de producción o dejarlo detrás de un flag
   de demo explícito.

## 8. Seguridad mínima

- Sesión `HttpOnly`, `Secure`, `SameSite=Lax/Strict`.
- CSRF token si se usan cookies para escrituras.
- Rate limit en login y exportaciones.
- Autorización por rol **y** por alcance en cada endpoint.
- No cachear respuestas con datos personales en CDN compartida.
- Auditoría de cambios de configuración y exportaciones.
- Validación de query params y límites de rango de fechas.
