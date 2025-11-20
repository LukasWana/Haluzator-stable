import React, { createContext, useContext } from 'react';
import type { ModelSettings, HtmlSettings } from '../types';

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
    return context as PlaybackContextValue;
};