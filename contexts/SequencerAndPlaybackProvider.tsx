import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { useUI } from './UIContext';
import { useLibrary } from './LibraryContext';
import { createInitialShaderSequences, createInitialMediaSequences, createDefaultPageControls } from '../utils/statePersistence';
import { APP_STATE_STORAGE_KEY, STATE_VERSION, NUM_PAGES, DEFAULT_SEQUENCER_STEPS, SEQUENCER_STEP_OPTIONS, TRANSITION_DURATION_MS, defaultModelSettings, defaultHtmlSettings } from '../constants';
import { BLACK_SHADER_KEY } from '../gl/shaders';
import { SHADERS as SHADERS_CATEGORIZED } from '../shaders/index';
import type { ControlSettings, MediaSequenceItem, UserVideo, ModelSettings, HtmlSettings } from '../types';

// --- CONTEXT DEFINITIONS AND HOOKS (Moved from separate files) ---

// Sequencer Context
export interface SequencerContextValue {
    shaderSequences: (string | null)[][];
    mediaSequences: MediaSequenceItem[][];
    currentPage: number;
    pageControls: ControlSettings[];
    sequencerSteps: number;
    isLoopingEnabled: boolean;
    loopStart: number;
    loopEnd: number;
    editableStep: number;
    activeShaderKey: string;
    isSelectingLoop: boolean;
    setMediaSequences: React.Dispatch<React.SetStateAction<MediaSequenceItem[][]>>;
    setShaderSequences: React.Dispatch<React.SetStateAction<(string | null)[][]>>;
    setPageControls: React.Dispatch<React.SetStateAction<ControlSettings[]>>;
    setSequencerSteps: React.Dispatch<React.SetStateAction<number>>;
    setIsLoopingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setLoopStart: React.Dispatch<React.SetStateAction<number>>;
    setLoopEnd: React.Dispatch<React.SetStateAction<number>>;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    handleControlChange: (field: keyof ControlSettings, value: number | boolean | string) => void;
    handleStepModelSettingsChange: (stepIndex: number, field: keyof ModelSettings, value: number | boolean | string) => void;
    handleStepHtmlSettingsChange: (stepIndex: number, field: keyof HtmlSettings, value: number | boolean | string) => void;
    handlePageChange: (newPageIndex: number) => void;
    handleSequencerStepsChange: (newSteps: number) => void;
    handleStepClick: (index: number, type: 'media' | 'shader', event: React.MouseEvent) => void;
    toggleLoop: () => void;
    shiftLoop: (direction: 'left' | 'right') => void;
    setEditableStep: (step: number) => void;
    startLoopSelection: (index: number) => void;
    updateLoopSelection: (index: number) => void;
    endLoopSelection: () => void;
    addMediaToSequencer: (keys: string[]) => void;
    setActiveShaderKey: React.Dispatch<React.SetStateAction<string>>;
    renameSequencerItem: (oldKey: string, newKey: string) => void;
}
export const SequencerContext = createContext<SequencerContextValue | undefined>(undefined);
export const useSequencer = () => {
    const context = useContext(SequencerContext);
    if (!context) throw new Error('useSequencer must be used within a SequencerProvider');
    return context;
};

// Playback Context
export interface PlaybackContextValue {
    isPlaying: boolean;
    currentStep: number;
    liveVjStep: number | null;
    transitionState: {
        fromShaderKey: string;
        toShaderKey: string;
        fromMediaKey: string | null;
        toMediaKey: string | null;
        fromModelSettings: ModelSettings | null;
        toModelSettings: ModelSettings | null;
        fromHtmlSettings: HtmlSettings | null;
        toHtmlSettings: HtmlSettings | null;
        isTransitioning: boolean;
        transitionProgress: number;
    };
    togglePlay: () => void;
    advanceSequence: () => void;
    triggerLiveVjStep: (stepIndex: number) => void;
    startTransition: (from: { shaderKey: string | null; mediaKey: string | null; modelSettings: ModelSettings | null; htmlSettings: HtmlSettings | null; }, to: { shaderKey: string | null; mediaKey: string | null; modelSettings: ModelSettings | null; htmlSettings: HtmlSettings | null; }) => void;
}
export const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);
export const usePlayback = () => {
    const context = useContext(PlaybackContext);
    if (!context) throw new Error('usePlayback must be used within a PlaybackProvider');
    return context;
};


