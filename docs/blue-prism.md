# Integración Blue Prism ↔ Supabase

Blue Prism se encarga de **recibir, leer, validar y comparar** los reportes Excel de BUK y SIC.
La base de datos recibe el resultado ya estructurado y hace la normalización, el diff y el cálculo.

## Autenticación

Las funciones de ingesta están pensadas para `service_role`:

```
apikey: <SUPABASE_SERVICE_ROLE_KEY>
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
```

Guardar la clave en el **Credential Store** de Blue Prism. No debe quedar en el proceso,
en logs ni en el repositorio.

## Endpoints

| Acción | Método | URL |
|---|---|---|
| Ingesta BUK | `POST` | `https://wnihdcgjxazqupcdfvzj.supabase.co/rest/v1/rpc/rpc_ingestar_buk` |
| Ingesta SIC | `POST` | `https://wnihdcgjxazqupcdfvzj.supabase.co/rest/v1/rpc/rpc_ingestar_sic` |
| Recalcular plan | `POST` | `https://wnihdcgjxazqupcdfvzj.supabase.co/rest/v1/rpc/fn_generar_planificacion` |

## Payload BUK

```json
{
  "p_archivo": "Nac - Base contratos x mes - 2026-07.xlsx",
  "p_hash": "sha256-del-archivo",
  "p_anio": 2026,
  "p_mes": 7,
  "p_registros": [
    {
      "profesional_codigo": "PROF-001",
      "nombre": "Profesional Demo 001",
      "instituto_codigo": "STG",
      "cargo": "Kinesiólogo",
      "tipo_contrato": "Indefinido",
      "horas_semanales": 42,
      "fecha_inicio": "2026-01-01",
      "fecha_termino": null,
      "reemplaza_a": null,
      "es_vacante": false,
      "incluir_en_planificacion": true,
      "anio": 2026,
      "mes": 7
    }
  ]
}
```

### Alias aceptados

| Campo canónico | Alias |
|---|---|
| `profesional_codigo` | `codigo_profesional`, `codigo` |
| `nombre` | `nombre_profesional` |
| `instituto_codigo` | `codigo_instituto`, `instituto` |
| `cargo` | `cargo_nombre` |
| `tipo_contrato` | `contrato` |
| `horas_semanales` | `horas` |
| `fecha_inicio` | `inicio` |
| `fecha_termino` | `termino` |
| `reemplaza_a` | `reemplaza_codigo` |
| `es_vacante` | `vacante` |
| `incluir_en_planificacion` | `incluir` |

Fechas: `YYYY-MM-DD` o `DD/MM/YYYY`. Números con coma o punto decimal.

## Respuesta BUK

```json
{
  "importacion_id": "d55e4b04-f2bf-40c6-8433-3d05c2214c88",
  "duplicada": false,
  "filas_total": 1,
  "filas_ok": 1,
  "filas_error": 0,
  "advertencias": 0
}
```

- **Idempotencia:** si se repite el mismo `p_hash`, devuelve `duplicada: true` y no vuelve a escribir.
- **Errores:** cada fila inválida queda en `importacion_errores` con fila, columna, código y mensaje.
- **Diff:** si la fila ya existía, los cambios quedan en `cambios_dotacion`.

## Payload SIC

```json
{
  "p_archivo": "Nac - Atenciones SIC - 2026-07.xlsx",
  "p_hash": "sha256-del-archivo-sic",
  "p_anio": 2026,
  "p_mes": 7,
  "p_registros": [
    {
      "profesional_codigo": "PROF-001",
      "instituto_codigo": "STG",
      "atenciones_directas": 180,
      "atenciones_indirectas": 45,
      "anio": 2026,
      "mes": 7
    }
  ]
}
```

Si el reporte solo trae un total, enviar `atenciones_total`; la función lo usa como directas.

## Flujo recomendado en Blue Prism

1. Detectar el archivo nuevo en la carpeta de entrada.
2. Calcular SHA-256 y consultar si ya fue procesado (o dejar que la RPC responda `duplicada`).
3. Leer el Excel y mapear encabezados a los campos canónicos.
4. Validar tipos, fechas, horas y códigos de instituto/cargo.
5. Enviar el JSON a `rpc_ingestar_buk` o `rpc_ingestar_sic`.
6. Si `filas_error > 0`, mover el archivo a cuarentena y notificar.
7. Si todo está OK, llamar `fn_generar_planificacion`:

```json
{ "p_anio": 2026, "p_notas": "Recálculo automático BUK 2026-07" }
```

8. Confirmar que la nueva versión quedó en `planificacion_versiones` y avisar a planificación central.

## Ejemplo curl

```bash
curl -X POST "https://wnihdcgjxazqupcdfvzj.supabase.co/rest/v1/rpc/rpc_ingestar_buk" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @payload_buk.json
```

## Manejo de errores

| Código | Significado | Acción |
|---|---|---|
| `FILA_INVALIDA` | Campo obligatorio, tipo o rango inválido | Revisar fila y reenviar |
| `REEMPLAZO_NO_ENCONTRADO` | `reemplaza_a` no existe (warning) | Verificar código del titular |
| `duplicada: true` | Archivo ya procesado | No reenviar |
| HTTP 401/403 | Clave o rol incorrecto | Revisar credencial y `service_role` |

## Nota sobre chunks

Si el archivo es muy grande, enviar varios lotes con un `p_hash` distinto por lote
(por ejemplo `hash + "-01"`). La idempotencia es por lote, no por archivo completo.
