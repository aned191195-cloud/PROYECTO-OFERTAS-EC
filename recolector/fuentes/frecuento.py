"""Mi Comisariato, a través de Frecuento.com (tienda en línea del grupo El Rosado).

micomisariato.com solo publica folletos, pero Frecuento tiene su catálogo:
https://www.frecuento.com/categorias/mi-comisariato/
La web se arma con JavaScript y pide los datos a la API app.frecuento.com.
Usamos la misma consulta que su página "Promociones", filtrada a la categoría
de Mi Comisariato (15075). Cada producto trae precio final (amount_total) y
precio normal con IVA (amount_incl_tax).

robots.txt: www.frecuento.com permite todo; app.frecuento.com no tiene robots.txt.
"""
import re

from comun import pedir_json, crear_oferta

API = "https://app.frecuento.com/products/promotionals/"
TIENDAS = {
    "Mi Comisariato": 15075,  # id de categoría en Frecuento
}
MAX_PAGINAS = 60


def _a_float(valor):
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def _leer_producto(tienda, p):
    foto = p["photos"][0] if p.get("photos") else None
    if foto:  # pedir una foto más grande que la miniatura de 190x190
        foto = re.sub(r"/fit-in/\d+x\d+/", "/fit-in/500x500/", foto)
    categorias = p.get("categories") or []
    return crear_oferta(
        tienda=tienda,
        nombre=p.get("name"),
        precio=_a_float(p.get("amount_total")),
        precio_normal=_a_float(p.get("amount_incl_tax")),
        url=p.get("url"),
        imagen=foto,
        categoria=categorias[0]["name"] if categorias else None,
    )


def recolectar():
    ofertas = []
    for tienda, categoria in TIENDAS.items():
        antes, pagina, paginas, total = len(ofertas), 1, 1, None
        while pagina <= min(paginas, MAX_PAGINAS):
            datos, _ = pedir_json(f"{API}?stock=true&category={categoria}&page={pagina}")
            if not datos or not datos.get("results"):
                break
            paginas, total = datos.get("pages", 1), datos.get("count")
            for p in datos["results"]:
                if p.get("has_stock") is False:
                    continue
                o = _leer_producto(tienda, p)
                if o:
                    ofertas.append(o)
            pagina += 1
        print(f"   {tienda} (Frecuento): {len(ofertas) - antes} ofertas (de {total} en promoción)")
    return ofertas
