import React, { createContext, useCallback, useMemo, useContext, useEffect } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { WireframeGeometry } from 'three/addons/geometries/WireframeGeometry.js';
import { SESSION_FILE_VERSION, DEFAULT_SEQUENCER_STEPS, NUM_PAGES, SEQUENCER_STEP_OPTIONS, MAX_SEQUENCER_STEPS, defaultControls, SHADER_PREVIEWS_CACHE_KEY, USER_SHADERS_STORAGE_KEY, USER_HTML_STORAGE_KEY } from '../constants';
import { createDefaultPageControls } from '../utils/statePersistence';
// FIX: Import fileToDataUrl helper function.
import { dataUrlToFile, fileToDataUrl } from '../utils/helpers';
import { generateShaderPreviews } from '../utils/previewGenerator';
import { generateModelPreview } from '../utils/modelPreviewGenerator';
import type { SessionContextValue, UserVideo, UserVideos, UserModels, UserModel, UserShaders, UserHtmls, UserHtml } from '../types';
import { useUI } from './UIContext';
import { useLibrary } from './LibraryContext';
import { useSequencer } from './SequencerAndPlaybackProvider';
import { SHADERS as SHADERS_CATEGORIZED } from '../shaders/index';

const SHADERS = SHADERS_CATEGORIZED.sources;

const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
};


