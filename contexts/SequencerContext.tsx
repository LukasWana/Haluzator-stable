import React, { createContext, useContext } from 'react';
import type { ControlSettings, MediaSequenceItem } from '../types';

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
    return context as SequencerContextValue;
};