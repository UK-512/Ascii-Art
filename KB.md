# ASCII Art Knowledge Base (v1.1)

## 1. Project Summary

ASCII Art is a local, browser-based camera renderer that converts live video frames into ASCII text visualization in real time.

- Runtime: Browser only (React + Canvas API)
- Build tool: Vite
- Language: TypeScript
- Camera input: `navigator.mediaDevices.getUserMedia`

## 2. Backdoor/Security Review

### 2.1 Scope Reviewed

All first-party source files were reviewed:

- `App.tsx`
- `index.tsx`
- `index.html`
- `types.ts`
- `vite.config.ts`
- `components/*`
- `utils/*`
- `metadata.json`
- `README.md`
- `package.json`
- `package-lock.json`

Excluded from source-code review:

- `node_modules/` (third-party managed dependencies)
- `dist/` (build output artifacts)

### 2.2 Checks Performed

- Searched for dynamic code execution:
  - `eval`, `Function`, `new Function`, `dangerouslySetInnerHTML`
- Searched for suspicious outbound channels:
  - `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `postMessage`
- Searched for hidden credential/key usage:
  - `API_KEY`, `token`, `secret`, `password`, `auth`
- Reviewed camera/audio/canvas flow for hidden exfiltration behavior.
- Removed unnecessary external import map from `index.html` (remote module loading surface).
- Removed unknown metadata keys from `metadata.json`.
- Attempted `npm audit --omit=dev` (blocked in this environment due no network access).

### 2.3 Findings

- No explicit backdoor logic found in first-party source code.
- No hidden credential exfiltration logic found.
- No remote AI/service pipeline present.

### 2.4 Changes Made During Audit

- Removed `index.html` `importmap` referencing `esm.sh`.
- Removed extraneous metadata keys (`y7`, `Yp`).
- Kept runtime external assets:
  - Tailwind CDN script
  - Google Fonts stylesheet

These are not backdoors but external supply-chain dependencies. If strict offline/trusted-only execution is required, replace them with locally hosted assets.

## 3. Architecture Overview

### 3.1 Rendering Pipeline

1. Acquire camera stream using fallback profiles (1080p -> 720p -> basic).
2. Draw frame to hidden canvas.
3. Compute luminance + local edge features.
4. Apply auto-leveling, sharpening, contrast/brightness, and dithering.
5. Map brightness to glyphs using selected charset.
6. Render ASCII output to visible canvas.

### 3.2 Device Compatibility

- Mobile-aware defaults are applied at startup.
- Processing workload is capped based on device class.
- Camera constraints fall back progressively for broader support.

## 4. SBOM Summary

### 4.1 Primary Components

- Name: `ascii-art`
- Version: `1.1.0`
- Ecosystem: npm

### 4.2 Direct Dependencies (Runtime)

- `react@19.2.5`
- `react-dom@19.2.5`
- `lucide-react@0.563.0`

### 4.3 Direct Dependencies (Development)

- `vite@6.4.2`
- `@vitejs/plugin-react@5.2.0`
- `typescript@5.8.3`
- `@types/node@22.19.17`

### 4.4 Dependency Tree Size

- Installed transitive package nodes: `173`
- Source of truth:
  - `package-lock.json`
  - `npm ls --depth=0`
  - `npm ls --all --json`

### 4.5 SBOM Artifact

- Machine-readable dependency snapshot:
  - `sbom.npm-ls.json` (generated from `npm ls --all --json`)

## 5. Versioning

Updated to v1.1:

- UI header label: `v1.1`
- npm package version: `1.1.0`

## 6. Operational Notes

- Camera access requires browser permission and secure context (`localhost`/`https`).
- For mobile performance:
  - Increase `FONT SIZE`
  - Reduce `DETAIL`
  - Use `bw` mode

## 7. Recommended Hardening (Optional)

- Host Tailwind and fonts locally (remove external CDN calls).
- Add CI checks:
  - `npm audit`
  - static grep rules for dangerous APIs
- Pin dependency versions and periodically refresh with review.
