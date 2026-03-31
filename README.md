# Dreamcatcher Obsidian Plugin

Dreamcatcher brings the color-based dream capture mechanic from this repo into Obsidian.

## What It Does

- Press, drag, and release in a capture field.
- Converts horizontal movement into hue and vertical movement into intensity.
- Suggests dream anchors from emotion hue, intensity peak, and duration.
- Saves each capture as a markdown note with frontmatter in your vault.

## Project Structure

- `src/main.ts`: Plugin code and Dreamcatcher modal UI.
- `styles.css`: Modal visuals.
- `manifest.json`: Obsidian plugin manifest.
- `versions.json`: Version compatibility map.
- `esbuild.config.mjs`: Build script.

## Build

```bash
npm install
npm run build
```

This produces `main.js` in this folder.

## Prebuilt Package (Recommended)

Build a ready-to-install package with one command:

```bash
npm install
npm run build:release
```

This generates:

- `release/dreamcatcher-plugin-<version>.zip`
- `release/dreamcatcher-plugin-<version>/`
- `release/latest/`

Each output contains the install files:

- `main.js`
- `manifest.json`
- `styles.css`

The repository also includes a GitHub Actions workflow at `.github/workflows/release.yml` that builds and publishes the zip on tags like `v0.1.0`.

## Install In Obsidian (Developer Mode)

1. Use prebuilt files from `release/latest/` (or run `npm run build:release` first).
2. Copy these files into your vault plugin folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Destination path in your vault:
   - `.obsidian/plugins/dreamcatcher-plugin/`
4. Enable Community Plugins and enable Dreamcatcher.

## Install From GitHub Repo (BRAT)

1. Install the BRAT plugin in Obsidian.
2. In BRAT, choose "Add a beta plugin".
3. Enter this repository URL.
4. BRAT installs and updates Dreamcatcher from this repo using the prebuilt plugin files.

## Usage

- Open command palette and run: Open Dreamcatcher.
- Or click the Dreamcatcher ribbon icon.
- Press, drag, release.
- Pick or edit the suggested anchor.
- Save dream to create a note in the configured folder.

## Settings

- Capture folder: Where notes are created.
- Device name: Stored in capture context metadata.
