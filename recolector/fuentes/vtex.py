"""Supermercados Santa María (plataforma VTEX).

Su página https://www.supermercadosantamaria.com/ofertas muestra la colección
237. En vez de leer el HTML (que se arma con JavaScript) usamos la API pública
de catálogo de VTEX, que devuelve lo mismo en JSON: precio actual (Price) y
precio normal (ListPrice). Su robots.txt no bloquea /api/ (solo /busca/, /login/…).
"""
import re

from comun import pedir_json, crear_oferta

TIENDAS = {
    "Santa María": {
        "base": "https://www.supermercadosantamaria.com",
        "colecciones": [237],  # "Ofertas"
    },
}

POR_PAGINA = 50   # máximo que permite la API
MAX_PRODUCTOS = 2500  # límite de VTEX para _from


def _leer_producto(tienda, p):
    if not p.get("items"):
        return None
    item = p["items"][0]
    vendedor = next((s for s in item.get("sellers", []) if s.get("sellerDefault")), None) \
        or (item.get("sellers") or [None])[0]
    if not vendedor:
        return None
    oferta = vendedor.get("commertialOffer", {})
    # No filtramos por IsAvailable: sin elegir local, la API marca todo como
    # "no disponible" (el stock depende de la tienda), pero el precio es válido.
    precio = oferta.get("Price")
    normal = max(oferta.get("ListPrice") or 0, oferta.get("PriceWithoutDiscount") or 0)
    categoria = None
    if p.get("categories"):
        # '/Lácteos/Huevos/Huevos de gallina/' -> 'Lácteos' (la más general)
        categoria = max(p["categories"], key=len).strip("/").split("/")[0] or None
    imagen = item["images"][0]["imageUrl"] if item.get("images") else None
    if imagen:
        imagen = re.sub(r"\?.*$", "", imagen)
    return crear_oferta(
        tienda=tienda,
        nombre=p.get("productName"),
        precio=precio,
        precio_normal=normal,
        url=p.get("link"),
        imagen=imagen,
        categoria=categoria,
    )


def recolectar():
    ofertas = []
    for tienda, cfg in TIENDAS.items():
        for coleccion in cfg["colecciones"]:
            desde, total = 0, None
            antes = len(ofertas)
            while desde < min(total or MAX_PRODUCTOS, MAX_PRODUCTOS):
                url = (f"{cfg['base']}/api/catalog_system/pub/products/search"
                       f"?fq=productClusterIds:{coleccion}&_from={desde}&_to={desde + POR_PAGINA - 1}")
                productos, cabeceras = pedir_json(url)
                if not productos:
                    break
                if total is None:  # cabecera "resources: 0-49/1864"
                    m = re.search(r"/(\d+)$", cabeceras.get("resources", ""))
                    total = int(m.group(1)) if m else MAX_PRODUCTOS
                for p in productos:
                    o = _leer_producto(tienda, p)
                    if o:
                        ofertas.append(o)
                desde += POR_PAGINA
            print(f"   {tienda} colección {coleccion}: {len(ofertas) - antes} ofertas (de {total} productos)")
    return ofertas
