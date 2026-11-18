"""Recolector diario de ofertas de supermercados de Ecuador.

Uso:
    python recolectar.py

Genera ../datos/ofertas.json (lo que leerá la app) y guarda una copia
con la fecha en ../datos/historico/ para poder comparar precios más adelante.
"""
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from fuentes import favorita, magento, megamaxi, vtex, frecuento  # noqa: E402

ECUADOR = timezone(timedelta(hours=-5))
CARPETA_DATOS = Path(__file__).resolve().parent.parent / "datos"

FUENTES = [
    ("Supermaxi y Akí", favorita.recolectar),
    ("Megamaxi", megamaxi.recolectar),
    ("Tía y Coral", magento.recolectar),
    ("Mi Comisariato (Frecuento)", frecuento.recolectar),
    ("Santa María", vtex.recolectar),
]
# Revisadas y descartadas por ahora (ver README): Mini de Mi Comisariato,
# Tuti y Del Portal.


def main():
    ahora = datetime.now(ECUADOR)
    print(f"Recolectando ofertas — {ahora:%Y-%m-%d %H:%M} (hora de Ecuador)\n")

    todas, errores = [], []
    for nombre, funcion in FUENTES:
        print(f"> {nombre}")
        try:
            todas.extend(funcion())
        except Exception as e:  # una tienda caída no debe parar a las demás
            print(f"   ! Error en {nombre}: {e}")
            errores.append(nombre)

    # quitar repetidos (el mismo producto aparece en portada y en categoría)
    unicas = {}
    for o in todas:
        previa = unicas.get(o["id"])
        if previa is None or (not previa["categoria"] and o["categoria"]):
            unicas[o["id"]] = o
    ofertas = sorted(unicas.values(), key=lambda o: -o["descuento_pct"])

    resumen = {}
    for o in ofertas:
        resumen[o["tienda"]] = resumen.get(o["tienda"], 0) + 1

    salida = {
        "actualizado": ahora.isoformat(timespec="seconds"),
        "total": len(ofertas),
        "por_tienda": resumen,
        "errores": errores,
        "ofertas": ofertas,
    }

    if not ofertas:
        # mejor conservar los datos de ayer que publicar una lista vacía
        print("\n! No se obtuvo ninguna oferta: no se guarda nada.")
        sys.exit(1)

    CARPETA_DATOS.mkdir(exist_ok=True)
    (CARPETA_DATOS / "historico").mkdir(exist_ok=True)
    # compacto (sin espacios): la app lo descarga cada día
    texto = json.dumps(salida, ensure_ascii=False, separators=(",", ":"))
    (CARPETA_DATOS / "ofertas.json").write_text(texto, encoding="utf-8")
    (CARPETA_DATOS / "historico" / f"{ahora:%Y-%m-%d}.json").write_text(texto, encoding="utf-8")

    # copia para la app (la usa mientras no haya un servidor con los datos)
    assets_app = CARPETA_DATOS.parent / "app" / "assets"
    if assets_app.exists():
        (assets_app / "ofertas.json").write_text(texto, encoding="utf-8")

    print(f"\nListo: {len(ofertas)} ofertas únicas -> {CARPETA_DATOS / 'ofertas.json'}")
    for tienda, n in resumen.items():
        print(f"   {tienda}: {n}")
    if errores:
        print(f"   Fuentes con error: {', '.join(errores)}")


if __name__ == "__main__":
    main()
