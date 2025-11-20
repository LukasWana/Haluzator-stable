

import React, { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { WireframeGeometry } from 'three/addons/geometries/WireframeGeometry.js';
import { SHADERS as SHADERS_CATEGORIZED } from '../shaders/index';
import { fileToDataUrl } from '../utils/helpers';
import { USER_SHADERS_STORAGE_KEY } from '../constants';
import type { UserShaders, UserImages, UserVideos, LibraryContextValue, UserShader, UserModels, UserModel } from '../types';
import { generateShaderPreviews } from '../utils/previewGenerator';
import { generateModelPreview } from '../utils/modelPreviewGenerator';
import { useUI } from './UIContext';

const SHADERS = SHADERS_CATEGORIZED.sources;

export const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setSelectedItem, selectedItem } = useUI();

    const [userShaders, setUserShaders] = useState<UserShaders>({});
    const [userImages, setUserImages] = useState<UserImages>({});
    const [userVideos, setUserVideos] = useState<UserVideos>({});
    const [userModels, setUserModels] = useState<UserModels>({});
    const [shaderPreviews, setShaderPreviews] = useState<Record<string, string>>({});
    const [modelPreviews, setModelPreviews] = useState<Record<string, string>>({});


    const shaders = useMemo(() => ({
        ...SHADERS,
        // FIX: Explicitly type map parameter to resolve error when destructuring.
        ...Object.fromEntries(Object.entries(userShaders).map(([name, shaderDef]: [string, UserShader]) => [name, shaderDef.code]))
    }), [userShaders]);

    const defaultShaderKeys = useMemo(() => Object.keys(SHADERS).sort(), []);
    const allDisplayableKeys = useMemo(() => [...Object.keys(shaders), ...Object.keys(userImages), ...Object.keys(userVideos), ...Object.keys(userModels)], [shaders, userImages, userVideos, userModels]);

    const handlePreviewGenerated = useCallback((key: string, dataUrl: string) => {
        setShaderPreviews(prev => ({ ...prev, [key]: dataUrl }));
    }, []);
    
    const handleModelPreviewGenerated = useCallback((key: string, dataUrl: string) => {
        setModelPreviews(prev => ({ ...prev, [key]: dataUrl }));
    }, []);

    useEffect(() => {
        if (selectedItem && !allDisplayableKeys.includes(selectedItem)) {
            const firstUserShader = Object.keys(userShaders)[0];
            const firstImage = Object.keys(userImages)[0];
            const firstVideo = Object.keys(userVideos)[0];
            const firstModel = Object.keys(userModels)[0];
            const firstDefaultShader = defaultShaderKeys[0];
            
            setSelectedItem(firstUserShader || firstImage || firstVideo || firstModel || firstDefaultShader || '');
        }
    }, [allDisplayableKeys, selectedItem, setSelectedItem, userShaders, userImages, userVideos, userModels, defaultShaderKeys]);

    const deleteShader = useCallback((key: string) => {
        setUserShaders(prevShaders => {
            if (Object.prototype.hasOwnProperty.call(prevShaders, key)) {
                const newShaders = { ...prevShaders };
                delete newShaders[key];
                localStorage.setItem(USER_SHADERS_STORAGE_KEY, JSON.stringify(newShaders));
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
    }, []);

    const saveShader = useCallback((name: string, code: string) => {
        generateShaderPreviews({ [name]: code }, handlePreviewGenerated);
        setUserShaders(prev => {
            const newShaders = { ...prev, [name]: { code } };
            localStorage.setItem(USER_SHADERS_STORAGE_KEY, JSON.stringify(newShaders));
            return newShaders;
        });
        setSelectedItem(name);
    }, [handlePreviewGenerated, setSelectedItem]);

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
        const savedShaders = JSON.parse(localStorage.getItem(USER_SHADERS_STORAGE_KEY) || '{}');
        setUserShaders(savedShaders);
        
        const allShaderSources = { ...SHADERS, ...Object.fromEntries(Object.entries(savedShaders).map(([k, v]: [string, any]) => [k, v.code])) };
        
        // The preloader is now handled by App.tsx. This just kicks off the background generation.
        generateShaderPreviews(allShaderSources, handlePreviewGenerated);

    }, [handlePreviewGenerated]);

    const value = useMemo(() => ({
        userShaders, userImages, userVideos, userModels, shaderPreviews, modelPreviews, shaders, defaultShaderKeys, allDisplayableKeys,
        setUserShaders,
        setUserImages,
        setUserVideos,
        setUserModels,
        deleteShader, deleteMedia, saveShader, saveMedia, handlePreviewGenerated, handleModelPreviewGenerated
    }), [userShaders, userImages, userVideos, userModels, shaderPreviews, modelPreviews, shaders, defaultShaderKeys, allDisplayableKeys, deleteShader, deleteMedia, saveShader, saveMedia, handlePreviewGenerated, handleModelPreviewGenerated]);

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) throw new Error('useLibrary must be used within a LibraryProvider');
    return context;
};