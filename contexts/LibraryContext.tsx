import React, { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { WireframeGeometry } from 'three/addons/geometries/WireframeGeometry.js';
import { SHADERS as SHADERS_CATEGORIZED } from '../shaders/index';
import { fileToDataUrl } from '../utils/helpers';
import { USER_SHADERS_STORAGE_KEY, USER_HTML_STORAGE_KEY, SHADER_PREVIEWS_CACHE_KEY } from '../constants';
import type { UserShaders, UserImages, UserVideos, LibraryContextValue, UserShader, UserModels, UserModel, UserHtmls, UserHtml } from '../types';
import { generateShaderPreviews } from '../utils/previewGenerator';
import { generateModelPreview } from '../utils/modelPreviewGenerator';
import { useUI } from './UIContext';

const SHADERS = SHADERS_CATEGORIZED.sources;

// Helper to create a simple hash from a string to detect changes.
const simpleHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

export const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setSelectedItem, selectedItem } = useUI();

    const [userShaders, setUserShaders] = useState<UserShaders>({});
    const [userImages, setUserImages] = useState<UserImages>({});
    const [userVideos, setUserVideos] = useState<UserVideos>({});
    const [userModels, setUserModels] = useState<UserModels>({});
    const [userHtml, setUserHtml] = useState<UserHtmls>({});
    const [shaderPreviews, setShaderPreviews] = useState<Record<string, string>>({});
    const [modelPreviews, setModelPreviews] = useState<Record<string, string>>({});


    const shaders = useMemo(() => ({
        ...SHADERS,
        // FIX: Explicitly type map parameter to resolve error when destructuring.
        ...Object.fromEntries(Object.entries(userShaders).map(([name, shaderDef]: [string, { code: string }]) => [name, shaderDef.code]))
    }), [userShaders]);

    const defaultShaderKeys = useMemo(() => Object.keys(SHADERS).sort(), []);
    const allDisplayableKeys = useMemo(() => [...Object.keys(shaders), ...Object.keys(userImages), ...Object.keys(userVideos), ...Object.keys(userModels), ...Object.keys(userHtml)], [shaders, userImages, userVideos, userModels, userHtml]);

    const handlePreviewGenerated = useCallback((key: string, dataUrl: string) => {
        // This updates the state for the current session
        setShaderPreviews(prev => ({ ...prev, [key]: dataUrl }));

        // Update cache
        try {
            const cachedData = JSON.parse(localStorage.getItem(SHADER_PREVIEWS_CACHE_KEY) || '{}');
            const defaultShadersHash = simpleHash(JSON.stringify(SHADERS));
            const previews = cachedData.previews || {};

            const savedShaders = JSON.parse(localStorage.getItem(USER_SHADERS_STORAGE_KEY) || '{}');

            if (SHADERS[key as keyof typeof SHADERS]) {
                previews[key] = dataUrl;
            } else if (savedShaders[key]) {
                previews[key] = {
                    hash: simpleHash(savedShaders[key].code),
                    dataUrl: dataUrl
                };
            }

            localStorage.setItem(SHADER_PREVIEWS_CACHE_KEY, JSON.stringify({ version: defaultShadersHash, previews }));
        } catch(e) {
            console.error("Failed to update preview cache", e);
        }
    }, []);

    const handleModelPreviewGenerated = useCallback((key: string, dataUrl: string) => {
        setModelPreviews(prev => ({ ...prev, [key]: dataUrl }));
    }, []);

    // Load pre-generated PNG previews for default shaders (optimized with parallel loading)
    useEffect(() => {
        const loadPreGeneratedPreviews = async () => {
            const previews: Record<string, string> = {};

            // Process in batches to avoid overwhelming the browser with too many concurrent requests
            const BATCH_SIZE = 30;
            const batches: string[][] = [];

            for (let i = 0; i < defaultShaderKeys.length; i += BATCH_SIZE) {
                batches.push(defaultShaderKeys.slice(i, i + BATCH_SIZE));
            }

            // Process batches sequentially, but items within each batch in parallel
            for (const batch of batches) {
                const batchResults = await Promise.allSettled(
                    batch.map(async (shaderKey) => {
                        const previewUrl = `/assets/shaders-previews/${shaderKey}.png`;
                        // Use HEAD request for faster existence check (doesn't download the full image)
                        const response = await fetch(previewUrl, { method: 'HEAD' });
                        if (response.ok) {
                            return { shaderKey, previewUrl };
                        }
                        return null;
                    })
                );

                // Collect successful results from this batch
                const batchPreviews: Record<string, string> = {};
                batchResults.forEach((result) => {
                    if (result.status === 'fulfilled' && result.value) {
                        batchPreviews[result.value.shaderKey] = result.value.previewUrl;
                        previews[result.value.shaderKey] = result.value.previewUrl;
                    }
                });

                // Update state incrementally for better UX (progressive loading)
                if (Object.keys(batchPreviews).length > 0) {
                    setShaderPreviews(prev => ({ ...prev, ...batchPreviews }));
                }
            }
        };

        loadPreGeneratedPreviews();
    }, [defaultShaderKeys]);

    useEffect(() => {
        if (selectedItem && !allDisplayableKeys.includes(selectedItem)) {
            const firstUserShader = Object.keys(userShaders)[0];
            const firstImage = Object.keys(userImages)[0];
            const firstVideo = Object.keys(userVideos)[0];
            const firstModel = Object.keys(userModels)[0];
            const firstHtml = Object.keys(userHtml)[0];
            const firstDefaultShader = defaultShaderKeys[0];

            setSelectedItem(firstUserShader || firstImage || firstVideo || firstModel || firstHtml || firstDefaultShader || '');
        }
    }, [allDisplayableKeys, selectedItem, setSelectedItem, userShaders, userImages, userVideos, userModels, userHtml, defaultShaderKeys]);

    const deleteShader = useCallback((key: string) => {
        setUserShaders(prevShaders => {
            if (Object.prototype.hasOwnProperty.call(prevShaders, key)) {
                const newShaders = { ...prevShaders };
                delete newShaders[key];
                localStorage.setItem(USER_SHADERS_STORAGE_KEY, JSON.stringify(newShaders));

                // Remove from preview cache
                try {
                    const cachedData = JSON.parse(localStorage.getItem(SHADER_PREVIEWS_CACHE_KEY) || '{}');
                    if (cachedData.previews && cachedData.previews[key]) {
                        delete cachedData.previews[key];
                        localStorage.setItem(SHADER_PREVIEWS_CACHE_KEY, JSON.stringify(cachedData));
                    }
                } catch (e) {
                    console.error("Failed to update preview cache on delete", e);
                }

                return newShaders;
            }
            return prevShaders;
        });
    }, []);

    const deleteMedia = useCallback((key: string) => {
        setUserImages(prevImages => {
            if (Object.prototype.hasOwnProperty.call(prevImages, key)) {
                const newImages = { ...prevImages };
                delete newImages[key];
                return newImages;
            }
            return prevImages;
        });
        setUserVideos(prevVideos => {
            if (Object.prototype.hasOwnProperty.call(prevVideos, key)) {
                const newVideos = { ...prevVideos };
                URL.revokeObjectURL(newVideos[key].objectURL);
                delete newVideos[key];
                return newVideos;
            }
            return prevVideos;
        });
        setUserModels(prevModels => {
             if (Object.prototype.hasOwnProperty.call(prevModels, key)) {
                const newModels = { ...prevModels };
                newModels[key].geometry.dispose();
                if (newModels[key].wireframeGeometry) {
                    newModels[key].wireframeGeometry.dispose();
                }
                delete newModels[key];
                return newModels;
            }
            return prevModels;
        });
        setUserHtml(prevHtml => {
            if (Object.prototype.hasOwnProperty.call(prevHtml, key)) {
                const newHtml = { ...prevHtml };
                delete newHtml[key];
                localStorage.setItem(USER_HTML_STORAGE_KEY, JSON.stringify(newHtml));
                return newHtml;
            }
            return prevHtml;
        });
    }, []);

    const saveShader = useCallback((name: string, code: string) => {
        // The callback to generateShaderPreviews will handle caching.
        generateShaderPreviews({ [name]: code }, handlePreviewGenerated);
        setUserShaders(prev => {
            const newShaders = { ...prev, [name]: { code } };
            localStorage.setItem(USER_SHADERS_STORAGE_KEY, JSON.stringify(newShaders));
            return newShaders;
        });
        setSelectedItem(name);
    }, [handlePreviewGenerated, setSelectedItem]);

    const saveHtml = useCallback((name: string, data: UserHtml) => {
        setUserHtml(prev => {
            const newHtmls = { ...prev, [name]: data };
            localStorage.setItem(USER_HTML_STORAGE_KEY, JSON.stringify(newHtmls));
            return newHtmls;
        });
        setSelectedItem(name);
    }, [setSelectedItem]);


    const updateHtml = useCallback((name: string, content: UserHtml) => {
        setUserHtml(prev => {
            const newHtmls = { ...prev, [name]: content };
            localStorage.setItem(USER_HTML_STORAGE_KEY, JSON.stringify(newHtmls));
            return newHtmls;
        });
    }, []);

    const updateMediaName = useCallback(async (oldKey: string, newKey: string): Promise<boolean> => {
        const trimmedNewKey = newKey.trim();
        const allKeys = [
            ...Object.keys(userShaders),
            ...Object.keys(userImages),
            ...Object.keys(userVideos),
            ...Object.keys(userModels),
            ...Object.keys(userHtml)
        ];

        if (trimmedNewKey === '' || (trimmedNewKey !== oldKey && allKeys.includes(trimmedNewKey))) {
            alert(`Name "${trimmedNewKey}" is invalid or already in use.`);
            return false;
        }

        const renameInState = <T extends {}>(
            state: T,
            setter: React.Dispatch<React.SetStateAction<T>>,
            storageKey?: string
        ): boolean => {
            if (Object.prototype.hasOwnProperty.call(state, oldKey)) {
                const newState = { ...state };
                const data = newState[oldKey as keyof T];
                delete newState[oldKey as keyof T];
                (newState as any)[trimmedNewKey] = data;
                setter(newState);
                if (storageKey) {
                    localStorage.setItem(storageKey, JSON.stringify(newState));
                }
                return true;
            }
            return false;
        };

        if (renameInState(userShaders, setUserShaders, USER_SHADERS_STORAGE_KEY)) {
            setShaderPreviews(prev => {
                const newPreviews = { ...prev };
                if (newPreviews[oldKey]) {
                    newPreviews[trimmedNewKey] = newPreviews[oldKey];
                    delete newPreviews[oldKey];
                }
                return newPreviews;
            });
            return true;
        }
        if (renameInState(userImages, setUserImages)) return true;
        if (renameInState(userVideos, setUserVideos)) return true;
        if (renameInState(userModels, setUserModels)) {
            setModelPreviews(prev => {
                const newPreviews = { ...prev };
                if (newPreviews[oldKey]) {
                    newPreviews[trimmedNewKey] = newPreviews[oldKey];
                    delete newPreviews[oldKey];
                }
                return newPreviews;
            });
            return true;
        }
        if (renameInState(userHtml, setUserHtml, USER_HTML_STORAGE_KEY)) return true;

        return false;
    }, [userShaders, userImages, userVideos, userModels, userHtml]);


    const saveMedia = useCallback(async (files: { name: string; file: File }[]): Promise<string[]> => {
        const newMediaKeys: string[] = [];
        const imageUpdates: UserImages = {};
        const videoUpdates: UserVideos = {};
        const modelUpdates: UserModels = {};

        for (const { name, file } of files) {
            newMediaKeys.push(name);
            if (file.type.startsWith('image/')) {
                imageUpdates[name] = await fileToDataUrl(file);
            } else if (file.type.startsWith('video/')) {
                const objectURL = URL.createObjectURL(file);
                const videoElement = document.createElement('video');
                videoElement.src = objectURL;
                videoElement.muted = true;
                videoElement.loop = false;
                videoElement.playsInline = true;
                videoUpdates[name] = { objectURL, element: videoElement, file: file };
            } else if (file.name.toLowerCase().endsWith('.obj')) {
                 try {
                    const text = await file.text();
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

                        modelUpdates[name] = { geometry, wireframeGeometry, file, center, scale };
                        generateModelPreview(name, geometry, handleModelPreviewGenerated);
                    } else {
                        console.error(`Could not find a mesh in OBJ file: ${name}`);
                        newMediaKeys.pop(); // Remove from keys if failed
                    }
                } catch (e) {
                    console.error(`Failed to parse OBJ file ${name}:`, e);
                    newMediaKeys.pop(); // Remove from keys if failed
                }
            }
        }
        if (Object.keys(imageUpdates).length > 0) setUserImages(prev => ({ ...prev, ...imageUpdates }));
        if (Object.keys(videoUpdates).length > 0) setUserVideos(prev => ({ ...prev, ...videoUpdates }));
        if (Object.keys(modelUpdates).length > 0) setUserModels(prev => ({...prev, ...modelUpdates}));

        if (newMediaKeys.length > 0) setSelectedItem(newMediaKeys[newMediaKeys.length - 1]);

        return newMediaKeys;
    }, [setSelectedItem, handleModelPreviewGenerated]);

    useEffect(() => {
        // Initial loading is now handled by SessionContext
    }, []);

    const value: LibraryContextValue = useMemo(() => ({
        userShaders, userImages, userVideos, userModels, userHtml, shaderPreviews, modelPreviews, shaders, defaultShaderKeys, allDisplayableKeys,
        setUserShaders,
        setUserImages,
        setUserVideos,
        setUserModels,
        setUserHtml,
        setShaderPreviews,
        deleteShader, deleteMedia, saveShader, saveMedia, saveHtml, updateHtml, updateMediaName, handlePreviewGenerated, handleModelPreviewGenerated
    }), [userShaders, userImages, userVideos, userModels, userHtml, shaderPreviews, modelPreviews, shaders, defaultShaderKeys, allDisplayableKeys, deleteShader, deleteMedia, saveShader, saveMedia, saveHtml, updateHtml, updateMediaName, handlePreviewGenerated, handleModelPreviewGenerated]);

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) throw new Error('useLibrary must be used within a LibraryProvider');
    return context;
};