# Build Instructions for Haluzator

## Development Mode

### Web Development
```bash
npm run dev
```
Spustí aplikaci na http://localhost:3000

### Electron Development
```bash
npm run electron:dev
```
Spustí aplikaci v Electronu připojenou k Vite dev serveru.

## Production Build

### Web Build
```bash
npm run build
```
Vytvoří produkční build v `dist/` složce.

### Electron Build (Windows EXE)

```bash
npm run electron:build:win
```

Vytvoří:
- **NSIS Installer**: `release/Haluzator Setup 1.0.0.exe` - Instalační soubor
- **Portable**: `release/Haluzator 1.0.0.exe` - Spustitelná verze bez instalace

### Electron Build (macOS DMG)

```bash
npm run electron:build:mac
```

Vytvoří DMG soubor v `release/` složce.

### Electron Build (Linux)

```bash
npm run electron:build:linux
```

Vytvoří AppImage a DEB balíčky.

## Ikony

Pro vytvoření ikon aplikace vytvořte soubory v `build/` složce:

- **Windows**: `build/icon.ico` (256x256 nebo větší, ICO formát)
- **macOS**: `build/icon.icns` (512x512 nebo větší, ICNS formát)
- **Linux**: `build/icon.png` (512x512 nebo větší, PNG formát)

Můžete použít online nástroje:
- [CloudConvert](https://cloudconvert.com/) - konverze mezi formáty
- [ICO Convert](https://icoconvert.com/) - vytvoření ICO souborů
- [Image2icon](http://www.img2icnsapp.com/) - vytvoření ICNS souborů

Pokud ikony nevytvoříte, Electron použije výchozí ikonu.

## První Build

První build může trvat déle, protože:
1. Stahuje Electron binárky (~100-150 MB)
2. Kompiluje všechny závislosti
3. Vytváří instalační balíčky

## Distribuce

### Windows
- **NSIS Installer** - doporučeno pro distribuci (umožňuje uživatelům vybrat instalační složku)
- **Portable** - pro uživatele, kteří nechtějí instalovat

### macOS
- **DMG** - standardní formát pro macOS distribuci

### Linux
- **AppImage** - univerzální, spustitelný bez instalace
- **DEB** - pro Debian/Ubuntu distribuce

## Troubleshooting

### Build selže s chybou o ikonách
- Vytvořte ikony v `build/` složce nebo dočasně odstraňte `icon` z `package.json` build konfigurace

### Aplikace se nespustí v Electronu
- Zkontrolujte, že `dist/` složka existuje (spusťte `npm run build` nejdřív)
- Zkontrolujte konzoli v Electronu (DevTools se otevře automaticky v dev módu)

### Media soubory se nenačítají
- Ujistěte se, že `media/` složka je v `extraResources` v `package.json`
- V Electronu jsou soubory v `resources/media/` relativně k aplikaci

## Build Output

Všechny build soubory jsou v `release/` složce:
```
release/
├── Haluzator Setup 1.0.0.exe    # Windows installer
├── Haluzator 1.0.0.exe          # Windows portable
├── Haluzator-1.0.0.dmg          # macOS
├── Haluzator-1.0.0.AppImage     # Linux AppImage
└── haluzator_1.0.0_amd64.deb    # Linux DEB
```

