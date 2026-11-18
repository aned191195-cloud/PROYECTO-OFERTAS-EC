"""Megamaxi (Corporación Favorita) — megamaxi.com.

Es un catálogo en WordPress: las páginas traen los productos pero sin precio.
Los precios los pide el navegador después, en grupos de 8, a
/wp-admin/admin-ajax.php con la acción "cf_api_loop_prices". Hacemos lo mismo
(solo esa consulta de lectura). Devuelve precio de oferta, precio de afiliado
(el normal) y la fecha de fin de la oferta.

robots.txt: solo tiene reglas para Googlebot/AdsBot; nada bloquea estas páginas.
"""
import json
import re
from datetime import datetime, timezone, timedelta

from bs4 import BeautifulSoup

from comun import descargar, pedir_json, crear_oferta

BASE = "https://www.megamaxi.com"
AJAX = BASE + "/wp-admin/admin-ajax.php"
PAGINAS = [
    ("/mega-ofertas/", None),
    ("/product-category/megadescuentos/", None),
    ("/product-category/megapromo/", None),
    ("/product-category/promo-llantas/", "Llantas"),
]
LOTE = 8  # igual que la web
MAX_PAGINAS_POR_LISTADO = 5
ECUADOR = timezone(timedelta(hours=-5))


def _productos_de_la_pagina(html):
    """Devuelve ({post_id: datos para pedir precio}, {post_id: tarjeta}, local, siguiente_página)."""
    m = re.search(r"var\s+product_ids_data\s*=\s*(\{.*?\});", html, re.S)
    ids = json.loads(m.group(1)).get("product_ids", {}) if m else {}
    m_local = re.search(r'id="cf_api_current_local"[^>]*value="([^"]*)"', html)
    soup = BeautifulSoup(html, "html.parser")
    tarjetas = {}
    for li in soup.select("li.product"):
        m_id = next((re.match(r"post-(\d+)$", c) for c in li.get("class", []) if c.startswith("post-")), None)
        if m_id:
            tarjetas[m_id.group(1)] = li
    siguiente = soup.select_one("a.next.page-numbers")
    return ids, tarjetas, (m_local.group(1) if m_local else None), (siguiente["href"] if siguiente else None)


def _datos_tarjeta(li):
    titulo = li.select_one("h2")
    nombre = (titulo.get("data-title") or titulo.get_text(" ", strip=True)) if titulo else None
    enlace = li.select_one("a.woocommerce-LoopProduct-link")
    img = li.select_one("noscript img") or li.select_one("img.wp-post-image")
    imagen = None
    if img:
        imagen = img.get("data-lazy-src") or img.get("src")
        if imagen and imagen.startswith("data:"):
            imagen = None
    if imagen:  # usar la foto grande, no la miniatura 150x150
        imagen = re.sub(r"-\d+x\d+(\.\w+)$", r"\1", imagen)
    return nombre, (enlace["href"] if enlace else BASE), imagen


def _fecha(ms):
    if not ms:
        return None
    try:
        return datetime.fromtimestamp(int(ms) / 1000, ECUADOR).date().isoformat()
    except (ValueError, OSError):
        return None


def _pedir_precios(local, lote):
    datos = {"action": "cf_api_loop_prices", "local": local}
    for post_id, info in lote.items():
        for campo, valor in info.items():
            datos[f"product_ids[{post_id}][{campo}]"] = valor
    respuesta, _ = pedir_json(AJAX, datos)
    return respuesta if isinstance(respuesta, dict) else {}


def recolectar():
    ofertas = []
    for ruta, categoria in PAGINAS:
        url, n = BASE + ruta, 0
        while url and n < MAX_PAGINAS_POR_LISTADO:
            n += 1
            html = descargar(url)
            if not html:
                break
            ids, tarjetas, local, siguiente = _productos_de_la_pagina(html)
            antes = len(ofertas)
            claves = list(ids)
            for i in range(0, len(claves), LOTE):
                lote = {k: ids[k] for k in claves[i:i + LOTE]}
                precios = _pedir_precios(local, lote)
                for post_id, p in precios.items():
                    if not isinstance(p, dict) or post_id not in tarjetas:
                        continue
                    nombre, enlace, imagen = _datos_tarjeta(tarjetas[post_id])
                    o = crear_oferta(
                        tienda="Megamaxi",
                        nombre=nombre,
                        precio=p.get("offerPriceWithTax") or None,
                        precio_normal=p.get("affiliatePriceWithTax") or None,
                        url=enlace,
                        imagen=imagen,
                        valido_hasta=_fecha(p.get("offerEndDate")),
                        categoria=categoria,
                    )
                    if o:
                        ofertas.append(o)
            print(f"   Megamaxi {url.removeprefix(BASE)}: {len(ofertas) - antes} ofertas (de {len(ids)} productos)")
            url = siguiente
    return ofertas
