# Plán migrace na IndexedDB pro videa

## 📋 Současný stav

### Jak se videa aktuálně ukládají:
1. **V paměti**: File objekty + HTMLVideoElement + Blob URL
2. **V session souborech**: Base64 data URL v JSON (neefektivní, ~33% větší)
3. **Limit**: ~2 GB celkem v paměti

### Problémy:
- ❌ Všechna videa v paměti najednou
- ❌ Base64 serializace je neefektivní
- ❌ Při ukládání session: všechna videa se převádějí na base64 najednou
- ❌ Limit ~2 GB způsobuje pády při větších videích

## 🎯 Cílová architektura

### Nová struktura:
1. **IndexedDB**: Videa jako Blob objekty (binární, efektivní)
2. **V paměti**: Pouze metadata + lazy loading video elementů
3. **Session soubory**: Pouze reference (ID) místo base64

### Výhody:
- ✅ Videa na disku, ne v paměti
- ✅ Lazy loading - načítání pouze když je potřeba
- ✅ Kapacita: stovky GB
- ✅ Efektivní ukládání (binární místo base64)

## 📐 Nová datová struktura

### UserVideo typ (nový):
```typescript
export type UserVideo = {
  videoId: string;              // ID v IndexedDB
  fileName: string;             // Původní název souboru
  fileType: string;            // MIME type
  size: number;                 // Velikost v bajtech
  objectURL?: string;           // Blob URL (lazy loaded)
  element?: HTMLVideoElement;   // Video element (lazy loaded)
  loaded: boolean;              // Zda je video načteno v paměti
};
```

### IndexedDB struktura:
```
Database: "HaluzatorVideos"
  Version: 1
  Object Store: "videos"
    Key: videoId (string)
    Value: {
      blob: Blob,           // Video soubor
      fileName: string,
      fileType: string,
      uploadedAt: number,   // timestamp
      size: number
    }
```

## 🔄 Migrační strategie

### Fáze 1: Příprava (bez breaking changes)
- [x] Vytvořit IndexedDB wrapper utility
- [ ] Přidat nové typy (zpětná kompatibilita)
- [ ] Implementovat migrační funkce

### Fáze 2: Hybridní režim (obě metody současně)
- [ ] Ukládat nová videa do IndexedDB
- [ ] Stará videa stále v paměti
- [ ] Session soubory: podpora obou formátů

### Fáze 3: Migrace existujících dat
- [ ] Automatická migrace při načtení session
- [ ] Migrace starých videí z paměti do IndexedDB
- [ ] Čištění starých dat

### Fáze 4: Plný přechod
- [ ] Odstranit starý kód
- [ ] Pouze IndexedDB
- [ ] Optimalizace

## 📝 Detailní implementační plán

### Krok 1: IndexedDB Utility (`utils/indexedDB.ts`)

**Funkce:**
- `initVideoDB()` - inicializace databáze
- `saveVideo(videoId, file)` - uložení videa
- `getVideo(videoId)` - načtení videa
- `deleteVideo(videoId)` - smazání videa
- `listVideos()` - seznam všech videí
- `migrateVideoToIndexedDB(file)` - migrace File → IndexedDB

**API:**
```typescript
export const videoDB = {
  init: () => Promise<void>,
  save: (videoId: string, file: File) => Promise<void>,
  get: (videoId: string) => Promise<Blob | null>,
  delete: (videoId: string) => Promise<void>,
  list: () => Promise<string[]>,
  exists: (videoId: string) => Promise<boolean>
};
```

### Krok 2: Upravit typy (`types.ts`)

**Změny:**
- Rozšířit `UserVideo` o nová pole
- Přidat flag pro zpětnou kompatibilitu
- Nový typ `VideoMetadata` pro metadata

```typescript
// Starý typ (pro zpětnou kompatibilitu)
export type UserVideoLegacy = {
  objectURL: string;
  element: HTMLVideoElement;
  file: File
};

// Nový typ
export type UserVideo = {
  videoId: string;
  fileName: string;
  fileType: string;
  size: number;
  objectURL?: string;
  element?: HTMLVideoElement;
  loaded: boolean;
  // Pro zpětnou kompatibilitu
  _legacy?: UserVideoLegacy;
};
```

### Krok 3: Video Manager (`utils/videoManager.ts`)

**Funkce:**
- `loadVideo(videoId)` - lazy loading videa z IndexedDB
- `unloadVideo(videoId)` - uvolnění z paměti
- `createVideoElement(blob)` - vytvoření video elementu
- `isVideoLoaded(videoId)` - kontrola zda je načteno

