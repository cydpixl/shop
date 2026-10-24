ASHLAN SHOP

Live site: https://cydpixl.github.io/shop/
GitHub: https://github.com/cydpixl/shop

Static HTML, CSS and JavaScript. No build step or API key.
Serve locally with: python -m http.server 8767

Data: https://fortnite-api.com/v2/shop?language=en&responseFlags=7
Preview catalog: https://raw.githubusercontent.com/FNFestival/fnfestival.github.io/main/data/tracks.json
Audio starts when a track is opened and streams from the preview URLs supplied by that catalog. Some tracks have no preview or may be unavailable in a region. No generated audio.
Cosmetic showcases use the YouTube ID supplied by Fortnite-API and start automatically when an item is opened. Missing media is explicitly labeled. YouTube may restrict individual embeds; the original video link remains available.

Features: live shop sections, filters for outfits/emotes/pickaxes/bundles/jam tracks/vehicles/instruments, search, price sort, local favorites, added-today view, UTC rotation countdown, bundle contents, item sharing, introduction/set/variants/history details, jam-track metadata and difficulty meters, persistent audio player, responsive layout, offline saved shop and installable PWA.

Publishing: GitHub Pages serves the main branch root. Push changes to main; no build system required. All application assets use relative URLs for the /shop/ path.

Favorites remain stored under the original key so existing saved offers are preserved on the same origin. Browser storage cannot automatically transfer between Cloudflare and GitHub domains.

Unofficial fan project. Not affiliated with Epic Games. Demo purchases only affect this site.


FORTNITE-STYLE SANDBOX UPDATE
- Layout and typography referenced against the current official Fortnite web Item Shop and V-Bucks pages on 2026-10-23 (America/New_York).
- Local wallet: free 800 / 2,400 / 4,500 / 12,500 demo V-Bucks packs. Reference US prices: $8.99 / $22.99 / $36.99 / $89.99. No real payment or Epic connection.
- Purchases use the current API-listed V-Bucks price, deduct only the local demo balance, and persist in My Locker. Bundle contents count as owned across matching offers.
- No API key is used. Library, latest additions, unconfirmed unreleased candidates, news, map and playlists remain available.
- Keyless catalog endpoint: /v2/cosmetics?responseFlags=6. New items: /v2/cosmetics/new. News: /v2/news. Map: /v1/map. Modes: /v1/playlists.
- Thirty-four cosmetics have official animated WebM previews, including Day-o with audio and several rotating outfits. These are rendered animations, not interactive 3D models. Other previews use artwork and supplied YouTube showcases. The separate 3D API endpoint returned 401 without a key, so it is not integrated.
- Reference artwork and HeadingNow font are in assets/. Source URLs: https://www.fortnite.com/item-shop and https://www.fortnite.com/item-shop/v-bucks . All trademarks and artwork belong to their respective owners. This is an unofficial fan sandbox.
- Run validation: node --test tests/wallet.test.cjs

PLAYBACK AND FILTER UPDATE
- Official videos autoplay without native control overlays; Jam Track playback uses custom pause/play, seek, mute and volume controls. Browser-blocked audio offers an Enable sound action.
- Shop filters combine item category, section, rarity/series, V-Bucks price range, owned/unowned, new/sale status and preview type. Sorting includes price, name and leaving soon.
- Cosmetic Library supports category, type, rarity/series and name/date sorting with search.
