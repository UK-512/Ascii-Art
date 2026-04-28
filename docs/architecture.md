# Architecture Overview

## Overview

This application is a browser-based ASCII renderer that converts live camera input into real-time ASCII visualization using client-side processing only.

- Runtime: Browser (no backend)
- Stack: React + TypeScript + Canvas API
- Build Tool: Vite

---

## Rendering Pipeline

1. **Camera Input**
   - Captured using `navigator.mediaDevices.getUserMedia`
   - Resolution fallback: 1080p → 720p → default

2. **Frame Processing**
   - Frame drawn to an off-screen canvas
   - Pixel data extracted for processing

3. **Image Transformation**
   - Luminance calculation
   - Edge detection (local contrast)
   - Auto-leveling and normalization
   - Contrast and brightness adjustment
   - Optional dithering

4. **ASCII Mapping**
   - Brightness mapped to character set
   - Charset configurable (dense → sparse)

5. **Rendering**
   - ASCII output rendered to visible canvas

---

## Performance Considerations

- Adaptive workload based on device capability
- Reduced resolution and detail on mobile devices
- Real-time processing optimized for browser execution