export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        // FIX: Destructure state variables needed for saving the session.
        userShaders, userImages, userVideos, userModels, userHtml,
        setUserShaders, setUserImages, setUserVideos, setUserModels, setUserHtml, handlePreviewGenerated, handleModelPreviewGenerated, setShaderPreviews
    } = useLibrary();

    const {
        // FIX: Destructure state variables needed for saving the session.
        shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled, loopStart, loopEnd,
        setShaderSequences, setMediaSequences, setCurrentPage, setPageControls,
        setSequencerSteps, setIsLoopingEnabled, setLoopStart, setLoopEnd
    } = useSequencer();

    const { setIsSessionLoading, setSessionLoadingDetails } = useUI();

    const handleSaveSession = useCallback(async () => {
        try {
            setIsSessionLoading(true);
            setSessionLoadingDetails('Serializing videos...');
            const serializableVideos = await Promise.all(
                Object.entries(userVideos).map(async ([key, video]: [string, UserVideo]) => {
                    return [key, { dataUrl: await fileToDataUrl(video.file), fileName: video.file.name }];
                })
            );

            setSessionLoadingDetails('Serializing 3D models...');
            const serializableModels = await Promise.all(
                Object.entries(userModels).map(async ([key, model]: [string, UserModel]) => {
                    const dataUrl = await fileToDataUrl(model.file);
                    return [key, { dataUrl, fileName: model.file.name }];
                })
            );

            setSessionLoadingDetails('Packaging session data...');
            // FIX: Remove incorrect .getState() calls and use state variables from hooks directly.

            const sessionData = {
                version: SESSION_FILE_VERSION,
                userShaders,
                userImages,
                userVideos: Object.fromEntries(serializableVideos),
                userModels: Object.fromEntries(serializableModels),
                userHtml,
                shaderSequences,
                mediaSequences,
                currentPage,
                pageControls,
                sequencerSteps,
                isLoopingEnabled,
                loopStart,
                loopEnd
            };
            const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `shader-session-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (error) {
            console.error("Failed to save session:", error);
        } finally {
            setIsSessionLoading(false);
        }
    // FIX: Add state variables to the dependency array.
    }, [
      userVideos, userModels, userShaders, userImages, userHtml,
      shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled, loopStart, loopEnd,
      setIsSessionLoading, setSessionLoadingDetails
    ]);

    const loadSessionData = useCallback(async (sessionData: any) => {
        if (sessionData.version !== SESSION_FILE_VERSION) {
            console.warn(`Session file version mismatch. Expected v${SESSION_FILE_VERSION}, but found v${sessionData.version}. Attempting to load anyway.`);
        }

        const sanitizedData = { ...sessionData };

        let loadedSequencerSteps = sanitizedData.sequencerSteps || DEFAULT_SEQUENCER_STEPS;
        if (!SEQUENCER_STEP_OPTIONS.includes(loadedSequencerSteps)) {
            loadedSequencerSteps = DEFAULT_SEQUENCER_STEPS;
        }
        sanitizedData.sequencerSteps = loadedSequencerSteps;
        sanitizedData.isLoopingEnabled = sanitizedData.isLoopingEnabled ?? false;
        sanitizedData.loopStart = sanitizedData.loopStart ?? 0;
        sanitizedData.loopEnd = sanitizedData.loopEnd ?? loadedSequencerSteps - 1;

        const resizeOnLoad = <T,>(sequences: T[][] | undefined, fillValue: T | (() => T)): T[][] => {
            const newSize = MAX_SEQUENCER_STEPS;
            const seq = sequences || [];
            while(seq.length < NUM_PAGES) {
                seq.push([] as T[]);
            }
            return seq.map(page => {
                const currentPage = page || [];
                const oldSize = currentPage.length;
                if (newSize > oldSize) {
                    const toAddLength = newSize - oldSize;
                    const filler: T[] = typeof fillValue === 'function'
                        ? Array.from({ length: toAddLength }, fillValue as () => T)
                        : new Array(toAddLength).fill(fillValue);
                    return [...currentPage, ...filler];
                }
                return currentPage;
            });
        };

        sanitizedData.shaderSequences = resizeOnLoad(sanitizedData.shaderSequences, null);
        sanitizedData.mediaSequences = resizeOnLoad(sanitizedData.mediaSequences, () => ({ key: null }));

        if (!sanitizedData.pageControls || sanitizedData.pageControls.length !== NUM_PAGES) {
            const newPageControls = createDefaultPageControls();
            if (sanitizedData.pageControls) {
                for(let i = 0; i < Math.min(sanitizedData.pageControls.length, NUM_PAGES); i++) {
                    newPageControls[i] = { ...defaultControls, ...sanitizedData.pageControls[i] };
                }
            }
            sanitizedData.pageControls = newPageControls;
        }

        setSessionLoadingDetails('Merging library items...');

        const loadedShaders = (sanitizedData.userShaders || {}) as UserShaders;
        const loadedHtml = (sanitizedData.userHtml || {}) as UserHtmls;

        setUserShaders(loadedShaders);
        setUserImages(sanitizedData.userImages || {});
        setUserHtml(loadedHtml);
        localStorage.setItem(USER_SHADERS_STORAGE_KEY, JSON.stringify(loadedShaders));
        localStorage.setItem(USER_HTML_STORAGE_KEY, JSON.stringify(loadedHtml));

        setSessionLoadingDetails('Restoring videos...');
        if (sanitizedData.userVideos) {
            const newVideos: UserVideos = {};
            for (const key in sanitizedData.userVideos) {
                const savedVideo = sanitizedData.userVideos[key];
                const videoFile = await dataUrlToFile(savedVideo.dataUrl, savedVideo.fileName);
                const objectURL = URL.createObjectURL(videoFile);
                const videoElement = document.createElement('video');
                videoElement.src = objectURL;
                videoElement.muted = true; videoElement.loop = false; videoElement.playsInline = true;
                newVideos[key] = { objectURL, element: videoElement, file: videoFile };
            }
            setUserVideos(newVideos);
        }

        setSessionLoadingDetails('Restoring 3D models...');
        if (sanitizedData.userModels) {
            const newModels: UserModels = {};
            for (const key in sanitizedData.userModels) {
                const savedModel = sanitizedData.userModels[key];
                try {
                    const modelFile = await dataUrlToFile(savedModel.dataUrl, savedModel.fileName);
                    const text = await modelFile.text();
                    const loader = new OBJLoader();
                    const group = loader.parse(text);
                    let geometry;
                    group.traverse((child: any) => { if (child.isMesh) { geometry = child.geometry; } });
                    if (geometry) {
                        geometry.computeVertexNormals();
                        geometry.computeBoundingBox();
                        const box = geometry.boundingBox;
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());
                        const maxDim = Math.max(size.x, size.y, size.z);
                        const scale = maxDim > 0 ? 1.5 / maxDim : 1.0;
                        const wireframeGeometry = new THREE.WireframeGeometry(geometry);
                        newModels[key] = { geometry, wireframeGeometry, file: modelFile, center, scale };
                        generateModelPreview(key, geometry, handleModelPreviewGenerated);
                    }
                } catch (e) { console.error(`Failed to load model ${key} from session:`, e); }
            }
            setUserModels(newModels);
        }

        setSessionLoadingDetails('Restoring sequences...');
        setSequencerSteps(sanitizedData.sequencerSteps);
        setShaderSequences(sanitizedData.shaderSequences);
        setMediaSequences(sanitizedData.mediaSequences);
        setCurrentPage(sanitizedData.currentPage || 0);
        setPageControls(sanitizedData.pageControls);
        setIsLoopingEnabled(sanitizedData.isLoopingEnabled);
        setLoopStart(sanitizedData.loopStart);
        setLoopEnd(sanitizedData.loopEnd);

        setSessionLoadingDetails('Generating previews...');

        const defaultShadersHash = simpleHash(JSON.stringify(SHADERS));
        let cachedData: { version?: string; previews?: Record<string, any> } = {};
        try { const item = localStorage.getItem(SHADER_PREVIEWS_CACHE_KEY); if (item) cachedData = JSON.parse(item); } catch (e) { console.error("Failed to parse shader preview cache", e); }

        const cachedPreviews = cachedData.previews || {};
        const previewsToSet: Record<string, string> = {};
        const shadersToGenerate: Record<string, string> = {};
        const isDefaultCacheValid = cachedData.version === defaultShadersHash;

        // Check for pre-generated PNG previews first (optimized with parallel loading)
        const checkPreGeneratedPreviews = async (keys: string[]) => {
            const preGeneratedPreviews: Record<string, string> = {};
            const remainingKeys: string[] = [];

            // Process in batches to avoid overwhelming the browser
            const BATCH_SIZE = 30;
            const batches: string[][] = [];

            for (let i = 0; i < keys.length; i += BATCH_SIZE) {
                batches.push(keys.slice(i, i + BATCH_SIZE));
            }

            // Process batches sequentially, but items within each batch in parallel
            for (const batch of batches) {
                const batchResults = await Promise.allSettled(
                    batch.map(async (key) => {
                        const previewUrl = `/assets/shaders-previews/${key}.png`;
                        const response = await fetch(previewUrl, { method: 'HEAD' });
                        if (response.ok) {
                            return { key, previewUrl };
                        }
                        return { key, previewUrl: null };
                    })
                );

                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        if (result.value.previewUrl) {
                            preGeneratedPreviews[result.value.key] = result.value.previewUrl;
                        } else {
                            remainingKeys.push(result.value.key);
                        }
                    } else {
                        // If promise rejected, add to remaining keys
                        remainingKeys.push(batch[index]);
                    }
                });
            }

            return { preGeneratedPreviews, remainingKeys };
        };

        const { preGeneratedPreviews, remainingKeys } = await checkPreGeneratedPreviews(Object.keys(SHADERS));
        Object.assign(previewsToSet, preGeneratedPreviews);

        // For remaining shaders, use cache if available (even if version doesn't match), only generate if no cache exists
        remainingKeys.forEach(key => {
            if (typeof cachedPreviews[key] === 'string') {
                // Use cache even if version doesn't match - it's better than generating
                previewsToSet[key] = cachedPreviews[key];
            } else {
                // Only generate if we don't have PNG and don't have cache
                shadersToGenerate[key] = SHADERS[key as keyof typeof SHADERS];
            }
        });

        Object.entries(loadedShaders).forEach(([key, shader]) => {
            const currentHash = simpleHash(shader.code);
            const cachedEntry = cachedPreviews[key];
            if (cachedEntry && typeof cachedEntry === 'object' && cachedEntry.hash === currentHash && cachedEntry.dataUrl) {
                previewsToSet[key] = cachedEntry.dataUrl;
            } else {
                shadersToGenerate[key] = shader.code;
            }
        });

        setShaderPreviews(previewsToSet);

        if (Object.keys(shadersToGenerate).length > 0) {
            await generateShaderPreviews(
                shadersToGenerate,
                handlePreviewGenerated,
                (key, current, total) => setSessionLoadingDetails(`Generating previews... (${current}/${total})`)
            );
        } else if (!isDefaultCacheValid) {
            localStorage.setItem(SHADER_PREVIEWS_CACHE_KEY, JSON.stringify({
                version: defaultShadersHash,
                previews: cachedPreviews
            }));
        }
    }, [
        setIsSessionLoading, setSessionLoadingDetails, setUserShaders, setUserImages, setUserHtml,
        setUserVideos, setUserModels, handleModelPreviewGenerated, setSequencerSteps, setShaderSequences,
        setMediaSequences, setCurrentPage, setPageControls, setIsLoopingEnabled, setLoopStart, setLoopEnd,
        handlePreviewGenerated, setShaderPreviews
    ]);

    const handleLoadSession = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsSessionLoading(true);
        setSessionLoadingDetails('Reading session file...');
        try {
            const sessionData = JSON.parse(await file.text());
            await loadSessionData(sessionData);
        } catch (error) {
            console.error("Failed to load session:", error);
            alert("Failed to load session file. It might be corrupted or an incompatible version.");
        }
        finally {
            setIsSessionLoading(false);
            if (event.target) event.target.value = '';
        }
    }, [loadSessionData, setIsSessionLoading, setSessionLoadingDetails]);

    useEffect(() => {
        const loadInitialSession = async () => {
            setIsSessionLoading(true);
            try {
                setSessionLoadingDetails('Loading default session...');

                // Check if we're running in Electron
                const electronAPI = (window as any).electronAPI;
                let sessionData: any = null;

                if (electronAPI && electronAPI.readFile) {
                    // Use Electron API to read file (works in packaged app)
                    const filePaths = [
                        'dist/media/001.json',  // In packaged app, files are in dist/
                        'media/001.json',        // Fallback
                        'dist/../media/001.json' // Another fallback
                    ];

                    for (const filePath of filePaths) {
                        try {
                            const result = await electronAPI.readFile(filePath);
                            if (result.success) {
                                console.log('Successfully loaded session from:', filePath);
                                sessionData = JSON.parse(result.content);
                                break;
                            }
                        } catch (err) {
                            console.warn(`Failed to load from ${filePath}:`, err);
                            continue;
                        }
                    }
                } else {
                    // Fallback to fetch (works in dev mode and browser)
                    const paths = [
                        './media/001.json',
                        'media/001.json',
                        '../media/001.json'
                    ];

                    let response: Response | null = null;

                    for (const filePath of paths) {
                        try {
                            response = await fetch(filePath);
                            if (response.ok) {
                                console.log('Successfully loaded session from:', filePath);
                                sessionData = await response.json();
                                break;
                            }
                        } catch (err) {
                            console.warn(`Failed to load from ${filePath}:`, err);
                            continue;
                        }
                    }
                }

                if (!sessionData) {
                    // If all paths fail, try to create empty session
                    console.warn('Could not load default session file, starting with empty session');
                    setSessionLoadingDetails('Starting with empty session...');
                    // Don't throw error, just continue with empty state
                    return;
                }

                await loadSessionData(sessionData);
            } catch (error) {
                console.error("Failed to load initial session:", error);
                // Don't show alert, just log and continue with empty session
                console.warn("Continuing with empty session state");
            } finally {
                setIsSessionLoading(false);
            }
        };
        loadInitialSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(() => ({
        handleSaveSession,
        handleLoadSession
    }), [handleSaveSession, handleLoadSession]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) throw new Error('useSession must be used within a SessionProvider');
    return context;
};
