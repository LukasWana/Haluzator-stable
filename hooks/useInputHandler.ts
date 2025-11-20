
import React, { useEffect, useRef } from 'react';
import { useUI } from '../contexts/UIContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useDevice } from '../contexts/DeviceContext';
import { useSequencer, usePlayback } from '../contexts/SequencerAndPlaybackProvider';
import { NUM_PAGES, defaultControls } from '../constants';
import type { ControlSettings } from '../types';

declare var WebMidi: any;

export const useInputHandler = () => {
    const { isAddShaderModalOpen, isAddMediaModalOpen, isHelpModalOpen } = useUI();
    const { 
        currentPage, pageControls, sequencerSteps, editableStep,
        handleControlChange, handlePageChange, setEditableStep, 
        handleStepClick, shiftLoop,
        setLoopStart, setLoopEnd, toggleLoop
    } = useSequencer();
    const { togglePlay, triggerLiveVjStep } = usePlayback();
    const { setSelectedItem } = useUI();
    const { defaultShaderKeys, userShaders } = useLibrary();
    const { midiInputs, selectedMidiInputId, setMidiInputs, setSelectedMidiInputId, toggleAudio } = useDevice();

    const midiAccessRef = useRef<any | null>(null);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAddShaderModalOpen || isAddMediaModalOpen || isHelpModalOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key.toLowerCase();
            const controls = pageControls[currentPage] || defaultControls;
            let valueChanged = false;
            const step = 2;

            switch (key) {
                case 'a': handleControlChange('overlayOpacity', Math.max(0, controls.overlayOpacity - step)); valueChanged = true; break;
                case 's': handleControlChange('overlayOpacity', Math.min(100, controls.overlayOpacity + step)); valueChanged = true; break;
                case 'd': handleControlChange('audioInfluence', Math.max(0, controls.audioInfluence - step)); valueChanged = true; break;
                case 'f': handleControlChange('audioInfluence', Math.min(100, controls.audioInfluence + step)); valueChanged = true; break;
                case 'g': handleControlChange('blurAmount', Math.max(0, controls.blurAmount - step)); valueChanged = true; break;
                case 'h': handleControlChange('blurAmount', Math.min(100, controls.blurAmount + step)); valueChanged = true; break;
                case 'j': handleControlChange('hueShift', Math.max(0, controls.hueShift - step)); valueChanged = true; break;
                case 'k': handleControlChange('hueShift', Math.min(100, controls.hueShift + step)); valueChanged = true; break;
                case 'l': handleControlChange('mandalaSegments', Math.max(1, controls.mandalaSegments - 1)); valueChanged = true; break;
                case ';': handleControlChange('mandalaSegments', Math.min(16, controls.mandalaSegments + 1)); valueChanged = true; break;
            }
            if (valueChanged) { e.preventDefault(); return; }

            const pageKey = parseInt(e.key, 10);
            if (!isNaN(pageKey) && pageKey >= 1 && pageKey <= NUM_PAGES) {
                e.preventDefault();
                handlePageChange(pageKey - 1);
                return;
            }

            if (e.key === 'ArrowRight') { e.preventDefault(); setEditableStep((editableStep + 1) % sequencerSteps); return; }
            if (e.key === 'ArrowLeft') { e.preventDefault(); setEditableStep((editableStep - 1 + sequencerSteps) % sequencerSteps); return; }
            if (e.key === 'Enter') {
                e.preventDefault();
                const mockEvent = new MouseEvent('click') as unknown as React.MouseEvent;
                const editableStepType = (document.querySelector(`.sequencer-step[data-index="${editableStep}"]`) as HTMLElement)?.dataset.type as 'media' | 'shader' | undefined;
                if (editableStepType) handleStepClick(editableStep, editableStepType, mockEvent);
                return;
            }
            if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
            if (e.key === '[' || e.code === 'BracketLeft') { e.preventDefault(); shiftLoop('left'); return; }
            if (e.key === ']' || e.code === 'BracketRight') { e.preventDefault(); shiftLoop('right'); return; }

            const sequencerKeys = 'qwertyui';
            const stepIndex = sequencerKeys.indexOf(key);
            if (stepIndex !== -1) { 
                e.preventDefault(); 
                triggerLiveVjStep(stepIndex);
            }

            const shaderSelectorKeys = 'asdfghjklzxcvbnm';
            const shaderKeyIndex = shaderSelectorKeys.indexOf(key);
            if (shaderKeyIndex !== -1) {
                e.preventDefault();
                const shaderKeysToMap = [...defaultShaderKeys, ...Object.keys(userShaders)];
                if (shaderKeyIndex < shaderKeysToMap.length) {
                    setSelectedItem(shaderKeysToMap[shaderKeyIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAddShaderModalOpen, isAddMediaModalOpen, isHelpModalOpen, pageControls, currentPage, editableStep, sequencerSteps, handleControlChange, handlePageChange, setEditableStep, handleStepClick, togglePlay, shiftLoop, triggerLiveVjStep, setSelectedItem, defaultShaderKeys, userShaders]);
    
    // MIDI Initialization and Handling
    useEffect(() => {
        const enableMidi = async () => {
            try {
                await WebMidi.enable();
                midiAccessRef.current = WebMidi;
                setMidiInputs(WebMidi.inputs);
                const nanoKontrol = WebMidi.inputs.find(input => input.name.toLowerCase().includes('nanokontrol'));
                if (nanoKontrol) setSelectedMidiInputId(nanoKontrol.id);
                WebMidi.addListener("connected", () => setMidiInputs(WebMidi.inputs));
                WebMidi.addListener("disconnected", () => setMidiInputs(WebMidi.inputs));
            } catch (err) { console.error("Could not enable WebMidi.", err); }
        };
        enableMidi();
        return () => { if (midiAccessRef.current) { WebMidi.removeListener(); WebMidi.disable(); }};
    }, [setMidiInputs, setSelectedMidiInputId]);
    
    useEffect(() => {
        const ccMap: Record<number, { name: keyof ControlSettings; max?: number, min?: number }> = {
            16: { name: 'levelHighlights' }, 17: { name: 'levelMidtones' }, 18: { name: 'levelShadows' },
            19: { name: 'saturation' }, 20: { name: 'hueShift' }, 21: { name: 'glowAmount' },
            22: { name: 'zoom' }, 23: { name: 'mandalaSegments', max: 16, min: 1 },
            0: { name: 'overlayOpacity' }, 1: { name: 'blurAmount' }, 2: { name: 'chromaAmount' },
            3: { name: 'speed' }, 5: { name: 'stepsPerMinute', max: 120, min: 6 }, 6: { name: 'audioInfluence' },
        };
        const handleMidiMessage = (e) => {
            const [status, ccNumber, ccValue] = e.message.data;
            if (status >= 176 && status <= 191) {
                if (ccValue > 0) { // Button presses
                    if (ccNumber === 41 || ccNumber === 42) { togglePlay(); return; }
                    if (ccNumber === 45) { toggleAudio(); return; }
                    if (ccNumber === 58) { handlePageChange((currentPage - 1 + NUM_PAGES) % NUM_PAGES); return; }
                    if (ccNumber === 59) { handlePageChange((currentPage + 1) % NUM_PAGES); return; }
                    if (ccNumber >= 64 && ccNumber <= 71) { triggerLiveVjStep(ccNumber - 64); return; }
                    if (ccNumber === 32) { setLoopStart(editableStep); return; }
                    if (ccNumber === 33) { setLoopEnd(editableStep); return; }
                    if (ccNumber === 34) { toggleLoop(); return; }
                    if (ccNumber === 48) { shiftLoop('left'); return; }
                    if (ccNumber === 49) { shiftLoop('right'); return; }
                }
                const control = ccMap[ccNumber]; // Sliders/Knobs
                if (control) {
                    const max = control.max || 100, min = control.min || 0;
                    const value = Math.round((ccValue / 127) * (max - min) + min);
                    handleControlChange(control.name as keyof typeof defaultControls, value);
                }
            }
        };
        if (midiAccessRef.current && selectedMidiInputId) {
            midiInputs.forEach(input => input.removeListener());
            const currentInput = WebMidi.getInputById(selectedMidiInputId);
            if (currentInput) currentInput.addListener("midimessage", handleMidiMessage);
            return () => { if (currentInput) currentInput.removeListener("midimessage", handleMidiMessage); };
        }
    }, [selectedMidiInputId, midiInputs, currentPage, editableStep, togglePlay, toggleAudio, handlePageChange, triggerLiveVjStep, setLoopStart, setLoopEnd, toggleLoop, shiftLoop, handleControlChange]);
};
