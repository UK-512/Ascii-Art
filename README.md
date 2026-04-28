# ASCII Art (v1.1)

Real-time camera-to-ASCII renderer with local processing only.

## Prerequisites

- Node.js 18+ (recommended: Node.js 20 LTS)
- npm 9+
- Camera permission in browser
- Secure context for camera access:
  - `http://localhost` for local development, or
  - `https://` in deployed environments

## Setup

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Open the local URL shown by Vite (typically `http://localhost:3000`)
4. Allow camera access when prompted

## Build and Preview

1. Production build:
   - `npm run build`
2. Preview build locally:
   - `npm run preview`

## Desktop Packaging (Electron)

This project supports desktop builds for Windows and Linux.

1. Build Windows installer (`.exe`):
   - `npm run pack:win`
2. Build Linux packages (`.AppImage` and `.deb`):
   - `npm run pack:linux`
3. Build both:
   - `npm run pack:all`

Artifacts are written to:

- `release/ASCII Art Setup 1.1.0.exe` (Windows NSIS installer, per-user/no admin)
- `release/ASCII Art-1.1.0.AppImage` (Linux portable, no install required)
- `release/ascii-art_1.1.0_amd64.deb` (Linux Debian package)

Notes:

- Windows installer is configured for local-user install (`perMachine: false`).
- On Linux, `AppImage` is the no-admin option.

## Usage

- Use the control panel to adjust:
  - `FONT SIZE`
  - `GAIN`
  - `CONTRAST`
  - `DETAIL`
  - `MODE`
  - `CHARSET`
- Use the camera icon to save the current ASCII frame as PNG.

## Security Notes

- No AI inference or cloud analysis is used.
- Rendering pipeline runs fully in-browser.
- See [KB.md](./KB.md) for backdoor review, SBOM summary, and hardening notes.

## Troubleshooting

- `Unable to access camera`:
  - Confirm browser permission is allowed.
  - Confirm you are on `localhost` or `https`.
  - Close other apps using the camera.
- Low FPS on mobile:
  - Increase `FONT SIZE`.
  - Lower `DETAIL`.
  - Use `bw` mode.

## Attribution
This project is derived from the original [Ascii-Yourself repository](https://github.com/okaypranjul/Ascii-Yourself.git).

## Changes
- Removed AI dependencies
- Rebuilt as a non-AI offline tool
- Simplified architecture