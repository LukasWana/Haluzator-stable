import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { useSequencer } from '../../contexts/SequencerAndPlaybackProvider';
import './ModalBase.css';
import './ModelSettingsModal.css';

export function ModelSettingsModal() {
    const { isModelSettingsModalOpen, setIsModelSettingsModalOpen, selectedItem } = useUI();
    const { pageControls, currentPage, handleControlChange } = useSequencer();

    if (!isModelSettingsModalOpen) return null;

    const handleClose = () => {
        setIsModelSettingsModalOpen(false);
    };

    const handlePresetView = (x: number, y: number) => {
      handleControlChange('cameraRotationX', x);
      handleControlChange('cameraRotationY', y);
    };
    
    const currentControls = pageControls[currentPage];

    return (
        <div className="modal-overlay model-settings-overlay" onClick={handleClose}>
            <div className="modal-content model-settings-modal" onClick={e => e.stopPropagation()}>
                <h2>Model Settings: <span className="model-name">{selectedItem}</span></h2>
                <p className="modal-subtitle">These settings apply to any model on Page {currentPage + 1}</p>

                <div className="settings-grid">
                    {/* Animation and Transition */}
                    <div className="control-group">
                        <label>ANIMATION</label>
                        <select
                            value={currentControls.modelAnimationType}
                            onChange={e => handleControlChange('modelAnimationType', e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="rotate-y">Rotate Y</option>
                            <option value="tumble">Tumble</option>
                            <option value="pulse">Pulse</option>
                            <option value="wobble">Wobble</option>
                            <option value="audio-reactive-spin">Audio Reactive Spin</option>
                        </select>
                    </div>
                    <div className="control-group">
                        <label>TRANSITION</label>
                        <select
                            value={currentControls.modelTransitionType}
                            onChange={e => handleControlChange('modelTransitionType', e.target.value)}
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
                            checked={currentControls.modelWireframe}
                            onChange={e => handleControlChange('modelWireframe', e.target.checked)}
                        />
                        <label htmlFor="wireframe-toggle">WIREFRAME</label>
                    </div>

                    <div className="control-group checkbox-group">
                         <input
                            id="shader-texture-toggle"
                            type="checkbox"
                            checked={currentControls.modelUseShaderTexture}
                            onChange={e => handleControlChange('modelUseShaderTexture', e.target.checked)}
                        />
                        <label htmlFor="shader-texture-toggle">USE SHADER AS TEXTURE</label>
                    </div>


                    {/* Sliders */}
                     <div className="slider-group full-width">
                        <div className="slider-label-container">
                            <label>ANIMATION SPEED</label>
                            <span className="slider-value">{currentControls.modelAnimationSpeed}</span>
                        </div>
                        <input type="range" min="0" max="200" value={currentControls.modelAnimationSpeed} onChange={e => handleControlChange('modelAnimationSpeed', parseInt(e.target.value))} />
                    </div>
                    <div className="slider-group full-width">
                        <div className="slider-label-container">
                            <label>ZOOM</label>
                            <span className="slider-value">{currentControls.modelZoom}</span>
                        </div>
                        <input type="range" min="0" max="200" value={currentControls.modelZoom} onChange={e => handleControlChange('modelZoom', parseInt(e.target.value))} />
                    </div>
                    <div className="slider-group">
                        <div className="slider-label-container">
                            <label>ROTATION X</label>
                            <span className="slider-value">{currentControls.modelRotationX}</span>
                        </div>
                        <input type="range" min="0" max="360" value={currentControls.modelRotationX} onChange={e => handleControlChange('modelRotationX', parseInt(e.target.value))} />
                    </div>
                    <div className="slider-group">
                        <div className="slider-label-container">
                            <label>ROTATION Y</label>
                            <span className="slider-value">{currentControls.modelRotationY}</span>
                        </div>
                        <input type="range" min="0" max="360" value={currentControls.modelRotationY} onChange={e => handleControlChange('modelRotationY', parseInt(e.target.value))} />
                    </div>
                    <div className="slider-group">
                        <div className="slider-label-container">
                            <label>ROTATION Z</label>
                            <span className="slider-value">{currentControls.modelRotationZ}</span>
                        </div>
                        <input type="range" min="0" max="360" value={currentControls.modelRotationZ} onChange={e => handleControlChange('modelRotationZ', parseInt(e.target.value))} />
                    </div>
                </div>

                <div className="settings-separator"></div>

                <div className="camera-controls-group">
                    <label className="group-label">Camera Controls</label>
                     <div className="control-group checkbox-group">
                         <input
                            id="flyaround-toggle"
                            type="checkbox"
                            checked={currentControls.cameraFlyAround}
                            onChange={e => handleControlChange('cameraFlyAround', e.target.checked)}
                        />
                        <label htmlFor="flyaround-toggle">FLY AROUND CAMERA</label>
                    </div>
                    <div className="preset-view-buttons">
                        <button onClick={() => handlePresetView(0, 0)}>Front</button>
                        <button onClick={() => handlePresetView(0, 180)}>Back</button>
                        <button onClick={() => handlePresetView(0, 90)}>Left</button>
                        <button onClick={() => handlePresetView(0, -90)}>Right</button>
                        <button onClick={() => handlePresetView(90, 0)}>Top</button>
                        <button onClick={() => handlePresetView(-90, 0)}>Bottom</button>
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-button-save">Close</button>
                </div>
            </div>
        </div>
    );
}