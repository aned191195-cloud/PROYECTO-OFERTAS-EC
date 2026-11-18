# Reto: App de ofertas Ecuador

App móvil (Android + iPhone) con las ofertas del día de supermercados de Ecuador.
Después: restaurantes, bancos, ropa, tecnología.

## Estructura

```
RETO-OFERTAS-EC/
├─ recolector/            # Python: lee las webs y guarda las ofertas
│  ├─ recolectar.py       # programa principal
│  ├─ comun.py            # descarga, limpieza de precios y fechas
│  └─ fuentes/
│     ├─ favorita.py      # Supermaxi y Akí/Gran Akí
│     ├─ megamaxi.py      # Megamaxi (precios por admin-ajax, como su web)
│     ├─ magento.py       # Tía y Coral Hipermercados
│     ├─ frecuento.py     # Mi Comisariato (vía Frecuento.com)
│     └─ vtex.py          # Supermercados Santa María
├─ datos/
│  ├─ ofertas.json        # lo que leerá la app
│  └─ historico/          # una copia por día (para ver bajadas de precio)
└─ app/                   # (siguiente fase) app con Expo / React Native
```

## Cómo ejecutar

```bash
cd recolector
pip install -r requirements.txt
python recolectar.py
```

El recolector también copia los datos en `app/assets/ofertas.json` (copia de respaldo que va
dentro de la app, por si nunca ha podido descargar).

## Actualización automática (todos los días)

- `.github/workflows/recolectar.yml` ejecuta el recolector en GitHub **cada día a las 07:00
  de Ecuador** y guarda `datos/ofertas.json` y `datos/historico/` en el repositorio.
- Para lanzarlo a mano: pestaña **Actions** > *Recolectar ofertas* > **Run workflow**, o
  `gh workflow run recolectar.yml`.
- La app descarga `datos/ofertas.json` desde
  `raw.githubusercontent.com` al abrirse (y al deslizar hacia abajo) y lo guarda en el
  móvil (`app/almacen.js`). Sin internet muestra las últimas ofertas guardadas.

## Abrir la app en el móvil

1. Instala **Expo Go** en el móvil (Play Store o App Store).
2. En el ordenador:
   ```bash
   cd app
   npx expo start
   ```
3. Con el móvil en la **misma red Wi-Fi** que el ordenador, escanea el código QR que sale en la terminal
   (Android: desde Expo Go; iPhone: con la cámara).

Para verla en el navegador del ordenador: `npx expo start --web`.

## Fuentes (fase 1: supermercados)

| Tienda | Página | Notas |
|---|---|---|
| Supermaxi | supermaxi.com (portada, megadescuentos, maxicombos, multiplicador, categorías) | Trae fecha de validez y local de referencia |
| Megamaxi | megamaxi.com (mega-ofertas, megadescuentos, megapromo, promo-llantas) | Pocos productos; trae fecha de fin |
| Akí / Gran Akí | aki.com.ec | Igual que Supermaxi |
| Tía | tia.com.ec (portada) | Sin fecha de validez |
| Coral | coralhipermercados.com, "Descuentos del mes" > Comisariato | Solo la 1.ª página de cada categoría (su robots.txt no permite paginar) |
| Mi Comisariato | frecuento.com/categorias/mi-comisariato (API app.frecuento.com, promociones) | micomisariato.com solo tiene folletos; Frecuento es su tienda en línea |
| Santa María | supermercadosantamaria.com/ofertas (API pública de VTEX, colección 237) | Sin fecha de validez |

### Revisadas y descartadas (por ahora)

| Tienda | Motivo |
|---|---|
| Mini de Mi Comisariato | Solo folletos PDF hechos de imágenes (sin texto) y desactualizados |
| Tuti | "Precios bajos todos los días": no publica precio anterior, no hay descuento que mostrar |
| Del Portal | Catálogos en imagen; su robots.txt pide 60 s entre peticiones y máx. 3 por hora |

## Reglas que seguimos
- Respetar el `robots.txt` de cada web y esperar 1,5 s entre peticiones.
- Ejecutar como máximo 1–2 veces al día.
- Enlazar siempre al producto en la web original.