**API:**
```typescript
export const videoManager = {
  load: (video: UserVideo) => Promise<HTMLVideoElement>,
  unload: (video: UserVideo) => void,
  isLoaded: (video: UserVideo) => boolean,
  preload: (videoIds: string[]) => Promise<void>
};
```

### Krok 4: Upravit LibraryContext (`contexts/LibraryContext.tsx`)

**Změny v `saveMedia()`:**
```typescript
// Před:
videoUpdates[name] = { objectURL, element: videoElement, file: file };

// Po:
const videoId = generateVideoId(name);
await videoDB.save(videoId, file);
videoUpdates[name] = {
  videoId,
  fileName: file.name,
  fileType: file.type,
  size: file.size,
  loaded: false
};
```

**Změny v `deleteMedia()`:**
```typescript
// Před:
URL.revokeObjectURL(newVideos[key].objectURL);

// Po:
await videoDB.delete(userVideos[key].videoId);
if (userVideos[key].objectURL) {
  URL.revokeObjectURL(userVideos[key].objectURL);
}
```

### Krok 5: Upravit SessionContext (`contexts/SessionContext.tsx`)

**Změny v `handleSaveSession()`:**
```typescript
// Před:
const serializableVideos = await Promise.all(
  Object.entries(userVideos).map(async ([key, video]) => {
    return [key, { dataUrl: await fileToDataUrl(video.file), fileName: video.file.name }];
  })
);

// Po:
const serializableVideos = Object.entries(userVideos).map(([key, video]) => {
  return [key, {
    videoId: video.videoId,  // Pouze reference!
    fileName: video.fileName,
    fileType: video.fileType,
    size: video.size
  }];
});
```

**Změny v `loadSessionData()`:**
```typescript
// Před:
const videoFile = await dataUrlToFile(savedVideo.dataUrl, savedVideo.fileName);
const objectURL = URL.createObjectURL(videoFile);
const videoElement = document.createElement('video');
videoElement.src = objectURL;
newVideos[key] = { objectURL, element: videoElement, file: videoFile };

// Po:
// Podpora obou formátů (starý base64 + nový videoId)
if (savedVideo.videoId) {
  // Nový formát
  newVideos[key] = {
    videoId: savedVideo.videoId,
    fileName: savedVideo.fileName,
    fileType: savedVideo.fileType,
    size: savedVideo.size,
    loaded: false
  };
} else if (savedVideo.dataUrl) {
  // Starý formát - migrace
  const videoFile = await dataUrlToFile(savedVideo.dataUrl, savedVideo.fileName);
  const videoId = generateVideoId(key);
  await videoDB.save(videoId, videoFile);
  newVideos[key] = {
    videoId,
    fileName: savedVideo.fileName,
    fileType: videoFile.type,
    size: videoFile.size,
    loaded: false
  };
}
```

### Krok 6: Lazy loading v useWebGL (`hooks/useWebGL.ts`)

**Změny:**
```typescript
// Před:
const videoInfo = propsRef.current.userVideos[key!];
if (videoInfo && videoInfo.element.readyState >= videoInfo.element.HAVE_METADATA) {
  // render
}

// Po:
const videoInfo = propsRef.current.userVideos[key!];
if (videoInfo) {
  // Lazy load pokud není načteno
  if (!videoInfo.loaded) {
    await videoManager.load(videoInfo);
  }
  if (videoInfo.element && videoInfo.element.readyState >= videoInfo.element.HAVE_METADATA) {
    // render
  }
}
```

### Krok 7: Lazy loading v Sequencer (`contexts/SequencerAndPlaybackProvider.tsx`)

**Změny:**
```typescript
// Před:
const videoInfo = currentMediaKey ? userVideos[currentMediaKey] : null;
const videoElement = videoInfo?.element;

// Po:
const videoInfo = currentMediaKey ? userVideos[currentMediaKey] : null;
if (videoInfo && !videoInfo.loaded) {
  await videoManager.load(videoInfo);
}
const videoElement = videoInfo?.element;
```

### Krok 8: Migrace existujících dat

**Funkce `migrateLegacyVideos()`:**
```typescript
export const migrateLegacyVideos = async (legacyVideos: UserVideosLegacy) => {
  const migrated: UserVideos = {};

  for (const [key, legacyVideo] of Object.entries(legacyVideos)) {
    if (legacyVideo.file) {
      const videoId = generateVideoId(key);
      await videoDB.save(videoId, legacyVideo.file);
      migrated[key] = {
        videoId,
        fileName: legacyVideo.file.name,
        fileType: legacyVideo.file.type,
        size: legacyVideo.file.size,
        loaded: false
      };
      // Uvolnit staré URL
      URL.revokeObjectURL(legacyVideo.objectURL);
    }
  }

  return migrated;
};
```

