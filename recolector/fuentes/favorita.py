"""Supermaxi / Megamaxi y Akí / Gran Akí (Corporación Favorita).

Las dos webs usan el mismo diseño de tarjetas: "Precio oferta", "Precio normal",
"Válido hasta" y "Disponible en".
"""
import re
from urllib.parse import urljoin, urlparse, parse_qs

from bs4 import BeautifulSoup

from comun import descargar, a_numero, a_fecha_iso, crear_oferta

TIENDAS = {
    "Supermaxi": {
        "base": "https://www.supermaxi.com",
        "paginas": [
            "/",
            "/catalogo?megadescuentos=1",
            "/catalogo?maxicombos=1",
            "/catalogo?multiplicador=1",
            "/catalogo?blackdays=1",
        ],
        # además recorre las categorías que aparecen en el menú
        "categorias": re.compile(r"^/catalogo/[a-z0-9-]+(/[a-z0-9-]+)?$"),
    },
    "Akí": {
        "base": "https://www.aki.com.ec",
        "paginas": ["/", "/catalogo"],
        "categorias": None,
    },
}


def _foto(nodo):
    """Foto del producto (la tarjeta también trae el logo de Tipti)."""
    return next(
        (i for i in nodo.find_all("img")
         if i.get("src") and not re.search(r"logo|tipti|icon", i["src"], re.I)),
        None,
    )


def _tarjetas(soup):
    """Encuentra cada tarjeta de producto que tenga 'Precio oferta'."""
    vistas = set()
    for etiqueta in soup.find_all(string=re.compile(r"^\s*Precio oferta\s*$")):
        nodo = etiqueta.parent
        while nodo is not None and nodo.find("h3") is None:
            nodo = nodo.parent
        # subir hasta incluir la foto, sin mezclar con otras tarjetas
        for _ in range(4):
            if nodo is None or _foto(nodo) or nodo.parent is None:
                break
            if len(nodo.parent.find_all("h3")) > 1:
                break
            nodo = nodo.parent
        if nodo is not None and id(nodo) not in vistas:
            vistas.add(id(nodo))
            yield nodo


def _leer_tarjeta(tienda, base, tarjeta, categoria):
    texto = tarjeta.get_text(" ", strip=True)
    m_precio = re.search(r"Precio oferta\s*(?:-?\d+\s*%\s*)?\$\s*([\d.,]+)", texto)
    m_normal = re.search(r"Precio normal\s*:?\s*\$\s*([\d.,]+)", texto)
    m_valido = re.search(r"Válido hasta\s*([\d/-]+)", texto)
    local = None
    p_local = tarjeta.find(lambda t: t.name == "p" and t.get_text().strip().startswith("Disponible en"))
    if p_local:
        span = p_local.find("span")
        local = span.get_text(" ", strip=True) if span else p_local.get_text(" ", strip=True)[13:].strip()

    enlace = tarjeta.find("a", href=re.compile(r"^/(producto|catalogo)/"))
    imagen = _foto(tarjeta)
    img_src = urljoin(base, imagen["src"]) if imagen else None
    if img_src and "/_next/image?" in img_src:  # usar la foto original, no el redimensionador
        img_src = parse_qs(urlparse(img_src).query).get("url", [img_src])[0]

    return crear_oferta(
        tienda=tienda,
        nombre=tarjeta.find("h3").get_text(" ", strip=True),
        precio=a_numero(m_precio.group(1)) if m_precio else None,
        precio_normal=a_numero(m_normal.group(1)) if m_normal else None,
        url=urljoin(base, enlace["href"]) if enlace else base,
        imagen=img_src,
        valido_hasta=a_fecha_iso(m_valido.group(1)) if m_valido else None,
        local=local or None,
        categoria=categoria,
    )


def recolectar(max_categorias: int = 25):
    ofertas = []
    for tienda, cfg in TIENDAS.items():
        base = cfg["base"]
        pendientes = [(p, None) for p in cfg["paginas"]]
        visitadas = set()
        while pendientes:
            ruta, categoria = pendientes.pop(0)
            if ruta in visitadas:
                continue
            visitadas.add(ruta)
            html = descargar(urljoin(base, ruta))
            if not html:
                continue
            soup = BeautifulSoup(html, "html.parser")
            antes = len(ofertas)
            for t in _tarjetas(soup):
                o = _leer_tarjeta(tienda, base, t, categoria)
                if o:
                    ofertas.append(o)
            print(f"   {tienda} {ruta}: {len(ofertas) - antes} ofertas")

            # en la portada, descubrir categorías del menú
            if ruta == "/" and cfg["categorias"]:
                cats = []
                for a in soup.find_all("a", href=cfg["categorias"]):
                    href = a["href"]
                    if href not in cats:
                        cats.append(href)
                for href in cats[:max_categorias]:
                    nombre_cat = href.rstrip("/").split("/")[2].replace("-", " ").capitalize()
                    pendientes.append((href, nombre_cat))
    return ofertas
