<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Haluzator

**A Vibecode Project**

Live VJ application for creating and performing visual effects using shaders, media, and real-time sequencing.

🌐 **Website:** [haluzator.eu](https://haluzator.eu)

## Features

### 🎨 Shader Library
- **150+ built-in shaders** - Pre-made visual effects including particles, abstract patterns, and color effects
- **Custom shaders** - Create your own effects using GLSL code
- **Shader previews** - Visual previews for all shaders

### 📚 Media Library
- **Images** - Import and use images in your visuals
- **Videos** - Add video files and combine them with effects
- **3D Models** - Import OBJ files and display 3D models
- **HTML Overlays** - Add custom HTML/CSS/JavaScript for text, animations, and interactive elements

### 🎛️ Sequencer
- **Multi-page sequencing** - Create up to 8 different sequence pages
- **Flexible step counts** - 4, 8, 16, 32, or 64 steps per page
- **Dual tracks** - Separate tracks for shaders and media
- **Loop control** - Set loop start/end points and shift loops
- **Live VJing** - Trigger steps instantly with keyboard shortcuts (Q, W, E, R, T, Y, U, I)

### 🎚️ Real-time Controls
- **Tempo** - Control playback speed
- **Audio influence** - React to audio input
- **Visual effects** - Blur, glow, chroma, hue shift, mandala effects
- **Color grading** - Shadows, midtones, highlights, saturation
- **Animation** - Speed, zoom, particles

### 🖥️ Projection Mode
- **Dual monitor support** - Output to second display or projector
- **Fullscreen mode** - Full screen presentation
- **Projection window** - Dedicated projection output

### 🎹 MIDI Support
- Connect MIDI devices (keyboards, controllers) to control the application

### 💾 Session Management
- **Save/Load sessions** - Save your complete setup including sequences, media, and settings
- **Session files** - Export and import project files

### ⌨️ Keyboard Shortcuts
- `Spacebar` - Play/Pause
- `Enter` - Set selected item to current step
- `←` / `→` - Navigate between steps
- `1-8` - Switch to page 1-8
- `Q, W, E, R, T, Y, U, I` - Live trigger steps 1-8
- `A/S, D/F, G/H, J/K, L/;` - Control effects

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

## Build

Build for Windows:
```bash
npm run build:win
```

Build portable version:
```bash
npm run build:win:portable
```

Build for macOS:
```bash
npm run build:mac
```

Build for Linux:
```bash
npm run build:linux
```

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D graphics and WebGL
- **Electron** - Desktop application
- **Vite** - Build tool

## License

See LICENSE file for details.

---

**Vibecode Project** | [haluzator.eu](https://haluzator.eu)
