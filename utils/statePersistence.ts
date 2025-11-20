import { APP_STATE_STORAGE_KEY, NUM_PAGES, DEFAULT_SEQUENCER_STEPS, STATE_VERSION, defaultControls, MAX_SEQUENCER_STEPS, SEQUENCER_STEP_OPTIONS } from '../constants';
import type { MediaSequenceItem, ControlSettings } from '../types';

export const createEmptyShaderSequence = (steps: number = MAX_SEQUENCER_STEPS) => Array(steps).fill(null);
export const createEmptyMediaSequence = (steps: number = MAX_SEQUENCER_STEPS): MediaSequenceItem[] => Array.from({ length: steps }, () => ({ key: null }));

export const createDefaultPageControls = (): ControlSettings[] => {
    return Array(NUM_PAGES).fill(null).map(() => ({ ...defaultControls }));
};

export const createInitialShaderSequences = () => {
    const allSequences = [];
    for (let i = 0; i < NUM_PAGES; i++) {
        allSequences.push(createEmptyShaderSequence(MAX_SEQUENCER_STEPS));
    }
    return allSequences;
};

export const createInitialMediaSequences = () => {
    const allSequences = [];
    for (let i = 0; i < NUM_PAGES; i++) {
        allSequences.push(createEmptyMediaSequence(MAX_SEQUENCER_STEPS));
    }
    return allSequences;
};

export const loadState = () => {
    try {
        const savedStateJSON = localStorage.getItem(APP_STATE_STORAGE_KEY);
        if (!savedStateJSON) return null;
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.version !== STATE_VERSION) {
            console.warn(`Saved state version mismatch (v${savedState.version} vs v${STATE_VERSION}). Discarding saved state.`);
            localStorage.removeItem(APP_STATE_STORAGE_KEY);
            return null;
        }

        let loadedSequencerSteps = savedState.sequencerSteps || DEFAULT_SEQUENCER_STEPS;
        if (!SEQUENCER_STEP_OPTIONS.includes(loadedSequencerSteps)) {
            loadedSequencerSteps = DEFAULT_SEQUENCER_STEPS;
        }
        savedState.sequencerSteps = loadedSequencerSteps;
        savedState.isLoopingEnabled = savedState.isLoopingEnabled ?? false;
        savedState.loopStart = savedState.loopStart ?? 0;
        savedState.loopEnd = savedState.loopEnd ?? loadedSequencerSteps - 1;


        // Ensure sequences are padded to the max step count, but never truncated.
        const resizeOnLoad = <T,>(sequences: T[][], fillValue: T | (() => T)): T[][] => {
            const newSize = MAX_SEQUENCER_STEPS;
            return (sequences || []).map(page => {
                const currentPage = page || [];
                const oldSize = currentPage.length;
                if (newSize > oldSize) {
                    const toAddLength = newSize - oldSize;
                    const filler: T[] = typeof fillValue === 'function'
                        ? Array.from({ length: toAddLength }, fillValue as () => T)
                        : new Array(toAddLength).fill(fillValue);
                    return [...currentPage, ...filler];
                }
                return currentPage; // Do not truncate
            });
        };
        
        savedState.shaderSequences = resizeOnLoad(savedState.shaderSequences || [], null);
        savedState.mediaSequences = resizeOnLoad(savedState.mediaSequences || [], () => ({ key: null }));

        // Ensure pageControls has the correct number of pages
        if (savedState.pageControls && savedState.pageControls.length !== NUM_PAGES) {
            const newPageControls = createDefaultPageControls();
            for(let i = 0; i < Math.min(savedState.pageControls.length, NUM_PAGES); i++) {
                newPageControls[i] = { ...defaultControls, ...savedState.pageControls[i] };
            }
            savedState.pageControls = newPageControls;
        }

        return savedState;
    } catch (error) {
        console.error("Failed to load state from localStorage", error);
        return null;
    }
};