## 🔧 Technické detaily

### Generování Video ID:
```typescript
const generateVideoId = (name: string): string => {
  return `video_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
```

### Verze Session souboru:
- Aktuální: `SESSION_FILE_VERSION = 19`
- Nová: `SESSION_FILE_VERSION = 20` (podpora videoId)

### IndexedDB verze:
- Počáteční: `1`
- Možné upgrady: přidání indexů, změna struktury

## ✅ Checklist implementace

### Fáze 1: Základní infrastruktura
- [ ] Vytvořit `utils/indexedDB.ts` s videoDB API
- [ ] Vytvořit `utils/videoManager.ts` pro lazy loading
- [ ] Upravit typy v `types.ts` (zpětná kompatibilita)
- [ ] Přidat konstanty pro verze

### Fáze 2: Integrace do LibraryContext
- [ ] Upravit `saveMedia()` - ukládání do IndexedDB
- [ ] Upravit `deleteMedia()` - mazání z IndexedDB
- [ ] Přidat migrační funkci pro stará videa
- [ ] Testovat ukládání/mazání

### Fáze 3: Integrace do SessionContext
- [ ] Upravit `handleSaveSession()` - pouze reference
- [ ] Upravit `loadSessionData()` - podpora obou formátů
- [ ] Automatická migrace starých session souborů
- [ ] Testovat ukládání/načítání session

### Fáze 4: Lazy loading
- [ ] Upravit `useWebGL.ts` - lazy loading při renderování
- [ ] Upravit `SequencerAndPlaybackProvider.tsx` - lazy loading při přehrávání
- [ ] Upravit `LibraryTab.tsx` - lazy loading pro preview
- [ ] Upravit `SequencerStep.tsx` - lazy loading pro thumbnail
- [ ] Testovat lazy loading

### Fáze 5: Optimalizace a cleanup
- [ ] Implementovat preloading pro aktivní videa
- [ ] Implementovat cleanup - uvolnění nepoužívaných videí
- [ ] Přidat error handling
- [ ] Přidat progress indikátory při načítání
- [ ] Testovat s velkými videi

### Fáze 6: Migrace a cleanup
- [ ] Migrace existujících videí při startu aplikace
- [ ] Odstranit starý kód (base64 serializace)
- [ ] Aktualizovat dokumentaci
- [ ] Finalní testování

## 🧪 Testovací scénáře

1. **Nové video**: Nahrát → uložit do IndexedDB → použít v sequenceru
2. **Starý session**: Načíst session s base64 → automatická migrace
3. **Velké video**: Nahrát 1GB video → testovat lazy loading
4. **Více videí**: Nahrát 10 videí → testovat paměť
5. **Smazání**: Smazat video → ověřit mazání z IndexedDB
6. **Session save/load**: Uložit session → načíst → ověřit funkčnost

## 📊 Očekávané výsledky

### Před migrací:
- Limit: ~2 GB v paměti
- Session soubor: base64 (velký)
- Načítání: všechna videa najednou

### Po migraci:
- Limit: stovky GB (omezeno diskem)
- Session soubor: pouze reference (malý)
- Načítání: lazy loading (pouze potřebná videa)

## 🚨 Rizika a mitigace

### Riziko 1: Ztráta dat při migraci
**Mitigace**:
- Zpětná kompatibilita se starými session soubory
- Automatická migrace při načtení
- Backup před migrací

### Riziko 2: Problémy s IndexedDB kvótou
**Mitigace**:
- Error handling
- Informování uživatele o nedostatku místa
- Možnost vyčistit stará videa

### Riziko 3: Performance při lazy loading
**Mitigace**:
- Preloading aktivních videí
- Cache management
- Progress indikátory

## 📅 Odhadovaný čas

- **Fáze 1**: 2-3 hodiny (základní infrastruktura)
- **Fáze 2**: 2-3 hodiny (LibraryContext)
- **Fáze 3**: 2-3 hodiny (SessionContext)
- **Fáze 4**: 3-4 hodiny (lazy loading)
- **Fáze 5**: 2-3 hodiny (optimalizace)
- **Fáze 6**: 1-2 hodiny (migrace a cleanup)

**Celkem**: ~12-18 hodin

## 🔄 Zpětná kompatibilita

- ✅ Staré session soubory budou fungovat (automatická migrace)
- ✅ Stará videa v paměti budou migrována při prvním použití
- ✅ Postupný přechod bez breaking changes

