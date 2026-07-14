# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Jellyfin server plugin that lets users browse, configure, and apply CSS "skins" (themes) to their Jellyfin web client. Targets **.NET 8.0** and `Jellyfin.Controller` 10.10.0.

## Build

```sh
dotnet publish --configuration Release --output bin
```

The output `bin/Jellyfin.Plugin.SkinManager.dll` must be copied into a `plugins/SkinManager` folder under the Jellyfin program data directory (e.g. `C:\ProgramData\Jellyfin\Server\plugins\SkinManager`), then Jellyfin restarted. `install.bat` does the publish + copy in one step (Windows, default install location only).

There is no test suite and no linter — this is a single small plugin project.

**Build dependency worth knowing:** [Jellyfin.Plugin.SkinManager.csproj](Jellyfin.Plugin.SkinManager/Jellyfin.Plugin.SkinManager.csproj) has a `<Reference>` to `MediaBrowser.Api.dll` with a hard-coded `HintPath` pointing at a local `Program Files\Jellyfin\Server\` install. Building on a machine without Jellyfin installed at that path will fail to resolve that reference.

## Architecture

The C# side is deliberately thin. **Almost all logic lives in embedded browser JavaScript**, not in .NET.

- [Plugin.cs](Jellyfin.Plugin.SkinManager/Plugin.cs) — `BasePlugin<PluginConfiguration>` + `IHasWebPages`. Its only job is registering embedded resources as dashboard pages via `GetPages()`. The plugin GUID `e9ca8b8e-ca6d-40e7-85dc-58e536df8eb3` is hard-coded here **and** duplicated as a string literal throughout the config page JS.
- [PluginConfiguration.cs](Jellyfin.Plugin.SkinManager/Configuration/PluginConfiguration.cs) — persists just two fields: `selectedSkin` (the chosen skin's `defaultCss`) and `options` (a flat `string[]` of alternating css-key / selected-value pairs).
- [Configuration/configurationpage.html](Jellyfin.Plugin.SkinManager/Configuration/configurationpage.html) — the real application. ~1900 lines of HTML + jQuery embedded as a resource. It fetches the skin catalog, renders the options UI, compiles CSS, and applies it.
- [Configuration/fontpicker.js](Jellyfin.Plugin.SkinManager/Configuration/fontpicker.js) — vendored jQuery FontPicker library (used by the `googleFonts` option type).

Embedded resources are declared in the `.csproj` `<EmbeddedResource>` items and referenced by namespace-qualified path in `Plugin.GetPages()`. If you add a resource, you must register it in **both** places.

### How a skin gets applied (the key flow)

This is the non-obvious core, spread across [configurationpage.html](Jellyfin.Plugin.SkinManager/Configuration/configurationpage.html):

1. `start()` fetches the skin catalog at runtime from a **hard-coded GitHub raw URL** (line ~50): `https://raw.githubusercontent.com/Verakk/jellyfin-plugin-skin-manager/master/skins-3.0.json` — this fork's `origin`. (Upstream `danieladov` is unrelated to what the plugin loads.) It also fetches the Google Fonts list from the Google Fonts API (with an embedded API key).
2. `loadSkins()` / `loadOptions()` render a `<select>` of skins plus a dynamic form of typed option controls per skin.
3. `createCss()` compiles the final stylesheet: it starts from the skin's `defaultCss` and appends each option's `css`, substituting the user's chosen value into the `$` placeholder (`replaceAll("$", value)`).
4. `setSkin()` runs the compiled CSS through `inlineImports()` — which fetches each remote `@import` and inlines the resolved CSS (rewriting relative `url()`/nested `@import` to absolute, with a fallback that leaves the `@import` if a fetch fails) — then writes the result into Jellyfin's **`branding` named configuration `CustomCss` field** via `ApiClient.updateNamedConfiguration("branding", ...)` and reloads. Inlining at apply-time is what removes the flash-of-unstyled-content on every navigation. It also calls `saveConfig()` to persist the selection into this plugin's own configuration.

**Consequence:** the skin is applied by hijacking Jellyfin's global Custom CSS (Dashboard → General → Custom CSS). The plugin does not have its own rendering path. Uninstalling the plugin does not by itself remove the applied CSS.

### The catalog is remote, not the local file

The `skins-3.0.json` the plugin loads is fetched over HTTP from the `master` branch of the **`Verakk` fork** (this repo's `origin`), **not** the local working copy. Editing the local file has no effect until it is committed and pushed to `origin/master`. "Adding a skin" is a data change to that JSON that goes live on push — no plugin rebuild needed. Changing anything in `configurationpage.html` (e.g. the catalog URL itself, or `inlineImports`) **does** require rebuilding and reinstalling the DLL.

### `src/themes/` — first-party themes hosted in this fork

Self-contained CSS themes authored in this repo live under [src/themes/](src/themes/) and are served to the plugin via the **jsDelivr CDN** (`https://cdn.jsdelivr.net/gh/Verakk/jellyfin-plugin-skin-manager@master/src/themes/<theme>/theme.css`). jsDelivr is used instead of `raw.githubusercontent.com` because the latter serves CSS as `text/plain`, which browsers refuse to apply as a stylesheet. See [src/themes/README.md](src/themes/README.md) for the full deploy/update flow (push → jsDelivr purge → Set Skin) and authoring rules for Jellyfin 10.10. `JellyFlix — Netflix Edition` in the catalog is the reference example, with tunable `:root` variables driven by catalog `options`.

## Skin catalog JSON format

Three schema generations exist in the repo root; only the newest is used by the current code:

- `skins.json` — v1, legacy. Flat `{ name, author, css }`.
- `skins-2.0.json` — v2, legacy. Adds a `versions[]` array per skin.
- `skins-3.0.json` — **current**. Each skin has `name`, `author`, `description`, `defaultCss`, `previews[]`, and `categories[]`. Each category has `options[]` of typed controls.

Option `type` values handled by the UI (`loadOptions`): `checkBox`, `colorPicker`, `number`, `selector`, `slider`, `googleFonts`, `blurSlider`. Each option's `css` string uses `$` as the substitution placeholder for the user-selected value (see README "JSON" section for per-type properties like `step`, `default`, and selector `selections[]`).

## `src/` — authoring assets, not shipped code

The top-level [src/](src/) directory is **not** compiled into the plugin. It holds theme-authoring resources: raw CSS snippets (`bgBlur.css`, `border-radius.css`), preview screenshots under `src/img/`, HTML mockups under `src/html/`, and `src/js/json__compile.js` (a standalone helper for generating skin JSON). Preview image URLs in the catalog point at the GitHub raw copies of these files.

## Caveats when editing

- `build.yaml` is stale boilerplate copied from another plugin (all its fields still say "TMDbBoxSets"). It does not describe this plugin.
- The GUID string is duplicated in many places; changing it means updating `Plugin.cs` and every literal in the config page JS.
- `PluginConfiguration` uses `selectedSkin`/`options`, but some older config-page handlers still reference a `selectedCss` field that doesn't exist on the model — dead/legacy code paths are present.
