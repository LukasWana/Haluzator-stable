import { rmSync } from 'fs';

try {
  rmSync('release', { recursive: true, force: true });
  console.log('Release složka vyčištěna');
} catch (error) {
  // Ignoruj chyby pokud složka neexistuje
  if (error.code !== 'ENOENT') {
    console.error('Chyba při mazání release složky:', error.message);
  }
}



