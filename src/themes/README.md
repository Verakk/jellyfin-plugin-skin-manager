# Custom themes (hosted in this fork)

This folder holds **self-contained CSS themes authored in this repository** and
served to the plugin over the [jsDelivr](https://www.jsdelivr.com/) CDN. Unlike
the third-party skins in the catalog (which `@import` CSS from other people's
repos), these live here, so you fully control their quality and stability.

## How a theme reaches Jellyfin

```
src/themes/<theme>/theme.css   ──push──▶  GitHub (your fork, master)
        │
        ▼  served with the correct text/css MIME + CDN caching
https://cdn.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/<theme>/theme.css
        │
        ▼  referenced from skins-3.0.json  ("defaultCss": "@import url(...)")
The plugin's config page fetches the catalog and, on "Set Skin", inlines that
CSS into Jellyfin's branding → Custom CSS (no more remote @import at runtime).
```

Two hosts are involved on purpose:

- The **catalog JSON** is fetched by JavaScript, so it loads from
  `raw.githubusercontent.com/Verakk/...` (MIME doesn't matter for `fetch`).
- The **theme CSS** is loaded as a stylesheet, so it must come from a host that
  serves `text/css` — `raw.githubusercontent.com` sends `text/plain` and browsers
  refuse it. jsDelivr serves the right MIME **and** is a cached CDN, which also
  helps avoid flicker.

## Deploying / updating a theme

1. Edit the CSS here and commit + push to your fork's `master`.
2. jsDelivr caches branch URLs for up to 7 days. Force a refresh after a push:
   ```
   https://purge.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/jellyflix-netflix/theme.css
   ```
3. In Jellyfin: Dashboard → Skin Manager → pick the theme → **Set Skin**.
   The plugin re-fetches and re-inlines the CSS, so your latest push takes effect.

> **Note:** because the CSS is inlined into Custom CSS at "Set Skin" time, editing
> the theme does **not** auto-update servers that already applied it — users must
> click *Set Skin* again. This is the trade-off that removes the navigation flash.

## Changing the plugin itself

The catalog URL and the inline-import behaviour live in
`Jellyfin.Plugin.SkinManager/Configuration/configurationpage.html`. If you change
those you must rebuild and reinstall the DLL:

```sh
dotnet publish --configuration Release --output bin
# then copy bin/Jellyfin.Plugin.SkinManager.dll into <jellyfin-data>/plugins/SkinManager and restart
```

The catalog data (`skins-3.0.json`) is loaded at runtime, so **catalog-only**
changes need just a push + jsDelivr purge — no rebuild.

## Previews

`skins-3.0.json` entries may include a `previews` array of screenshot URLs. The
`JellyFlix — Netflix Edition` entry ships **without** previews on purpose (no
fabricated screenshots). After you apply the theme on your server, capture real
screenshots, drop them in `src/themes/jellyflix-netflix/img/`, push, and add:

```json
"previews": [
  { "name": "Login Page",     "url": "https://cdn.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/jellyflix-netflix/img/login.jpg" },
  { "name": "Home/Index Page", "url": "https://cdn.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/jellyflix-netflix/img/home.jpg" },
  { "name": "Library Page",    "url": "https://cdn.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/jellyflix-netflix/img/library.jpg" },
  { "name": "Title Page",      "url": "https://cdn.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/jellyflix-netflix/img/title.jpg" }
]
```

## Authoring notes for Jellyfin 10.10

- Stick to **colour, background, shadow, radius, font and hover transforms**.
  Avoid fixed heights/positions — those are what cause the "text overlaps /
  layout breaks" problems seen in older third-party skins on 10.10.
- Keep everything in one file with **no nested remote `@import`** and absolute
  asset URLs, so the inliner produces one clean, flicker-free stylesheet.
- Expose knobs as `:root` CSS variables and drive them from catalog `options`
  (colorPicker / selector) using the `$` placeholder — see the JellyFlix entry.
