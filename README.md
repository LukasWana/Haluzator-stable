<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Haluzator - Shader Sequencer

Real-time visual effects sequencer with WebGL shaders, audio reactivity, and HTML overlays.

## Features

- 🎨 100+ built-in shaders
- 🎵 Audio-reactive visuals
- 🎬 Sequencer with multiple pages
- 🖼️ HTML overlay support
- 🎮 MIDI support
- 💾 Session save/load
- 🖥️ Desktop app (Electron)

## Run Locally

**Prerequisites:** Node.js 18+

### Web Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key

3. Run the app:
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

### Electron Development

```bash
npm run electron:dev
```

## Build for Production

### Web Build
```bash
npm run build
```

### Desktop App (EXE/DMG/AppImage)

**Windows:**
```bash
npm run electron:build:win
```

**macOS:**
```bash
npm run electron:build:mac
```

**Linux:**
```bash
npm run electron:build:linux
```

See [BUILD.md](BUILD.md) for detailed build instructions.

## Testing

```bash
npm test              # Run tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
```
