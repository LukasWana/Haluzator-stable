# Electron Build Instructions

## Development

Pro spuštění aplikace v Electronu v development módu:

```bash
npm run electron:dev
```

Tento příkaz:
1. Spustí Vite dev server na portu 3000
2. Počká, až bude server připraven
3. Spustí Electron aplikaci, která se připojí k dev serveru

## Production Build

### Windows (EXE)

```bash
npm run electron:build:win
```

Vytvoří:
- `release/Haluzator Setup X.X.X.exe` - NSIS installer
- `release/Haluzator X.X.X.exe` - Portable verze (spustitelná bez instalace)

### macOS (DMG)

```bash
npm run electron:build:mac
```

### Linux

```bash
npm run electron:build:linux
```

Vytvoří AppImage a DEB balíčky.

## Build Configuration

Konfigurace je v `package.json` v sekci `build`. Můžete upravit:
- `appId` - unikátní ID aplikace
- `productName` - název aplikace
- `icon` - cesta k ikoně (potřebujete vytvořit ikony v `build/` složce)
- `files` - které soubory zahrnout do buildu

## Ikony

Pro vytvoření ikon:
- Windows: `build/icon.ico` (256x256 nebo větší)
- macOS: `build/icon.icns` (512x512 nebo větší)
- Linux: `build/icon.png` (512x512 nebo větší)

Můžete použít nástroje jako:
- [Electron Icon Maker](https://www.electron.build/icons)
- Online konvertory ICO/ICNS

## Poznámky

- První build může trvat déle, protože stahuje Electron binárky
- Build soubory budou v `release/` složce
- Pro distribuci použijte NSIS installer (Windows) nebo DMG (macOS)

