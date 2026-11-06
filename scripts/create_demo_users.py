#!/usr/bin/env python3
"""Crea/actualiza los usuarios demo de Supabase Auth y sus perfiles.

Requiere SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DEMO_USER_PASSWORD.
Si existe .env.local, lo carga automáticamente.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env():
    env_file = ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key, value)


load_env()

BASE = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
PASSWORD = os.environ.get("DEMO_USER_PASSWORD", "")

if not BASE or not SERVICE or not PASSWORD:
    sys.exit("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o DEMO_USER_PASSWORD (.env.local)")

HEADERS = {
    "apikey": SERVICE,
    "Authorization": f"Bearer {SERVICE}",
    "Content-Type": "application/json",
}


def request(method, url, body=None, extra_headers=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {**HEADERS, **(extra_headers or {})}
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()


def admin_create_user(email, nombre):
    status, body = request(
        "POST",
        f"{BASE}/auth/v1/admin/users",
        {"email": email, "password": PASSWORD, "email_confirm": True, "user_metadata": {"nombre": nombre}},
    )
    if status in (200, 201):
        return body["id"]

    status, listing = request("GET", f"{BASE}/auth/v1/admin/users?page=1&per_page=200")
    if status == 200:
        for user in listing.get("users", []):
            if user.get("email") == email:
                return user["id"]
    raise RuntimeError(f"No se pudo crear/obtener {email}: {status} {body}")


def first(path):
    status, data = request("GET", f"{BASE}/rest/v1/{path}")
    if status != 200 or not data:
        raise RuntimeError(f"Sin datos para {path}: {status} {data}")
    return data[0]


def upsert_profile(uid, email, nombre, rol, instituto_id=None, profesional_id=None):
    payload = {
        "user_id": uid,
        "email": email,
        "nombre": nombre,
        "rol": rol,
        "instituto_id": instituto_id,
        "profesional_id": profesional_id,
    }
    # Intenta actualizar; si no existe el perfil, lo crea.
    status, body = request(
        "PATCH",
        f"{BASE}/rest/v1/profiles?user_id=eq.{uid}",
        payload,
        {"Prefer": "return=representation"},
    )
    if status == 200 and body:
        return
    status, body = request(
        "POST",
        f"{BASE}/rest/v1/profiles?on_conflict=user_id",
        payload,
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
    )
    if status not in (200, 201, 204):
        raise RuntimeError(f"No se pudo crear perfil {email}: {status} {body}")


def main():
    instituto = first("institutos?codigo=eq.STG&select=id")
    dotacion = first(f"dotacion_mensual?select=profesional_id&instituto_id=eq.{instituto['id']}&limit=1")
    profesional = first(f"profesionales?id=eq.{dotacion['profesional_id']}&select=id")

    users = [
        ("central@botathon.cl", "Planificación Central", "planificacion_central", None, None),
        ("jefatura@botathon.cl", "Jefatura Santiago", "jefatura_instituto", instituto["id"], None),
        (
            "profesional@botathon.cl",
            "Profesional Demo",
            "profesional_lectura",
            instituto["id"],
            profesional["id"],
        ),
    ]

    for email, nombre, rol, instituto_id, profesional_id in users:
        uid = admin_create_user(email, nombre)
        upsert_profile(uid, email, nombre, rol, instituto_id, profesional_id)
        print(f"OK  {email:28s} rol={rol:22s} id={uid}")

    print("\nPassword demo:", PASSWORD)
    print("Guárdala en un lugar seguro; no se commitea.")


if __name__ == "__main__":
    main()
