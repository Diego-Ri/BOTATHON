#!/usr/bin/env python3
"""Prueba de humo remota, solo lectura, contra Supabase."""

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def get(path):
    req = urllib.request.Request(BASE + path, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read().decode()
        return response.status, response.headers, json.loads(body) if body else None


def count(table):
    req = urllib.request.Request(
        f"{BASE}/rest/v1/{table}?select=id",
        headers={**HEADERS, "Prefer": "count=exact", "Range": "0-0"},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        content_range = response.headers.get("Content-Range", "*/0")
        return int(content_range.split("/")[-1])


def check(name, fn):
    try:
        value = fn()
        print(f"  PASS  {name}: {value}")
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"  FAIL  {name}: {exc}")
        return False


def main():
    print(f"Smoke test · {BASE}")
    ok = True

    ok &= check("institutos", lambda: count("institutos"))
    ok &= check("profesionales", lambda: count("profesionales"))
    ok &= check("dotacion_mensual", lambda: count("dotacion_mensual"))
    ok &= check("planificacion_mensual", lambda: count("planificacion_mensual"))
    ok &= check("atenciones_sic", lambda: count("atenciones_sic"))

    def nacional():
        status, _, data = get("/rest/v1/v_planificacion_nacional?select=anio,mes,atenciones_planificadas&limit=3")
        assert status == 200 and data, "vista nacional vacía"
        return f"{len(data)} filas, primera={data[0]}"

    def instituto():
        status, _, data = get(
            "/rest/v1/v_planificacion_instituto?select=instituto,area,cargo,atenciones_planificadas&limit=2"
        )
        assert status == 200 and data, "vista instituto vacía"
        return f"{len(data)} filas"

    def cumplimiento():
        status, _, data = get("/rest/v1/v_cumplimiento_sic?select=anio,mes,desviacion_pct&limit=3")
        assert status == 200, "error en vista de cumplimiento"
        return f"{len(data)} filas"

    def calendario():
        status, _, data = get("/rest/v1/calendario_mensual?select=anio,mes,dias_habiles&limit=1")
        assert status == 200 and data, "calendario vacío"
        return data[0]

    ok &= check("v_planificacion_nacional", nacional)
    ok &= check("v_planificacion_instituto", instituto)
    ok &= check("v_cumplimiento_sic", cumplimiento)
    ok &= check("calendario_mensual", calendario)

    def plan_rows():
        n = count("planificacion_mensual")
        assert n > 0, "no hay planificación calculada"
        return n

    ok &= check("planificación calculada", plan_rows)

    print("OK" if ok else "FALLÓ")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
