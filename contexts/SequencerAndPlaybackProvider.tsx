import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { useUI } from './UIContext';
import { useLibrary } from './LibraryContext';
import { loadState, createInitialShaderSequences, createInitialMediaSequences, createDefaultPageControls } from '../utils/statePersistence';
import { APP_STATE_STORAGE_KEY, STATE_VERSION, NUM_PAGES, DEFAULT_SEQUENCER_STEPS, SEQUENCER_STEP_OPTIONS, TRANSITION_DURATION_MS } from '../constants';
import { BLACK_SHADER_KEY } from '../gl/shaders';
import { SHADERS as SHADERS_CATEGORIZED } from '../shaders/index';
import type { ControlSettings, MediaSequenceItem, UserVideo } from '../types';

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
        isTransitioning: boolean;
        transitionProgress: number;
    };
    togglePlay: () => void;
    advanceSequence: () => void;
    triggerLiveVjStep: (stepIndex: number) => void;
    startTransition: (from: { shaderKey: string | null; mediaKey: string | null; }, to: { shaderKey: string | null; mediaKey: string | null; }) => void;
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
    const { userShaders, userImages, userVideos, userModels, defaultShaderKeys } = useLibrary();

    // --- SEQUENCER STATE ---
    const loadedState = loadState();
    const [shaderSequences, setShaderSequences] = useState<(string|null)[][]>(loadedState?.shaderSequences || createInitialShaderSequences());
    const [mediaSequences, setMediaSequences] = useState<MediaSequenceItem[][]>(loadedState?.mediaSequences || createInitialMediaSequences());
    const [currentPage, setCurrentPage] = useState(loadedState?.currentPage || 0);
    const [pageControls, setPageControls] = useState<ControlSettings[]>(loadedState?.pageControls || createDefaultPageControls());
    const [sequencerSteps, setSequencerSteps] = useState(loadedState?.sequencerSteps || DEFAULT_SEQUENCER_STEPS);
    const [isLoopingEnabled, setIsLoopingEnabled] = useState(loadedState?.isLoopingEnabled ?? false);
    const [loopStart, setLoopStart] = useState(loadedState?.loopStart ?? 0);
    const [loopEnd, setLoopEnd] = useState(loadedState?.loopEnd ?? (loadedState?.sequencerSteps ?? DEFAULT_SEQUENCER_STEPS) - 1);
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
    const startTransition = useCallback((from: { shaderKey: string | null; mediaKey: string | null; }, to: { shaderKey: string | null; mediaKey: string | null; }) => {
        if (transitionRafRef.current) cancelAnimationFrame(transitionRafRef.current);
        const fromShaderKey = from.shaderKey || BLACK_SHADER_KEY;
        const toShaderKey = to.shaderKey || BLACK_SHADER_KEY;

        if (fromShaderKey === toShaderKey && from.mediaKey === to.mediaKey) {
           setTransitionState(prev => ({ ...prev, isTransitioning: false, fromShaderKey: toShaderKey, toShaderKey: toShaderKey, fromMediaKey: to.mediaKey, toMediaKey: to.mediaKey }));
           setActiveShaderKey(toShaderKey);
           return;
        }

        setTransitionState({ fromShaderKey, toShaderKey, fromMediaKey: from.mediaKey, toMediaKey: to.mediaKey, isTransitioning: true, transitionProgress: 0 });
        let startTime: number | null = null;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / TRANSITION_DURATION_MS, 1.0);
            setTransitionState(prev => ({ ...prev, transitionProgress: progress }));

            if (progress < 1.0) {
                transitionRafRef.current = requestAnimationFrame(animate);
            } else {
                setTransitionState({ isTransitioning: false, fromShaderKey: toShaderKey, toShaderKey: toShaderKey, fromMediaKey: to.mediaKey, toMediaKey: to.mediaKey, transitionProgress: 0 });
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
                const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey };
                const to = { shaderKey: shaderSequences[currentPage][nextStep] || BLACK_SHADER_KEY, mediaKey: mediaSequences[currentPage][nextStep]?.key || null };
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
                const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey };
                const to = { shaderKey: shaderSequences[searchPage][searchStep] || BLACK_SHADER_KEY, mediaKey: mediaSequences[searchPage][searchStep]?.key || null };
                startTransition(from, to);
                if (currentPage !== searchPage) setCurrentPage(searchPage);
                setCurrentStep(searchStep);
                return;
            }
            searchStep++;
        } while (searchPage !== startSearchPage || searchStep !== startSearchStep);
        setIsPlaying(false);
    }, [isPlaying, isLoopingEnabled, currentStep, loopEnd, loopStart, shaderSequences, currentPage, mediaSequences, sequencerSteps, startTransition, setCurrentPage]);

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
                        const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey };
                        const to = { shaderKey: shaderSequences[searchPage][searchStep] || BLACK_SHADER_KEY, mediaKey: mediaSequences[searchPage][searchStep]?.key || null };
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
    }, [startTransition, currentPage, editableStep, shaderSequences, mediaSequences, sequencerSteps, isLoopingEnabled, loopStart, loopEnd, setCurrentPage]);

    const triggerLiveVjStep = useCallback((stepIndex: number) => {
        if (stepIndex >= sequencerSteps) return;
        if (liveVjTimeoutRef.current) clearTimeout(liveVjTimeoutRef.current);
        setLiveVjStep(stepIndex);
        const from = { shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey };
        const to = { shaderKey: shaderSequences[currentPage][stepIndex] || BLACK_SHADER_KEY, mediaKey: mediaSequences[currentPage][stepIndex]?.key || null };
        startTransition(from, to);
        if (isPlaying) {
            setCurrentStep(stepIndex);
            liveVjTimeoutRef.current = window.setTimeout(() => setLiveVjStep(null), 50);
        } else {
            const stepDuration = 60 / pageControls[currentPage].stepsPerMinute;
            liveVjTimeoutRef.current = window.setTimeout(() => {
                setLiveVjStep(null);
                const backTo = { shaderKey: shaderSequences[currentPage][editableStep] || BLACK_SHADER_KEY, mediaKey: mediaSequences[currentPage][editableStep]?.key || null };
                startTransition(to, backTo);
            }, stepDuration * 1000);
        }
    }, [startTransition, sequencerSteps, shaderSequences, currentPage, mediaSequences, isPlaying, pageControls, editableStep]);

    // --- SEQUENCER LOGIC ---
    const handleStepClick = useCallback((index: number, type: 'media' | 'shader', event: React.MouseEvent) => {
        if (event.shiftKey) { setLoopStart(prev => { if (index > loopEnd) setLoopEnd(index); return index; }); return; }
        if (event.ctrlKey || event.metaKey) { setLoopEnd(prev => { if (index < loopStart) setLoopStart(index); return index; }); return; }
        setEditableStep(index);
        if (!selectedItem) return;

        const isSelectedMedia = !!(userImages[selectedItem] || userVideos[selectedItem] || userModels[selectedItem]);

        const performUpdate = (sequences: any, updateFunc: (seq: any) => void) => {
            const newSequences = JSON.parse(JSON.stringify(sequences));
            updateFunc(newSequences);
            return newSequences;
        };

        const performTransition = (nextShaderKey: string | null, nextMediaKey: string | null) => {
            if (!isPlaying) {
                const to = { shaderKey: nextShaderKey || BLACK_SHADER_KEY, mediaKey: nextMediaKey };
                startTransition({ shaderKey: transitionStateRef.current.toShaderKey, mediaKey: transitionStateRef.current.toMediaKey }, to);
            }
        };

        if (type === 'media' && isSelectedMedia) {
            setMediaSequences(prev => performUpdate(prev, newSequences => {
                const newKey = newSequences[currentPage][index]?.key === selectedItem ? null : selectedItem;
                newSequences[currentPage][index] = { key: newKey };
                // When a step is clicked, the preview should update to that step's content,
                // so we pass the step's shader key along with the new media key.
                performTransition(shaderSequences[currentPage][index], newKey);
            }));
        } else if (type === 'shader' && !isSelectedMedia) {
            setShaderSequences(prev => performUpdate(prev, newSequences => {
                const newShader = newSequences[currentPage][index] === selectedItem ? null : selectedItem;
                newSequences[currentPage][index] = newShader;
                // When a step is clicked, the preview should update to that step's content,
                // so we pass the step's media key along with the new shader key.
                performTransition(newShader, mediaSequences[currentPage][index]?.key);
            }));
        }
    }, [startTransition, selectedItem, isPlaying, currentPage, shaderSequences, mediaSequences, userImages, userVideos, userModels, loopStart, loopEnd]);

    const handleControlChange = useCallback((field: keyof ControlSettings, value: number | boolean | string) => {
        setPageControls(p => {
            const newControls = [...p];
            // @ts-ignore - This is safe because we control the inputs.
            newControls[currentPage] = { ...newControls[currentPage], [field]: value };
            return newControls;
        });
    }, [currentPage]);

    const handlePageChange = useCallback((newPageIndex: number) => {
        setCurrentPage(newPageIndex);
        // This is now handled by the main preview useEffect
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

    // --- EFFECTS ---
    // Effect for handling video playback in preview (edit) mode
    useEffect(() => {
        if (isPlaying) return;

        const stepMediaKey = mediaSequences[currentPage]?.[editableStep]?.key || null;
        // The logic here is different from the main preview. We DO want to preview a selected video.
        // The main preview logic will decide what to render, this just handles playback.
        const isSelectedItemMedia = !!(userImages[selectedItem] || userVideos[selectedItem] || userModels[selectedItem]);
        const previewMediaKey = isSelectedItemMedia ? selectedItem : stepMediaKey;


        Object.entries(userVideos).forEach(([key, videoInfo]: [string, UserVideo]) => {
            if (!videoInfo.element) return;

            if (key === previewMediaKey) {
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

    }, [isPlaying, currentPage, editableStep, mediaSequences, userVideos, selectedItem, userImages, userModels]);

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

        const currentMediaKey = mediaSequences[currentPage]?.[currentStep]?.key;

        Object.entries(userVideos).forEach(([key, videoInfo]: [string, UserVideo]) => {
            if (key !== currentMediaKey && videoInfo.element && !videoInfo.element.paused) {
                videoInfo.element.pause();
            }
        });

        const videoInfo = currentMediaKey ? userVideos[currentMediaKey] : null;
        const videoElement = videoInfo?.element;
        let timerId: number | null = null;

        const handleVideoEnd = () => {
            if (isPlaying) {
                advanceSequence();
            }
        };

        if (videoInfo && videoElement) {
            videoElement.loop = false;
            if (videoElement.paused) {
                videoElement.currentTime = 0;
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        if (e.name !== 'AbortError') {
                            console.error("Error playing sequence video:", e);
                        }
                    });
                }
            }
            videoElement.addEventListener('ended', handleVideoEnd, { once: true });
        } else {
            const duration = 60000 / pageControls[currentPage].stepsPerMinute;
            timerId = window.setTimeout(advanceSequence, duration);
        }

        return () => {
            if (timerId) clearTimeout(timerId);
            if (videoElement) {
                videoElement.removeEventListener('ended', handleVideoEnd);
            }
        };
    }, [isPlaying, currentStep, currentPage, pageControls, mediaSequences, userVideos, advanceSequence, isSessionLoading]);


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
        if (!isPlaying) {
            const stepShaderKey = shaderSequences[currentPage]?.[editableStep] || null;
            const stepMediaKey = mediaSequences[currentPage]?.[editableStep]?.key || null;

            // When not playing, the preview should always reflect the editable step,
            // not the selected item in the library. The selected item is only for assigning.
            const previewShaderKey = stepShaderKey || BLACK_SHADER_KEY;
            const previewMediaKey = stepMediaKey;

            if (previewShaderKey !== transitionState.toShaderKey || previewMediaKey !== transitionState.toMediaKey) {
                startTransition({ shaderKey: transitionState.toShaderKey, mediaKey: transitionState.toMediaKey }, { shaderKey: previewShaderKey, mediaKey: previewMediaKey });
            }
        }
    }, [
        isPlaying, currentPage, editableStep, shaderSequences, mediaSequences,
        transitionState.toShaderKey, transitionState.toMediaKey, startTransition
    ]);

    // Effect to clean up sequences if an item is deleted from the library
    useEffect(() => {
        if (isSessionLoading) return;

        const allValidShaderKeys = [...defaultShaderKeys, ...Object.keys(userShaders)];
        const allValidMediaKeys = [...Object.keys(userImages), ...Object.keys(userVideos), ...Object.keys(userModels)];

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
    }, [userShaders, userImages, userVideos, userModels, defaultShaderKeys, isSessionLoading, setShaderSequences, setMediaSequences]);

    // --- CONTEXT VALUES ---
    const sequencerValue: SequencerContextValue = useMemo(() => ({
        shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled,
        loopStart, loopEnd, editableStep, activeShaderKey, isSelectingLoop,
        setMediaSequences, setShaderSequences, setPageControls, setSequencerSteps,
        setIsLoopingEnabled, setLoopStart, setLoopEnd, setCurrentPage,
        handleControlChange, handlePageChange, handleSequencerStepsChange, handleStepClick,
        toggleLoop: () => setIsLoopingEnabled(p => !p),
        shiftLoop: (dir: 'left' | 'right') => { const shift = dir === 'left' ? -1 : 1; if ((dir === 'left' && loopStart > 0) || (dir === 'right' && loopEnd < sequencerSteps - 1)) { setLoopStart(p => p + shift); setLoopEnd(p => p + shift); }},
        setEditableStep,
        startLoopSelection, updateLoopSelection, endLoopSelection,
        addMediaToSequencer,
        setActiveShaderKey,
    }), [
        shaderSequences, mediaSequences, currentPage, pageControls, sequencerSteps, isLoopingEnabled,
        loopStart, loopEnd, editableStep, activeShaderKey, isSelectingLoop,
        handleControlChange, handlePageChange, handleSequencerStepsChange, handleStepClick,
        startLoopSelection, updateLoopSelection, endLoopSelection, addMediaToSequencer,
        setActiveShaderKey
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