// --- PROVIDER COMPONENT ---
export const SequencerAndPlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- CONTEXT HOOKS ---
    const { setSelectedItem, selectedItem, isSessionLoading } = useUI();
    const { userShaders, userImages, userVideos, userModels, userHtml, defaultShaderKeys } = useLibrary();

    // --- SEQUENCER STATE ---
    const [shaderSequences, setShaderSequences] = useState<(string|null)[][]>(createInitialShaderSequences());
    const [mediaSequences, setMediaSequences] = useState<MediaSequenceItem[][]>(createInitialMediaSequences());
    const [currentPage, setCurrentPage] = useState(0);
    const [pageControls, setPageControls] = useState<ControlSettings[]>(createDefaultPageControls());
    const [sequencerSteps, setSequencerSteps] = useState(DEFAULT_SEQUENCER_STEPS);
    const [isLoopingEnabled, setIsLoopingEnabled] = useState(false);
    const [loopStart, setLoopStart] = useState(0);
    const [loopEnd, setLoopEnd] = useState(DEFAULT_SEQUENCER_STEPS - 1);
    const [editableStep, setEditableStep] = useState(0);
    const [activeShaderKey, setActiveShaderKey] = useState(BLACK_SHADER_KEY);
    const [isSelectingLoop, setIsSelectingLoop] = useState(false);

    // --- PLAYBACK STATE ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [liveVjStep, setLiveVjStep] = useState<number | null>(null);
    const [transitionState, setTransitionState] = useState({
        fromShaderKey: BLACK_SHADER_KEY, toShaderKey: BLACK_SHADER_KEY,
        fromMediaKey: null as string | null, toMediaKey: null as string | null,
        fromModelSettings: null as ModelSettings | null,
        toModelSettings: null as ModelSettings | null,
        fromHtmlSettings: null as HtmlSettings | null,
        toHtmlSettings: null as HtmlSettings | null,
        isTransitioning: false, transitionProgress: 0,
    });

    // --- REFS ---
    const transitionRafRef = useRef<number | null>(null);
    const liveVjTimeoutRef = useRef<number | null>(null);
    const loopSelectionStartRef = useRef<number | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);
    const transitionStateRef = useRef(transitionState);
    useEffect(() => {
        transitionStateRef.current = transitionState;
    }, [transitionState]);


    // --- TRANSITION LOGIC ---
    const startTransition = useCallback((from: { shaderKey: string | null; mediaKey: string | null; modelSettings: ModelSettings | null; htmlSettings: HtmlSettings | null }, to: { shaderKey: string | null; mediaKey: string | null; modelSettings: ModelSettings | null; htmlSettings: HtmlSettings | null }) => {
        if (transitionRafRef.current) cancelAnimationFrame(transitionRafRef.current);
        const fromShaderKey = from.shaderKey || BLACK_SHADER_KEY;
        const toShaderKey = to.shaderKey || BLACK_SHADER_KEY;

        const settingsAreEqual = JSON.stringify(from.modelSettings) === JSON.stringify(to.modelSettings) && JSON.stringify(from.htmlSettings) === JSON.stringify(to.htmlSettings);

        if (fromShaderKey === toShaderKey && from.mediaKey === to.mediaKey && settingsAreEqual) {
           setTransitionState(prev => ({ ...prev, isTransitioning: false, fromShaderKey: toShaderKey, toShaderKey: toShaderKey, fromMediaKey: to.mediaKey, toMediaKey: to.mediaKey, fromModelSettings: to.modelSettings, toModelSettings: to.modelSettings, fromHtmlSettings: to.htmlSettings, toHtmlSettings: to.htmlSettings }));
           setActiveShaderKey(toShaderKey);
           return;
        }

        setTransitionState({ fromShaderKey, toShaderKey, fromMediaKey: from.mediaKey, toMediaKey: to.mediaKey, fromModelSettings: from.modelSettings, toModelSettings: to.modelSettings, fromHtmlSettings: from.htmlSettings, toHtmlSettings: to.htmlSettings, isTransitioning: true, transitionProgress: 0 });
        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / TRANSITION_DURATION_MS, 1.0);
            setTransitionState(prev => ({ ...prev, transitionProgress: progress }));

            if (progress < 1.0) {
                transitionRafRef.current = requestAnimationFrame(animate);
            } else {
                setTransitionState({ isTransitioning: false, fromShaderKey: toShaderKey, toShaderKey: toShaderKey, fromMediaKey: to.mediaKey, toMediaKey: to.mediaKey, fromModelSettings: to.modelSettings, toModelSettings: to.modelSettings, fromHtmlSettings: to.htmlSettings, toHtmlSettings: to.htmlSettings, transitionProgress: 0 });
                setActiveShaderKey(toShaderKey);
                transitionRafRef.current = null;
            }
        };
        transitionRafRef.current = requestAnimationFrame(animate);
    }, [setActiveShaderKey]);


    // --- PLAYBACK LOGIC ---
    const advanceSequence = useCallback(() => {
        if (!isPlaying) return;
        if (isLoopingEnabled) {
            let nextStep = -1;
            let searchStart = (currentStep + 1 > loopEnd) ? loopStart : currentStep + 1;
            for (let i = 0; i <= loopEnd - loopStart; i++) {
                const step = (searchStart + i - loopStart) % (loopEnd - loopStart + 1) + loopStart;
                if (shaderSequences[currentPage][step] || mediaSequences[currentPage][step]?.key) {
                    nextStep = step;
                    break;
                }
            }
            if (nextStep !== -1) {
                const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey, modelSettings: transitionStateRef.current.toModelSettings, htmlSettings: transitionStateRef.current.toHtmlSettings };
                const nextMediaItem = mediaSequences[currentPage][nextStep];
                const isModel = !!(nextMediaItem?.key && userModels[nextMediaItem.key]);
                const isHtml = !!(nextMediaItem?.key && userHtml[nextMediaItem.key]);
                const to = {
                    shaderKey: shaderSequences[currentPage][nextStep] || BLACK_SHADER_KEY,
                    mediaKey: nextMediaItem?.key || null,
                    modelSettings: isModel ? (nextMediaItem.modelSettings || defaultModelSettings) : null,
                    htmlSettings: isHtml ? (nextMediaItem.htmlSettings || defaultHtmlSettings) : null
                };
                startTransition(from, to);
                setCurrentStep(nextStep);
            } else {
                setIsPlaying(false);
            }
            return;
        }
        let searchPage = currentPage;
        let searchStep = currentStep + 1;
        const startSearchPage = currentPage;
        const startSearchStep = currentStep;
        do {
            if (searchStep >= sequencerSteps) { searchStep = 0; searchPage = (searchPage + 1) % NUM_PAGES; }
            if (shaderSequences[searchPage][searchStep] || mediaSequences[searchPage][searchStep]?.key) {
                const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey, modelSettings: transitionStateRef.current.toModelSettings, htmlSettings: transitionStateRef.current.toHtmlSettings };
                const nextMediaItem = mediaSequences[searchPage][searchStep];
                const isModel = !!(nextMediaItem?.key && userModels[nextMediaItem.key]);
                const isHtml = !!(nextMediaItem?.key && userHtml[nextMediaItem.key]);
                const to = {
                    shaderKey: shaderSequences[searchPage][searchStep] || BLACK_SHADER_KEY,
                    mediaKey: nextMediaItem?.key || null,
                    modelSettings: isModel ? (nextMediaItem.modelSettings || defaultModelSettings) : null,
                    htmlSettings: isHtml ? (nextMediaItem.htmlSettings || defaultHtmlSettings) : null
                };
                startTransition(from, to);
                if (currentPage !== searchPage) setCurrentPage(searchPage);
                setCurrentStep(searchStep);
                return;
            }
            searchStep++;
        } while (searchPage !== startSearchPage || searchStep !== startSearchStep);
        setIsPlaying(false);
    }, [isPlaying, isLoopingEnabled, currentStep, loopEnd, loopStart, shaderSequences, currentPage, mediaSequences, sequencerSteps, startTransition, setCurrentPage, userModels, userHtml]);

    const togglePlay = useCallback(() => {
        setIsPlaying(prevIsPlaying => {
            if (!prevIsPlaying) {
                let firstStepFound = false;
                let startSearchPage = currentPage;
                let startSearchStep = editableStep;

                if (isLoopingEnabled) {
                    startSearchPage = currentPage;
                    if (editableStep >= loopStart && editableStep <= loopEnd) {
                        startSearchStep = editableStep;
                    } else {
                        startSearchStep = loopStart;
                    }
                }

                let searchPage = startSearchPage;
                let searchStep = startSearchStep;

                do {
                    if (shaderSequences[searchPage][searchStep] || mediaSequences[searchPage][searchStep]?.key) {
                        const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey, modelSettings: transitionStateRef.current.toModelSettings, htmlSettings: transitionStateRef.current.toHtmlSettings };
                        const mediaItem = mediaSequences[searchPage][searchStep];
                        const isModel = !!(mediaItem?.key && userModels[mediaItem.key]);
                        const isHtml = !!(mediaItem?.key && userHtml[mediaItem.key]);
                        const to = {
                            shaderKey: shaderSequences[searchPage][searchStep] || BLACK_SHADER_KEY,
                            mediaKey: mediaItem?.key || null,
                            modelSettings: isModel ? (mediaItem.modelSettings || defaultModelSettings) : null,
                            htmlSettings: isHtml ? (mediaItem.htmlSettings || defaultHtmlSettings) : null
                        };
                        startTransition(from, to);
                        if (currentPage !== searchPage) setCurrentPage(searchPage);
                        setCurrentStep(searchStep);
                        firstStepFound = true;
                        break;
                    }
                    searchStep = (searchStep + 1);
                    if (isLoopingEnabled) {
                        if (searchStep > loopEnd) searchStep = loopStart;
                    } else {
                        if (searchStep >= sequencerSteps) {
                            searchStep = 0;
                            searchPage = (searchPage + 1) % NUM_PAGES;
                        }
                    }
                } while(searchPage !== startSearchPage || searchStep !== startSearchStep);

                return firstStepFound;
            }
            return false;
        });
    }, [startTransition, currentPage, editableStep, shaderSequences, mediaSequences, sequencerSteps, isLoopingEnabled, loopStart, loopEnd, setCurrentPage, userModels, userHtml]);

    const triggerLiveVjStep = useCallback((stepIndex: number) => {
        if (stepIndex >= sequencerSteps) return;
        if (liveVjTimeoutRef.current) clearTimeout(liveVjTimeoutRef.current);
        setLiveVjStep(stepIndex);
        const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey, modelSettings: transitionStateRef.current.toModelSettings, htmlSettings: transitionStateRef.current.toHtmlSettings };
        const mediaItem = mediaSequences[currentPage][stepIndex];
        const isModel = !!(mediaItem?.key && userModels[mediaItem.key]);
        const isHtml = !!(mediaItem?.key && userHtml[mediaItem.key]);
        const to = {
            shaderKey: shaderSequences[currentPage][stepIndex] || BLACK_SHADER_KEY,
            mediaKey: mediaItem?.key || null,
            modelSettings: isModel ? (mediaItem.modelSettings || defaultModelSettings) : null,
            htmlSettings: isHtml ? (mediaItem.htmlSettings || defaultHtmlSettings) : null
        };
        startTransition(from, to);
        if (isPlaying) {
            setCurrentStep(stepIndex);
            liveVjTimeoutRef.current = window.setTimeout(() => setLiveVjStep(null), 50);
        } else {
            const stepDuration = 60 / pageControls[currentPage].stepsPerMinute;
            liveVjTimeoutRef.current = window.setTimeout(() => {
                setLiveVjStep(null);
                const backToMediaItem = mediaSequences[currentPage][editableStep];
                const isBackToModel = !!(backToMediaItem?.key && userModels[backToMediaItem.key]);
                const isBackToHtml = !!(backToMediaItem?.key && userHtml[backToMediaItem.key]);
                const backTo = {
                    shaderKey: shaderSequences[currentPage][editableStep] || BLACK_SHADER_KEY,
                    mediaKey: backToMediaItem?.key || null,
                    modelSettings: isBackToModel ? (backToMediaItem.modelSettings || defaultModelSettings) : null,
                    htmlSettings: isBackToHtml ? (backToMediaItem.htmlSettings || defaultHtmlSettings) : null
                };
                startTransition(to, backTo);
            }, stepDuration * 1000);
        }
    }, [startTransition, sequencerSteps, shaderSequences, currentPage, mediaSequences, isPlaying, pageControls, editableStep, userModels, userHtml]);

    // --- SEQUENCER LOGIC ---
    const handleStepClick = useCallback((index: number, type: 'media' | 'shader', event: React.MouseEvent) => {
        if (event.shiftKey) { setLoopStart(prev => { if (index > loopEnd) setLoopEnd(index); return index; }); return; }
        if (event.ctrlKey || event.metaKey) { setLoopEnd(prev => { if (index < loopStart) setLoopStart(index); return index; }); return; }
        setEditableStep(index);
        if (!selectedItem) return;

        const isSelectedMedia = !!(userImages[selectedItem] || userVideos[selectedItem] || userModels[selectedItem] || userHtml[selectedItem]);

        // Shader assignment logic
        if (type === 'shader' && !isSelectedMedia) {
            setShaderSequences(prev => {
                const newSequences = JSON.parse(JSON.stringify(prev));
                const newShader = newSequences[currentPage][index] === selectedItem ? null : selectedItem;
                newSequences[currentPage][index] = newShader;
                return newSequences;
            });
            return;
        }

        // Media assignment logic
        if (type === 'media' && isSelectedMedia) {
            const currentKeyInStep = mediaSequences[currentPage]?.[index]?.key;

            // If clicking the same item to clear the step
            if (currentKeyInStep === selectedItem) {
                setMediaSequences(prev => {
                    const newSequences = JSON.parse(JSON.stringify(prev));
                    newSequences[currentPage][index] = { key: null };
                    return newSequences;
                });
                return;
            }

            // Simplified assignment for all media types
            setMediaSequences(prev => {
                const newSequences = JSON.parse(JSON.stringify(prev));
                newSequences[currentPage][index] = { ...newSequences[currentPage][index], key: selectedItem };
                return newSequences;
            });
        }
    }, [
        selectedItem, currentPage, loopStart, loopEnd, setLoopStart, setLoopEnd,
        userImages, userVideos, userModels, userHtml,
        mediaSequences, setEditableStep, setShaderSequences, setMediaSequences
    ]);

    const handleControlChange = useCallback((field: keyof ControlSettings, value: number | boolean | string) => {
        setPageControls(p => {
            const newControls = [...p];
            // @ts-ignore - This is safe because we control the inputs.
            newControls[currentPage] = { ...newControls[currentPage], [field]: value };
            return newControls;
        });
    }, [currentPage]);

    const handleStepModelSettingsChange = useCallback((stepIndex: number, field: keyof ModelSettings, value: number | boolean | string) => {
        setMediaSequences(prev => {
            const newSequences = JSON.parse(JSON.stringify(prev));
            const step = newSequences[currentPage][stepIndex];
            if (step) {
                if (!step.modelSettings) {
                    // Initialize from defaults if it doesn't exist
                    step.modelSettings = { ...defaultModelSettings };
                }
                // @ts-ignore
                step.modelSettings[field] = value;
            }
            return newSequences;
        });
    }, [currentPage]);

    const handleStepHtmlSettingsChange = useCallback((stepIndex: number, field: keyof HtmlSettings, value: string | number | boolean) => {
        setMediaSequences(prev => {
            const newSequences = JSON.parse(JSON.stringify(prev));
            const step = newSequences[currentPage][stepIndex];
            if (step) {
                if (!step.htmlSettings) {
                    step.htmlSettings = { ...defaultHtmlSettings };
                }
                // @ts-ignore
                step.htmlSettings[field] = value;
            }
            return newSequences;
        });
    }, [currentPage]);

    const handlePageChange = useCallback((newPageIndex: number) => {
        setCurrentPage(newPageIndex);
    }, []);

    const handleSequencerStepsChange = useCallback((newSteps: number) => {
        if (!SEQUENCER_STEP_OPTIONS.includes(newSteps)) return;
        setSequencerSteps(newSteps);
        setLoopStart(0);
        setLoopEnd(newSteps - 1);
        setEditableStep(prev => Math.min(prev, newSteps - 1));
    }, []);

    const startLoopSelection = useCallback((index: number) => {
        setIsSelectingLoop(true);
        loopSelectionStartRef.current = index;
        setLoopStart(index);
        setLoopEnd(index);
    }, []);

    const updateLoopSelection = useCallback((index: number) => {
        if (!isSelectingLoop || loopSelectionStartRef.current === null) return;
        const start = loopSelectionStartRef.current;
        setLoopStart(Math.min(start, index));
        setLoopEnd(Math.max(start, index));
    }, [isSelectingLoop]);

    const endLoopSelection = useCallback(() => {
        if (isSelectingLoop) setIsSelectingLoop(false);
    }, [isSelectingLoop]);

    const addMediaToSequencer = useCallback((keys: string[]) => {
        if (!keys || keys.length === 0) return;
        let pageIdx = currentPage;
        let stepIdx = editableStep;
        const newSequences = JSON.parse(JSON.stringify(mediaSequences));
        for (const key of keys) {
            newSequences[pageIdx][stepIdx] = { key };
            stepIdx++;
            if (stepIdx >= sequencerSteps) {
                stepIdx = 0;
                pageIdx = (pageIdx + 1) % NUM_PAGES;
            }
        }
        setMediaSequences(newSequences);
        setCurrentPage(pageIdx);
        setEditableStep(stepIdx);
    }, [currentPage, editableStep, sequencerSteps, mediaSequences]);

    const renameSequencerItem = useCallback((oldKey: string, newKey: string) => {
        const rename = (sequences: any[][]) => sequences.map(page =>
            page.map(item => {
                if (typeof item === 'string' && item === oldKey) {
                    return newKey;
                }
                if (typeof item === 'object' && item?.key === oldKey) {
                    return { ...item, key: newKey };
                }
                return item;
            })
        );
        setShaderSequences(rename);
        setMediaSequences(rename as (prev: MediaSequenceItem[][]) => MediaSequenceItem[][]);

        setTransitionState(prev => {
            let needsUpdate = false;
            const newState = { ...prev };
            if (newState.fromShaderKey === oldKey) { newState.fromShaderKey = newKey; needsUpdate = true; }
            if (newState.toShaderKey === oldKey) { newState.toShaderKey = newKey; needsUpdate = true; }
            if (newState.fromMediaKey === oldKey) { newState.fromMediaKey = newKey; needsUpdate = true; }
            if (newState.toMediaKey === oldKey) { newState.toMediaKey = newKey; needsUpdate = true; }
            return needsUpdate ? newState : prev;
        });

        setActiveShaderKey(prev => prev === oldKey ? newKey : prev);
    }, []);

    // --- EFFECTS ---
    const advanceSequenceRef = useRef(advanceSequence);
    useEffect(() => {
        advanceSequenceRef.current = advanceSequence;
    }, [advanceSequence]);

    // Effect for handling video playback in preview (edit) mode
    useEffect(() => {
        if (isPlaying) return;

        const stepMediaKey = mediaSequences[currentPage]?.[editableStep]?.key || null;
        const activeMediaKeys = new Set<string>();
        if (transitionState.fromMediaKey) activeMediaKeys.add(transitionState.fromMediaKey);
        if (transitionState.toMediaKey) activeMediaKeys.add(transitionState.toMediaKey);

        Object.entries(userVideos).forEach(([key, videoInfo]: [string, UserVideo]) => {
            if (!videoInfo.element) return;

            const isStepVideo = key === stepMediaKey;
            const isActiveInViewport = activeMediaKeys.has(key);
            const shouldPlay = isStepVideo || isActiveInViewport;

            if (shouldPlay) {
                if (videoInfo.element.paused) {
                    videoInfo.element.currentTime = 0;
                    videoInfo.element.loop = true;
                    const playPromise = videoInfo.element.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(e => {
                            if (e.name !== 'AbortError') {
                                 console.error("Error playing preview video:", e);
                            }
                        });
                    }
                }
            } else {
                if (!videoInfo.element.paused) {
                    videoInfo.element.pause();
                }
            }
        });

    }, [isPlaying, currentPage, editableStep, mediaSequences, userVideos, transitionState.fromMediaKey, transitionState.toMediaKey]);

    // Effect for handling sequencer playback (timers and video control)
    useEffect(() => {
        if (!isPlaying || isSessionLoading) {
            Object.values(userVideos).forEach((videoInfo: UserVideo) => {
                if (videoInfo && videoInfo.element && !videoInfo.element.paused) {
                    videoInfo.element.pause();
                }
            });
            return;
        }

        let timerId: number | null = null;

        const advance = () => advanceSequenceRef.current();

        const currentMediaKey = mediaSequences[currentPage]?.[currentStep]?.key;
        const videoInfo = currentMediaKey ? userVideos[currentMediaKey] : null;
        const videoElement = videoInfo?.element;

        const handleVideoEnd = () => {
            advance();
        };

        if (videoElement) {
            videoElement.loop = false;
            if (videoElement.paused) {
                videoElement.currentTime = 0;
                videoElement.play().catch(e => { if (e.name !== 'AbortError') console.error("Video play error:", e); });
            }
            videoElement.addEventListener('ended', handleVideoEnd, { once: true });
        } else {
            const duration = 60000 / pageControls[currentPage].stepsPerMinute;
            timerId = window.setTimeout(advance, duration);
        }

        return () => {
            if (timerId) clearTimeout(timerId);
            if (videoElement) {
                videoElement.removeEventListener('ended', handleVideoEnd);
            }
        };
    }, [isPlaying, isSessionLoading, currentStep, currentPage, pageControls, mediaSequences, userVideos]);

    // Effect for handling video playback in main viewport (canvas)
    // Videos need to be playing for WebGL textures to update
    useEffect(() => {
        if (isSessionLoading) return;

        const activeMediaKeys = new Set<string>();
        if (transitionState.fromMediaKey) activeMediaKeys.add(transitionState.fromMediaKey);
        if (transitionState.toMediaKey) activeMediaKeys.add(transitionState.toMediaKey);

        Object.entries(userVideos).forEach(([key, videoInfo]: [string, UserVideo]) => {
            if (!videoInfo.element) return;

            const isActiveInViewport = activeMediaKeys.has(key);
            const isCurrentStepVideo = mediaSequences[currentPage]?.[currentStep]?.key === key;
            const isEditableStepVideo = !isPlaying && mediaSequences[currentPage]?.[editableStep]?.key === key;

            // Play video if it's active in viewport OR if it's the current/editable step video
            const shouldPlay = isActiveInViewport || isCurrentStepVideo || isEditableStepVideo;

            if (shouldPlay) {
                if (videoInfo.element.paused) {
                    // For viewport videos, loop them so they keep playing
                    if (isActiveInViewport && !isCurrentStepVideo && !isEditableStepVideo) {
                        videoInfo.element.loop = true;
                    }
                    videoInfo.element.play().catch(e => {
                        if (e.name !== 'AbortError') {
                            console.error("Error playing viewport video:", e);
                        }
                    });
                }
            } else {
                // Pause video if it's not active
                if (!videoInfo.element.paused) {
                    videoInfo.element.pause();
                }
            }
        });
    }, [transitionState.fromMediaKey, transitionState.toMediaKey, isPlaying, isSessionLoading, currentStep, currentPage, editableStep, mediaSequences, userVideos]);

    useEffect(() => {
        const firstKey = Object.keys(SHADERS_CATEGORIZED.sources)[0] || BLACK_SHADER_KEY;
        setSelectedItem(firstKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
            const appState = { version: STATE_VERSION, shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled, loopStart, loopEnd };
            localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(appState));
        }, 250);
    }, [shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled, loopStart, loopEnd]);

    // Main Preview Logic
    useEffect(() => {
        if (isPlaying) return;

        const currentTransitionState = transitionStateRef.current;

        const stepShaderKey = shaderSequences[currentPage]?.[editableStep] || null;
        const stepMediaItem = mediaSequences[currentPage]?.[editableStep];
        const stepMediaKey = stepMediaItem?.key || null;

        const isModel = !!(stepMediaKey && userModels[stepMediaKey]);
        const isHtml = !!(stepMediaKey && userHtml[stepMediaKey]);

        const previewShaderKey = stepShaderKey || BLACK_SHADER_KEY;
        const previewMediaKey = stepMediaKey;
        const previewModelSettings = isModel ? (stepMediaItem?.modelSettings || defaultModelSettings) : null;
        const previewHtmlSettings = isHtml ? (stepMediaItem?.htmlSettings || defaultHtmlSettings) : null;

        const settingsAreEqual = JSON.stringify(previewModelSettings) === JSON.stringify(currentTransitionState.toModelSettings) && JSON.stringify(previewHtmlSettings) === JSON.stringify(currentTransitionState.toHtmlSettings);

        if (previewShaderKey !== currentTransitionState.toShaderKey || previewMediaKey !== currentTransitionState.toMediaKey || !settingsAreEqual) {
            const from = {
                shaderKey: currentTransitionState.toShaderKey,
                mediaKey: currentTransitionState.toMediaKey,
                modelSettings: currentTransitionState.toModelSettings,
                htmlSettings: currentTransitionState.toHtmlSettings
            };
            const to = {
                shaderKey: previewShaderKey,
                mediaKey: previewMediaKey,
                modelSettings: previewModelSettings,
                htmlSettings: previewHtmlSettings
            };
            startTransition(from, to);
        }
    }, [
        isPlaying, currentPage, editableStep, shaderSequences, mediaSequences, userModels, userHtml, startTransition
    ]);

    // Effect to clean up sequences if an item is deleted from the library
    useEffect(() => {
        if (isSessionLoading) return;

        const allValidShaderKeys = [...defaultShaderKeys, ...Object.keys(userShaders)];
        const allValidMediaKeys = [...Object.keys(userImages), ...Object.keys(userVideos), ...Object.keys(userModels), ...Object.keys(userHtml)];

        setShaderSequences(prevSequences => {
            let changed = false;
            const newSequences = prevSequences.map(page =>
                page.map(key => {
                    if (key && !allValidShaderKeys.includes(key)) {
                        changed = true;
                        return null;
                    }
                    return key;
                })
            );
            return changed ? newSequences : prevSequences;
        });

        setMediaSequences(prevSequences => {
            let changed = false;
            const newSequences = prevSequences.map(page =>
                page.map(item => {
                    if (item && item.key && !allValidMediaKeys.includes(item.key)) {
                        changed = true;
                        return { key: null };
                    }
                    return item;
                })
            );
            return changed ? newSequences : prevSequences;
        });
    }, [userShaders, userImages, userVideos, userModels, userHtml, defaultShaderKeys, isSessionLoading, setShaderSequences, setMediaSequences]);

    // --- CONTEXT VALUES ---
    const sequencerValue: SequencerContextValue = useMemo(() => ({
        shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled,
        loopStart, loopEnd, editableStep, activeShaderKey, isSelectingLoop,
        setMediaSequences, setShaderSequences, setPageControls, setSequencerSteps,
        setIsLoopingEnabled, setLoopStart, setLoopEnd, setCurrentPage,
        handleControlChange, handleStepModelSettingsChange, handleStepHtmlSettingsChange, handlePageChange, handleSequencerStepsChange, handleStepClick,
        toggleLoop: () => setIsLoopingEnabled(p => !p),
        shiftLoop: (dir: 'left' | 'right') => { const shift = dir === 'left' ? -1 : 1; if ((dir === 'left' && loopStart > 0) || (dir === 'right' && loopEnd < sequencerSteps - 1)) { setLoopStart(p => p + shift); setLoopEnd(p => p + shift); }},
        setEditableStep,
        startLoopSelection, updateLoopSelection, endLoopSelection,
        addMediaToSequencer,
        setActiveShaderKey,
        renameSequencerItem,
    }), [
        shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled,
        loopStart, loopEnd, editableStep, activeShaderKey, isSelectingLoop,
        handleControlChange, handleStepModelSettingsChange, handleStepHtmlSettingsChange, handlePageChange, handleSequencerStepsChange, handleStepClick,
        startLoopSelection, updateLoopSelection, endLoopSelection, addMediaToSequencer,
        setActiveShaderKey, renameSequencerItem
    ]);

    const playbackValue: PlaybackContextValue = useMemo(() => ({
        isPlaying, currentStep, liveVjStep, transitionState,
        togglePlay, advanceSequence, triggerLiveVjStep, startTransition,
    }), [isPlaying, currentStep, liveVjStep, transitionState, togglePlay, advanceSequence, triggerLiveVjStep, startTransition]);

    return (
        <SequencerContext.Provider value={sequencerValue}>
            <PlaybackContext.Provider value={playbackValue}>
                {children}
            </PlaybackContext.Provider>
        </SequencerContext.Provider>
    );
};