import React, { createContext, useState, useCallback, useMemo, useRef, useContext } from 'react';
import type { DeviceContextValue } from '../types';
import { useUI } from './UIContext';

export const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { setIsProjectingTransition } = useUI();

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

    const handleProjectionToggle = useCallback(async (canvasElement: HTMLCanvasElement | null, wrapperElement: HTMLDivElement | null, htmlOverlayElement: HTMLDivElement | null) => {
        if (projectionWindow) {
            // Close projection window
            projectionWindow.close();
            setProjectionWindow(null);
        } else {
            if (!canvasElement || !wrapperElement || !htmlOverlayElement) return;
            setIsProjectingTransition(true);

            const electronAPI = (window as any).electronAPI;

            // Check if we're in Electron
            if (electronAPI && electronAPI.createProjectionWindow) {
                // Electron mode: use IPC to create projection window
                try {
                    // Set up cleanup listener
                    electronAPI.onProjectionClosed(() => {
                        setProjectionWindow(null);
                    });

                    // Trigger window.open - Electron handler will create projection window
                    // window.open returns null because handler denies it
                    window.open('', '_blank');

                    // Wait for projection window to be created
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Ensure elements have IDs
                    const canvasId = canvasElement.id || 'shader-canvas';
                    const overlayId = htmlOverlayElement.id || 'html-overlay-container';
                    if (!canvasElement.id) canvasElement.id = canvasId;
                    if (!htmlOverlayElement.id) htmlOverlayElement.id = overlayId;

                    // Store references for cleanup
                    originalCanvasParentRef.current = wrapperElement;
                    originalOverlayParentRef.current = htmlOverlayElement.parentElement;
                    canvasRefForProjection.current = canvasElement;
                    overlayRefForProjection.current = htmlOverlayElement;

                    // Set up listener for when projection is ready
                    const removeListener = electronAPI.onProjectionReady(async (data) => {
                        try {
                            // Elements are stored in window.__projectionCanvas and __projectionOverlay
                            // Now we need to move them to projection window
                            // We'll use executeJavaScript in projection window to access main window
                            // via a message channel or global variable

                            // Actually, simplest: use executeJavaScript in projection window
                            // to create a script that will use postMessage to request elements
                            // Or use a global variable approach

                            // For now, create proxy window - elements will be moved via IPC
                            const proxyWindow = {
                                close: () => {
                                    // Move elements back
                                    const canvas = (window as any).__projectionCanvas;
                                    const overlay = (window as any).__projectionOverlay;
                                    const canvasParent = (window as any).__projectionCanvasParent;
                                    const overlayParent = (window as any).__projectionOverlayParent;

                                    if (canvasParent && canvas) {
                                        canvasParent.prepend(canvas);
                                    }
                                    if (overlayParent && overlay) {
                                        overlayParent.appendChild(overlay);
                                    }

                                    // Clean up globals
                                    delete (window as any).__projectionCanvas;
                                    delete (window as any).__projectionOverlay;
                                    delete (window as any).__projectionCanvasParent;
                                    delete (window as any).__projectionOverlayParent;

                                    setProjectionWindow(null);
                                },
                                document: null as any,
                            } as Window;

                            // Now move elements to projection window
                            // We'll use executeJavaScript in projection window to access main window
                            // and move elements directly
                            // Since we can't directly access main window from projection window,
                            // we'll use a workaround: create a script in projection window
                            // that will use postMessage to communicate with main window

                            // Actually, better: use executeJavaScript in projection window
                            // to create an iframe that loads main window's content
                            // Or use webContents.executeJavaScript with access to both windows

                            // For now, just set up the proxy window
                            // Elements will be moved when projection window loads
                            setProjectionWindow(proxyWindow);

                            // Wait a bit and then try to move elements
                            setTimeout(() => {
                                // Try to access projection window and move elements
                                // This will be handled by projection window's script
                            }, 500);

                            setIsProjectingTransition(false);
                            removeListener();
                        } catch (error) {
                            console.error('Error setting up projection:', error);
                            setIsProjectingTransition(false);
                            removeListener();
                        }
                    });

                    // Move elements to projection window via IPC
                    const moveResult = await electronAPI.moveElementsToProjection(canvasId, overlayId);

                    if (!moveResult.success) {
                        removeListener();
                        setIsProjectingTransition(false);
                        alert('Failed to move elements: ' + (moveResult.error || 'Unknown error'));
                        return;
                    }

                    // Elements will be moved when projection-ready event fires
                    // Set timeout in case event doesn't fire
                    setTimeout(() => {
                        if (isProjectingTransition) {
                            removeListener();
                            setIsProjectingTransition(false);
                            // Try to access projection window directly
                            // Since we can't, we'll create proxy window anyway
                            const proxyWindow = {
                                close: () => {
                                    if (originalCanvasParentRef.current && canvasRefForProjection.current) {
                                        originalCanvasParentRef.current.prepend(canvasRefForProjection.current);
                                    }
                                    if (originalOverlayParentRef.current && overlayRefForProjection.current) {
                                        originalOverlayParentRef.current.appendChild(overlayRefForProjection.current);
                                    }
                                    setProjectionWindow(null);
                                },
                                document: null as any,
                            } as Window;
                            setProjectionWindow(proxyWindow);
                        }
                    }, 2000);
                } catch (error) {
                    console.error('Failed to open projection window:', error);
                    setIsProjectingTransition(false);
                    alert('Failed to open projection window');
                }
            } else {
                // Browser mode: use original DOM manipulation
                const newWindow = window.open('', '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no');
                if (newWindow) {
                    newWindow.document.title = "Shader Projection";
                    newWindow.document.body.style.cssText = 'margin:0;overflow:hidden;background-color:black;';

                    // Copy all stylesheets from the main document to the new window
                    Array.from(document.styleSheets).forEach(styleSheet => {
                        try {
                            const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join(' ');
                            const styleElement = newWindow.document.createElement('style');
                            styleElement.textContent = cssRules;
                            newWindow.document.head.appendChild(styleElement);
                        } catch (e) {
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
                    alert('Popup blocked! Please allow popups for this site.');
                }
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