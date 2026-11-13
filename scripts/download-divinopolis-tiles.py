#!/usr/bin/env python3
import os
import time
import math
import urllib.request
import urllib.error

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

# Generous bounding box for Divinópolis and its surrounding industrial & residential districts:
# Center: -20.1446, -44.8912
# Bounds:
# Lat: -20.08 to -20.21
# Lng: -44.96 to -44.81
MIN_LAT, MAX_LAT = -20.21, -20.08
MIN_LNG, MAX_LNG = -44.96, -44.81

TILES_DIR = '/opt/ronda-pro-elite-v3/assets/tiles'
HEADERS = {
    'User-Agent': 'RondaPro-TileSeeder/2.3.0 (Divinopolis offline patrol cache; https://maxvel.hzsys.tech)'
}

# Zooms: 12 (overview), 13 (citywide), 14 (districts), 15 (neighborhoods), 16 (streets around patrol route)
def get_target_tiles():
    targets = []
    # Zooms 12 to 15: full Divinópolis bounding box with generous margin
    for z in [12, 13, 14, 15]:
        x1, y1 = deg2num(MAX_LAT, MIN_LNG, z)
        x2, y2 = deg2num(MIN_LAT, MAX_LNG, z)
        x_min, x_max = min(x1, x2), max(x1, x2)
        y_min, y_max = min(y1, y2), max(y1, y2)
        for x in range(x_min, x_max + 1):
            for y in range(y_min, y_max + 1):
                targets.append((z, x, y))
    
    # Zoom 16: core patrol routes and city center (-20.16 to -20.12, -44.92 to -44.85)
    z = 16
    x1, y1 = deg2num(-20.12, -44.92, z)
    x2, y2 = deg2num(-20.16, -44.85, z)
    x_min, x_max = min(x1, x2), max(x1, x2)
    y_min, y_max = min(y1, y2), max(y1, y2)
    for x in range(x_min, x_max + 1):
        for y in range(y_min, y_max + 1):
            targets.append((z, x, y))

    return targets

def main():
    raise SystemExit(
        "BLOQUEADO PELA POLÍTICA DE TILES (OSM Tile Usage Policy): "
        "Downloads em massa (bulk scraping) de tile.openstreetmap.org são proibidos e geram imagens PNG de 6725 bytes '403 Access blocked'. "
        "Use carregamento sob demanda com cache orgânico ou provedor comercial homologado."
    )
    downloaded = 0
    skipped = 0
    failed = 0

    for z, x, y in targets:
        tile_path = os.path.join(TILES_DIR, str(z), str(x), f"{y}.png")
        if os.path.exists(tile_path) and os.path.getsize(tile_path) > 100:
            skipped += 1
            continue

        os.makedirs(os.path.dirname(tile_path), exist_ok=True)
        url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        req = urllib.request.Request(url, headers=HEADERS)

        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 100:
                        with open(tile_path, 'wb') as f:
                            f.write(data)
                        downloaded += 1
                        if downloaded % 20 == 0:
                            print(f"Downloaded {downloaded} tiles... (currently at z={z}, x={x}, y={y})")
                        time.sleep(0.08)  # Polite pacing
                    else:
                        failed += 1
                else:
                    failed += 1
        except Exception as e:
            failed += 1

    print(f"Done! Downloaded: {downloaded}, Already cached: {skipped}, Failed: {failed}")

if __name__ == '__main__':
    main()
