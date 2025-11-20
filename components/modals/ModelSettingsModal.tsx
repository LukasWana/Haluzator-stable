import React, { useEffect, useRef, useCallback } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { useSequencer } from '../../contexts/SequencerAndPlaybackProvider';
import { defaultModelSettings } from '../../constants';
import './ModalBase.css';
import './ModelSettingsModal.css';

export function ModelSettingsModal() {
    const { isModelSettingsModalOpen, setIsModelSettingsModalOpen, selectedItem } = useUI();
    const { userModels } = useLibrary();
    const { mediaSequences, currentPage, editableStep, handleStepModelSettingsChange } = useSequencer();

    // Free mouse rotation logic
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: MouseEvent) => {
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;

        const currentSettings = mediaSequences[currentPage]?.[editableStep]?.modelSettings || defaultModelSettings;

        const deltaX = e.clientX - lastMousePosRef.current.x;
        const deltaY = e.clientY - lastMousePosRef.current.y;

        // Update rotation based on mouse movement
        const newRotY = (currentSettings.modelRotationY - deltaX * 0.5) % 360;
        const newRotX = (currentSettings.modelRotationX - deltaY * 0.5) % 360;

        handleStepModelSettingsChange(editableStep, 'modelRotationY', newRotY < 0 ? 360 + newRotY : newRotY);
        handleStepModelSettingsChange(editableStep, 'modelRotationX', newRotX < 0 ? 360 + newRotX : newRotX);

        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }, [currentPage, editableStep, handleStepModelSettingsChange, mediaSequences]);

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        
        const currentSettings = mediaSequences[currentPage]?.[editableStep]?.modelSettings || defaultModelSettings;
        const currentZoom = currentSettings.modelZoom;

        const zoomAmount = e.deltaY * -0.2; // Adjust multiplier for sensitivity
        const newZoom = currentZoom + zoomAmount;
        const clampedZoom = Math.max(0, Math.min(800, newZoom));
        
        handleStepModelSettingsChange(editableStep, 'modelZoom', clampedZoom);

    }, [currentPage, editableStep, handleStepModelSettingsChange, mediaSequences]);

    const handlePresetViewChange = (x: number, y: number, z: number) => {
        handleStepModelSettingsChange(editableStep, 'modelRotationX', x);
        handleStepModelSettingsChange(editableStep, 'modelRotationY', y);
        handleStepModelSettingsChange(editableStep, 'modelRotationZ', z);
    };

    useEffect(() => {
        if (isModelSettingsModalOpen) {
            const canvas = document.getElementById('shader-canvas');
            if (canvas) {
                canvas.addEventListener('mousedown', handleMouseDown);
                canvas.addEventListener('wheel', handleWheel);
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
            }

            return () => {
                if (canvas) {
                    canvas.removeEventListener('mousedown', handleMouseDown);
                    canvas.removeEventListener('wheel', handleWheel);
                }
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isModelSettingsModalOpen, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);


    if (!isModelSettingsModalOpen) return null;

    const handleClose = () => {
        setIsModelSettingsModalOpen(false);
    };
    
    const currentStepSettings = mediaSequences[currentPage]?.[editableStep]?.modelSettings;
    const displaySettings = { ...defaultModelSettings, ...currentStepSettings };

    return (
        <div className="modal-overlay model-settings-overlay" onClick={handleClose}>
            <div className="modal-content model-settings-modal" onClick={e => e.stopPropagation()}>
                <button className="model-settings-close-btn" onClick={handleClose} aria-label="Close settings">&times;</button>
                
                <h2>Step {editableStep + 1} Model Settings</h2>
                <p className="modal-subtitle">For model: <span className="model-name">{selectedItem}</span></p>
                <p className="modal-instruction">Click and drag on the main view to rotate, scroll to zoom.</p>

                <div className="settings-grid">
                    {/* Animation and Transition */}
                    <div className="control-group">
                        <label>ANIMATION</label>
                        <select
                            value={displaySettings.modelAnimationType}
                            onChange={e => handleStepModelSettingsChange(editableStep, 'modelAnimationType', e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="rotate-x">Rotate X</option>
                            <option value="rotate-y">Rotate Y</option>
                            <option value="rotate-z">Rotate Z</option>
                            <option value="tumble">Tumble</option>
                            <option value="pulse">Pulse</option>
                            <option value="wobble">Wobble</option>
                            <option value="audio-reactive-spin">Audio Reactive Spin</option>
                        </select>
                    </div>
                    <div className="control-group">
                        <label>TRANSITION</label>
                        <select
                            value={displaySettings.modelTransitionType}
                            onChange={e => handleStepModelSettingsChange(editableStep, 'modelTransitionType', e.target.value)}
                        >
                            <option value="fade">Fade</option>
                            <option value="grow">Grow</option>
                            <option value="shrink">Shrink</option>
                            <option value="drop-in">Drop In</option>
                            <option value="spiral-out">Spiral Out</option>
                        </select>
                    </div>

                    <div className="control-group checkbox-group">
                         <input
                            id="wireframe-toggle"
                            type="checkbox"
                            checked={displaySettings.modelWireframe}
                            onChange={e => handleStepModelSettingsChange(editableStep, 'modelWireframe', e.target.checked)}
                        />
                        <label htmlFor="wireframe-toggle">WIREFRAME</label>
                    </div>

                    <div className="control-group checkbox-group">
                         <input
                            id="shader-texture-toggle"
                            type="checkbox"
                            checked={displaySettings.modelUseShaderTexture}
                            onChange={e => handleStepModelSettingsChange(editableStep, 'modelUseShaderTexture', e.target.checked)}
                        />
                        <label htmlFor="shader-texture-toggle">USE SHADER AS TEXTURE</label>
                    </div>


                    {/* Sliders */}
                     <div className="slider-group full-width">
                        <div className="slider-label-container">
                            <label>ANIMATION SPEED</label>
                            <span className="slider-value">{displaySettings.modelAnimationSpeed}</span>
                        </div>
                        <input type="range" min="0" max="200" value={displaySettings.modelAnimationSpeed} onChange={e => handleStepModelSettingsChange(editableStep, 'modelAnimationSpeed', parseInt(e.target.value))} />
                    </div>
                    <div className="slider-group full-width">
                        <div className="slider-label-container">
                            <label>ZOOM</label>
                            <span className="slider-value">{Math.round(displaySettings.modelZoom)}</span>
                        </div>
                        <input type="range" min="0" max="800" value={displaySettings.modelZoom} onChange={e => handleStepModelSettingsChange(editableStep, 'modelZoom', parseInt(e.target.value))} />
                    </div>
                     <div className="slider-group full-width">
                        <div className="slider-label-container">
                            <label>VERTEX NOISE</label>
                            <span className="slider-value">{displaySettings.vertexNoiseAmount}</span>
                        </div>
                        <input type="range" min="0" max="100" value={displaySettings.vertexNoiseAmount} onChange={e => handleStepModelSettingsChange(editableStep, 'vertexNoiseAmount', parseInt(e.target.value))} />
                    </div>
                </div>

                <div className="settings-separator"></div>

                <div className="camera-controls-group">
                    <label className="group-label">Camera & View Controls</label>
                    <div className="settings-grid nested-grid">
                        <div className="control-group checkbox-group">
                             <input
                                id="flyaround-toggle"
                                type="checkbox"
                                checked={displaySettings.cameraFlyAround}
                                onChange={e => handleStepModelSettingsChange(editableStep, 'cameraFlyAround', e.target.checked)}
                            />
                            <label htmlFor="flyaround-toggle">FLY AROUND</label>
                        </div>
                        <div className="control-group">
                            <label>CAMERA TYPE</label>
                            <select
                                value={displaySettings.cameraType || 'perspective'}
                                onChange={e => handleStepModelSettingsChange(editableStep, 'cameraType', e.target.value as any)}
                            >
                                <option value="perspective">Perspective</option>
                                <option value="exaggerated">Exaggerated</option>
                                <option value="fisheye">Fisheye</option>
                                <option value="orthographic">Orthographic</option>
                            </select>
                        </div>
                    </div>
                    <div className="preset-view-buttons">
                        <button onClick={() => handlePresetViewChange(0, 0, 0)}>Front</button>
                        <button onClick={() => handlePresetViewChange(0, 180, 0)}>Back</button>
                        <button onClick={() => handlePresetViewChange(90, 0, 0)}>Top</button>
                        <button onClick={() => handlePresetViewChange(-90, 0, 0)}>Bottom</button>
                        <button onClick={() => handlePresetViewChange(0, 90, 0)}>Left</button>
                        <button onClick={() => handlePresetViewChange(0, -90, 0)}>Right</button>
                    </div>
                </div>
            </div>
        </div>
    );
}