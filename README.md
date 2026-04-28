# ASCII Art (Non-AI Edition)

Real-time ASCII camera renderer built entirely in the browser — no AI, no backend, no data collection.

---

## 🔥 Why This Project Exists

Most modern tools overcomplicate simple problems with AI pipelines.

This project does the opposite:

- No AI models
- No API calls
- No data leaving your device

Just pure client-side image processing.

---

## ⚡ Features

- Real-time camera → ASCII rendering
- Fully browser-based (offline capable)
- Zero external processing
- Lightweight and fast
- Adjustable detail and rendering modes
- Mobile-aware performance optimization

---

## 🧠 How It Works

1. Captures video from your camera
2. Processes frames using Canvas API
3. Converts brightness values into ASCII characters
4. Renders output in real time

See:
- [Architecture](docs/architecture.md)

---

## 🔐 Security

- No external API calls
- No data exfiltration
- No hidden tracking

Full review:
- [Security Documentation](docs/security.md)

---

## 📦 Dependencies

Minimal and controlled dependency set.

- React
- Vite
- TypeScript

See:
- [Dependencies & SBOM](docs/dependencies.md)

---

## ⚙️ Getting Started

### 1. Clone repo

```bash
git clone https://github.com/YOUR_USERNAME/ascii-art.git
cd ascii-art
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally
```
npm run dev
```

---

## 📱 Usage Tips

For better performance:
- Reduce detail on low-end devices
- Use grayscale mode
- Adjust font size

---

## 📄 Documentation

- Architecture → docs/architecture.md
- Security → docs/security.md
- Dependencies → docs/dependencies.md
- Operations → docs/operations.md

---

## ⚠️ Attribution

This project is derived from the original repository:
https://github.com/okaypranjul/Ascii-Yourself

Major changes:
- Removed AI-based processing
- Rebuilt as fully local, non-AI system
- Simplified architecture and improved transparency

---

## 🚀 Roadmap

- CLI version
- Image upload mode
- Export ASCII output
- Local asset bundling (no CDN)

---