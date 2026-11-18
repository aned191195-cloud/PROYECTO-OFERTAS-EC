"""Tía y Coral Hipermercados (las dos usan la plataforma Magento).

En Magento cada producto tiene:
  <span data-price-type="finalPrice" data-price-amount="1.82">
  <span data-price-type="oldPrice"   data-price-amount="2.12">
Solo se leen páginas permitidas por su robots.txt (sin parámetros "?").
"""
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from comun import descargar, crear_oferta

TIENDAS = {
    "Tía": {
        "paginas": ["https://www.tia.com.ec/"],
        "subpaginas": None,
    },
    "Coral": {
        "paginas": ["https://coralhipermercados.com/ofertas/descuentos-del-mes/comisariato.html"],
        # subcategorías de supermercado dentro de "descuentos del mes"
        "subpaginas": re.compile(
            r"^https://coralhipermercados\.com/ofertas/descuentos-del-mes/comisariato/[a-z0-9-]+\.html$"
        ),
    },
}


def _monto(item, tipo):
    span = item.find(attrs={"data-price-type": tipo})
    if span and span.get("data-price-amount"):
        try:
            return float(span["data-price-amount"])
        except ValueError:
            return None
    return None


def _leer_item(tienda, item, url_pagina, categoria):
    enlace = item.select_one("a.product-item-link") or item.select_one("a.product-item-photo")
    nombre = None
    if item.select_one(".product-item-name"):
        nombre = item.select_one(".product-item-name").get_text(" ", strip=True)
    img = item.select_one("img.product-image-photo")
    if not nombre and img:
        nombre = img.get("title") or img.get("alt")
    # Tía a veces pone el nombre solo en la etiqueta de imagen
    if nombre and nombre.lower().endswith((".jpeg", ".jpg", ".png")):
        etiqueta = item.select_one("img.amasty-label-image")
        nombre = etiqueta.get("title") if etiqueta else None
    return crear_oferta(
        tienda=tienda,
        nombre=nombre.title() if nombre and nombre.isupper() else nombre,
        precio=_monto(item, "finalPrice"),
        precio_normal=_monto(item, "oldPrice"),
        url=urljoin(url_pagina, enlace["href"]) if enlace else url_pagina,
        imagen=img.get("src") if img and "placeholder" not in img.get("src", "") else None,
        categoria=categoria,
    )


def recolectar(max_subpaginas: int = 30):
    ofertas = []
    for tienda, cfg in TIENDAS.items():
        pendientes = [(u, None) for u in cfg["paginas"]]
        visitadas = set()
        while pendientes:
            url, categoria = pendientes.pop(0)
            if url in visitadas:
                continue
            visitadas.add(url)
            html = descargar(url)
            if not html:
                continue
            soup = BeautifulSoup(html, "html.parser")
            antes = len(ofertas)
            for item in soup.select(".product-item-info"):
                o = _leer_item(tienda, item, url, categoria)
                if o:
                    ofertas.append(o)
            print(f"   {tienda} {url.split('.com', 1)[-1] or '/'}: {len(ofertas) - antes} ofertas")

            if cfg["subpaginas"] and url in cfg["paginas"]:
                subs = []
                for a in soup.find_all("a", href=cfg["subpaginas"]):
                    if a["href"] not in subs:
                        subs.append(a["href"])
                for href in subs[:max_subpaginas]:
                    cat = href.rsplit("/", 1)[-1].removesuffix(".html").replace("-", " ").capitalize()
                    pendientes.append((href, cat))
    return ofertas
