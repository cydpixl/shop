ASHLAN SHOP

Live site: https://cydpixl.github.io/shop/
GitHub: https://github.com/cydpixl/shop

Static HTML, CSS and JavaScript. No build step or API key.
Serve locally with: python -m http.server 8765

Data: https://fortnite-api.com/v2/shop?language=en&responseFlags=7
Preview catalog: https://raw.githubusercontent.com/FNFestival/fnfestival.github.io/main/data/tracks.json
Audio streams from the preview URLs supplied by that catalog. Some tracks have no preview or may be unavailable in a region. No generated audio.
Cosmetic showcases use the YouTube ID supplied by Fortnite-API and load only on request. Missing media is explicitly labeled. YouTube may restrict individual embeds; the original video link remains available.

Features: live shop sections, filters for outfits/emotes/pickaxes/bundles/jam tracks/vehicles/instruments, search, price sort, local favorites, added-today view, UTC rotation countdown, bundle contents, item sharing, introduction/set/variants/history details, jam-track metadata and difficulty meters, persistent audio player, responsive layout, offline saved shop and installable PWA.

Publishing: GitHub Pages serves the main branch root. Push changes to main; no build system required. All application assets use relative URLs for the /shop/ path.

Favorites remain stored under the original key so existing saved offers are preserved on the same origin. Browser storage cannot automatically transfer between Cloudflare and GitHub domains.

Unofficial fan project. Not affiliated with Epic Games. Purchases happen in Fortnite.
