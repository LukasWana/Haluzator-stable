import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputIcon = join(__dirname, 'assets', 'icon.png');
const outputDir = join(__dirname, 'assets');

// Definice všech potřebných ikon dlaždic pro Microsoft Store
const tileIcons = [
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'Wide310x150Logo.png', width: 310, height: 150 },
];

async function generateTileIcons() {
  // Ověření existence vstupní ikony
  if (!existsSync(inputIcon)) {
    console.error(`❌ Soubor ${inputIcon} nebyl nalezen!`);
    process.exit(1);
  }

  console.log(`📸 Načítám ikonu z: ${inputIcon}`);

  try {
    // Získání metadat pro ověření
    const metadata = await sharp(inputIcon).metadata();
    console.log(`✓ Ikona načtena: ${metadata.width}x${metadata.height}px, formát: ${metadata.format}`);

    // Generování všech ikon dlaždic
    for (const tile of tileIcons) {
      const outputPath = join(outputDir, tile.name);

      if ('size' in tile) {
        // Čtvercové ikony
        await sharp(inputIcon)
          .resize(tile.size, tile.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparentní pozadí
          })
          .png()
          .toFile(outputPath);
        console.log(`✓ Vytvořeno: ${tile.name} (${tile.size}x${tile.size}px)`);
      } else {
        // Široká ikona (Wide310x150Logo)
        await sharp(inputIcon)
          .resize(tile.width, tile.height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparentní pozadí
          })
          .png()
          .toFile(outputPath);
        console.log(`✓ Vytvořeno: ${tile.name} (${tile.width}x${tile.height}px)`);
      }
    }

    console.log('\n✅ Všechny ikony dlaždic byly úspěšně vygenerovány!');
    console.log(`📁 Umístění: ${outputDir}`);

  } catch (error) {
    console.error('❌ Chyba při generování ikon:', error);
    process.exit(1);
  }
}

generateTileIcons();


