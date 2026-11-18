"""Utilidades compartidas por todas las fuentes."""
import re
import time
import hashlib
from datetime import datetime

import requests

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
)
PAUSA_SEGUNDOS = 1.5  # pausa entre peticiones para no sobrecargar las webs

_sesion = requests.Session()
_sesion.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "es-EC,es;q=0.9"})


def descargar(url: str) -> str | None:
    """Descarga una página y devuelve su HTML (o None si falla)."""
    time.sleep(PAUSA_SEGUNDOS)
    try:
        r = _sesion.get(url, timeout=90)  # algunas webs (Megamaxi) tardan bastante
        r.raise_for_status()
        r.encoding = "utf-8"
        return r.text
    except requests.RequestException as e:
        print(f"   ! No se pudo descargar {url}: {e}")
        return None


def pedir_json(url: str, datos: dict | None = None):
    """Pide un JSON (GET, o POST si hay `datos`). Devuelve (json, cabeceras) o (None, {})."""
    time.sleep(PAUSA_SEGUNDOS)
    try:
        if datos is None:
            r = _sesion.get(url, timeout=60)
        else:
            r = _sesion.post(url, data=datos, timeout=60)
        r.raise_for_status()
        return r.json(), r.headers
    except (requests.RequestException, ValueError) as e:
        print(f"   ! No se pudo leer {url}: {e}")
        return None, {}


def a_numero(texto: str | None) -> float | None:
    """'$1,234.50' -> 1234.5"""
    if not texto:
        return None
    m = re.search(r"\d[\d.,]*", texto)
    if not m:
        return None
    valor = m.group(0).replace(",", "")
    try:
        return float(valor)
    except ValueError:
        return None


def a_fecha_iso(texto: str | None) -> str | None:
    """'1-12-2026' -> '2026-12-01'"""
    if not texto:
        return None
    m = re.search(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", texto)
    if not m:
        return None
    d, mes, a = (int(x) for x in m.groups())
    try:
        return datetime(a, mes, d).date().isoformat()
    except ValueError:
        return None


def crear_oferta(tienda, nombre, precio, precio_normal, url, imagen=None,
                 valido_hasta=None, local=None, categoria=None):
    """Devuelve la oferta normalizada, o None si no es un descuento real."""
    if not nombre or not precio or not precio_normal or precio_normal <= precio:
        return None
    descuento = round((1 - precio / precio_normal) * 100)
    return {
        "id": hashlib.md5(f"{tienda}|{url}".encode()).hexdigest()[:12],
        "tienda": tienda,
        "nombre": " ".join(nombre.split()),
        "precio": round(precio, 2),
        "precio_normal": round(precio_normal, 2),
        "descuento_pct": descuento,
        "ahorro": round(precio_normal - precio, 2),
        "valido_hasta": valido_hasta,
        "local": local,
        "categoria": categoria,
        "imagen": imagen,
        "url": url,
    }
