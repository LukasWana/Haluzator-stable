

import React, { createContext, useCallback, useMemo, useContext } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { WireframeGeometry } from 'three/addons/geometries/WireframeGeometry.js';
import { SESSION_FILE_VERSION, DEFAULT_SEQUENCER_STEPS, NUM_PAGES, SEQUENCER_STEP_OPTIONS, MAX_SEQUENCER_STEPS, defaultControls } from '../constants';
import { createDefaultPageControls } from '../utils/statePersistence';
import { fileToDataUrl, dataUrlToFile } from '../utils/helpers';
import { generateShaderPreviews } from '../utils/previewGenerator';
import { generateModelPreview } from '../utils/modelPreviewGenerator';
import type { SessionContextValue, UserVideo, UserVideos, UserModels, UserModel } from '../types';
import { useUI } from './UIContext';
import { useLibrary } from './LibraryContext';
import { useSequencer } from './SequencerAndPlaybackProvider';

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { 
        userShaders, userImages, userVideos, userModels,
        setUserShaders, setUserImages, setUserVideos, setUserModels, handlePreviewGenerated, handleModelPreviewGenerated 
    } = useLibrary();
    
    const { 
        shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, 
        isLoopingEnabled, loopStart, loopEnd, 
        setShaderSequences, setMediaSequences, setCurrentPage, setPageControls, 
        setSequencerSteps, setIsLoopingEnabled, setLoopStart, setLoopEnd 
    } = useSequencer();

    const { setIsSessionLoading, setSessionLoadingDetails } = useUI();

    const handleSaveSession = useCallback(async () => {
        try {
            setIsSessionLoading(true);
            setSessionLoadingDetails('Serializing videos...');
            // FIX: Explicitly type 'video' as UserVideo to resolve property access errors.
            const serializableVideos = await Promise.all(Object.entries(userVideos).map(async ([key, video]: [string, UserVideo]) => ([key, { dataUrl: await fileToDataUrl(video.file), fileName: video.file.name }])));
            
            setSessionLoadingDetails('Serializing 3D models...');
            const serializableModels = await Promise.all(
                Object.entries(userModels).map(async ([key, model]) => {
                    const dataUrl = await fileToDataUrl(model.file);
                    return [key, { dataUrl, fileName: model.file.name }];
                })
            );

            setSessionLoadingDetails('Packaging session data...');
            const sessionData = { 
                version: SESSION_FILE_VERSION, 
                userShaders, 
                userImages, 
                userVideos: Object.fromEntries(serializableVideos),
                userModels: Object.fromEntries(serializableModels),
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
    }, [userShaders, userImages, userVideos, userModels, shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled, loopStart, loopEnd, setIsSessionLoading, setSessionLoadingDetails]);

    const handleLoadSession = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsSessionLoading(true);
        try {
            setSessionLoadingDetails('Reading session file...');
            const sessionData = JSON.parse(await file.text());
            
            if (sessionData.version !== SESSION_FILE_VERSION) {
                 console.warn(`Session file version mismatch. Expected v${SESSION_FILE_VERSION}, but found v${sessionData.version}. Attempting to load anyway.`);
            }

            // Sanitize loaded data to ensure compatibility
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
            
            // FIX: Explicitly type 'v' as UserVideo to resolve property access errors.
            Object.values(userVideos).forEach((v: UserVideo) => URL.revokeObjectURL(v.objectURL));
            
            setSessionLoadingDetails('Restoring shaders & images...');
            const loadedShaders = sanitizedData.userShaders || {};
            setUserShaders(loadedShaders);
            setUserImages(sanitizedData.userImages || {});
            
            setSessionLoadingDetails('Restoring videos...');
            const loadedVideos: UserVideos = {};
            if (sanitizedData.userVideos) {
                for (const key in sanitizedData.userVideos) {
                    const savedVideo = sanitizedData.userVideos[key];
                    const videoFile = await dataUrlToFile(savedVideo.dataUrl, savedVideo.fileName);
                    const objectURL = URL.createObjectURL(videoFile);
                    const videoElement = document.createElement('video');
                    videoElement.src = objectURL;
                    videoElement.muted = true; videoElement.loop = false; videoElement.playsInline = true;
                    loadedVideos[key] = { objectURL, element: videoElement, file: videoFile };
                }
            }
            setUserVideos(loadedVideos);

            setSessionLoadingDetails('Restoring 3D models...');
            const loadedModels: UserModels = {};
            if (sanitizedData.userModels) {
                for (const key in sanitizedData.userModels) {
                    const savedModel = sanitizedData.userModels[key];
                    try {
                        const modelFile = await dataUrlToFile(savedModel.dataUrl, savedModel.fileName);
                        const text = await modelFile.text();
                        const loader = new OBJLoader();
                        const group = loader.parse(text);
                        let geometry;
                        group.traverse((child: any) => {
                            if (child.isMesh) {
                                geometry = child.geometry;
                            }
                        });

                        if (geometry) {
                            geometry.computeVertexNormals();
                            geometry.computeBoundingBox();
                            const box = geometry.boundingBox;
                            const center = box.getCenter(new THREE.Vector3());
                            const size = box.getSize(new THREE.Vector3());
                            const maxDim = Math.max(size.x, size.y, size.z);
                            const scale = maxDim > 0 ? 1.5 / maxDim : 1.0;
                            const wireframeGeometry = new THREE.WireframeGeometry(geometry);
                            loadedModels[key] = { geometry, wireframeGeometry, file: modelFile, center, scale };
                            generateModelPreview(key, geometry, handleModelPreviewGenerated);
                        }
                    } catch (e) {
                        console.error(`Failed to load model ${key} from session:`, e);
                    }
                }
            }
            setUserModels(loadedModels);
            
            setSessionLoadingDetails('Restoring sequences...');
            setSequencerSteps(sanitizedData.sequencerSteps);
            setShaderSequences(sanitizedData.shaderSequences);
            setMediaSequences(sanitizedData.mediaSequences);
            setCurrentPage(sanitizedData.currentPage || 0);
            setPageControls(sanitizedData.pageControls);
            setIsLoopingEnabled(sanitizedData.isLoopingEnabled);
            setLoopStart(sanitizedData.loopStart);
            setLoopEnd(sanitizedData.loopEnd);
            
            if (Object.keys(loadedShaders).length > 0) {
                const customShaders = Object.fromEntries(Object.entries(loadedShaders).map(([k, v]:[string, any]) => [k, v.code]));
                await generateShaderPreviews(customShaders, handlePreviewGenerated, (key, current, total) => setSessionLoadingDetails(`Generating preview: ${key} (${current}/${total})`));
            }
        } catch (error) { 
            console.error("Failed to load session:", error);
            alert("Failed to load session file. It might be corrupted or an incompatible version.");
        } 
        finally { 
            setIsSessionLoading(false); 
            if (event.target) event.target.value = ''; 
        }
    }, [
        userVideos, userModels, handlePreviewGenerated, handleModelPreviewGenerated,
        setUserShaders, setUserImages, setUserVideos, setUserModels,
        setSequencerSteps, setShaderSequences, setMediaSequences, setCurrentPage,
        setPageControls, setIsLoopingEnabled, setLoopStart, setLoopEnd,
        setIsSessionLoading, setSessionLoadingDetails
    ]);

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