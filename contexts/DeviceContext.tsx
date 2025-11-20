import React, { createContext, useState, useCallback, useMemo, useRef, useContext } from 'react';
import type { DeviceContextValue } from '../types';
import { useUI } from './UIContext';
import { useToast } from '../components/Toast';

export const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setIsProjectingTransition } = useUI();
    const { showWarning } = useToast();

    const [midiInputs, setMidiInputs] = useState<any[]>([]);
    const [selectedMidiInputId, setSelectedMidiInputId] = useState<string>('');
    const [projectionWindow, setProjectionWindow] = useState<Window | null>(null);
    const [audioState, setAudioState] = useState('inactive');
    const audioDataRef = useRef({ low: 0, mid: 0, high: 0, overall: 0 });

    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioLoopRef = useRef<number | null>(null);

    const originalCanvasParentRef = useRef<HTMLElement | null>(null);
    const originalOverlayParentRef = useRef<HTMLElement | null>(null);
    const canvasRefForProjection = useRef<HTMLCanvasElement | null>(null);
    const overlayRefForProjection = useRef<HTMLDivElement | null>(null);

    const toggleAudio = useCallback(async () => {
        if (audioContextRef.current?.state === 'running') {
            audioContextRef.current.close();
            streamRef.current?.getTracks().forEach(track => track.stop());
            if (audioLoopRef.current) cancelAnimationFrame(audioLoopRef.current);
            audioContextRef.current = null; streamRef.current = null; audioLoopRef.current = null;
            setAudioState('inactive');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            const source = context.createMediaStreamSource(stream);
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            setAudioState('active');
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const loop = () => {
                analyser.getByteFrequencyData(dataArray);
                const n = dataArray.length, lE = Math.floor(n * 0.1), mE = Math.floor(n * 0.4);
                let l = 0, m = 0, h = 0;
                for (let i = 0; i < lE; i++) l += dataArray[i];
                for (let i = lE; i < mE; i++) m += dataArray[i];
                for (let i = mE; i < n; i++) h += dataArray[i];
                audioDataRef.current = { low: l / (lE * 255), mid: m / ((mE - lE) * 255), high: h / ((n - mE) * 255), overall: (l + m + h) / (n * 255) };
                audioLoopRef.current = requestAnimationFrame(loop);
            };
            loop();
        } catch (err) { console.error('Error accessing microphone:', err); setAudioState('error'); }
    }, []);

    const handleProjectionToggle = useCallback((canvasElement: HTMLCanvasElement | null, wrapperElement: HTMLDivElement | null, htmlOverlayElement: HTMLDivElement | null) => {
        if (projectionWindow) {
            projectionWindow.close();
        } else {
            if (!canvasElement || !wrapperElement || !htmlOverlayElement) return;
            setIsProjectingTransition(true);
            const newWindow = window.open('', '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no');
            if (newWindow) {
                newWindow.document.title = "Shader Projection";
                newWindow.document.body.style.cssText = 'margin:0;overflow:hidden;background-color:black;';

                // Copy all stylesheets from the main document to the new window
                Array.from(document.styleSheets).forEach(styleSheet => {
                    try {
                        // If we can access the rules, create a <style> tag with the content
                        const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join(' ');
                        const styleElement = newWindow.document.createElement('style');
                        styleElement.textContent = cssRules;
                        newWindow.document.head.appendChild(styleElement);
                    } catch (e) {
                        // If we can't access cssRules (e.g., for cross-origin stylesheets), create a <link> tag
                        if (styleSheet.href) {
                            const linkElement = newWindow.document.createElement('link');
                            linkElement.rel = 'stylesheet';
                            linkElement.href = styleSheet.href;
                            newWindow.document.head.appendChild(linkElement);
                        }
                    }
                });

                originalCanvasParentRef.current = wrapperElement;
                originalOverlayParentRef.current = htmlOverlayElement.parentElement;

                canvasRefForProjection.current = canvasElement;
                overlayRefForProjection.current = htmlOverlayElement;

                newWindow.document.body.appendChild(canvasElement);
                newWindow.document.body.appendChild(htmlOverlayElement);

                newWindow.onbeforeunload = () => {
                    if (originalCanvasParentRef.current && canvasRefForProjection.current) {
                        originalCanvasParentRef.current.prepend(canvasRefForProjection.current);
                    }
                    if (originalOverlayParentRef.current && overlayRefForProjection.current) {
                        originalOverlayParentRef.current.appendChild(overlayRefForProjection.current);
                    }
                    setProjectionWindow(null);
                };
                setProjectionWindow(newWindow);
                setTimeout(() => setIsProjectingTransition(false), 500);
            } else {
                 setIsProjectingTransition(false);
                 showWarning('Popup blocked! Please allow popups for this site.');
            }
        }
    }, [projectionWindow, setIsProjectingTransition]);

    const value = useMemo(() => ({
        midiInputs, selectedMidiInputId, projectionWindow, audioState, audioDataRef,
        setMidiInputs, setSelectedMidiInputId, toggleAudio, handleProjectionToggle,
    }), [midiInputs, selectedMidiInputId, projectionWindow, audioState, toggleAudio, handleProjectionToggle]);

    return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevice = () => {
    const context = useContext(DeviceContext);
    if (!context) throw new Error('useDevice must be used within a DeviceProvider');
    return context;
};