import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { useSequencer } from '../../contexts/SequencerAndPlaybackProvider';
import { defaultHtmlSettings } from '../../constants';
import './ModalBase.css';
import './ModelSettingsModal.css'; // Reusing styles

export function HtmlSettingsModal() {
    const { isHtmlSettingsModalOpen, setIsHtmlSettingsModalOpen, selectedItem } = useUI();
    const { mediaSequences, currentPage, editableStep, handleStepHtmlSettingsChange } = useSequencer();

    if (!isHtmlSettingsModalOpen) return null;

    const handleClose = () => {
        setIsHtmlSettingsModalOpen(false);
    };
    
    const currentStepSettings = mediaSequences[currentPage]?.[editableStep]?.htmlSettings;
    const displaySettings = { ...defaultHtmlSettings, ...currentStepSettings };

    return (
        <div className="modal-overlay model-settings-overlay" onClick={handleClose}>
            <div className="modal-content model-settings-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={handleClose} aria-label="Close settings">&times;</button>
                
                <h2>Step {editableStep + 1} HTML Settings</h2>
                <p className="modal-subtitle">For overlay: <span className="model-name">{selectedItem}</span></p>

                <div className="settings-grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    <div className="control-group">
                        <label>TRANSITION</label>
                        <select
                            value={displaySettings.htmlTransitionType}
                            onChange={e => handleStepHtmlSettingsChange(editableStep, 'htmlTransitionType', e.target.value)}
                        >
                            <option value="fade">Fade</option>
                            <option value="slide-in-top">Slide In From Top</option>
                            <option value="slide-in-bottom">Slide In From Bottom</option>
                            <option value="slide-in-left">Slide In From Left</option>
                            <option value="slide-in-right">Slide In From Right</option>
                            <option value="zoom-in">Zoom In</option>
                            <option value="zoom-out">Zoom Out</option>
                        </select>
                    </div>

                    <div className="settings-separator"></div>

                    <div className="control-group checkbox-group" style={{ paddingTop: 0, justifyContent: 'flex-start' }}>
                         <input
                            id="transparent-bg-toggle"
                            type="checkbox"
                            checked={displaySettings.transparentBackground}
                            onChange={e => handleStepHtmlSettingsChange(editableStep, 'transparentBackground', e.target.checked)}
                        />
                        <label htmlFor="transparent-bg-toggle">TRANSPARENT BACKGROUND</label>
                    </div>

                    <div className="control-group">
                        <label htmlFor="bg-color-picker">BACKGROUND COLOR</label>
                        <input
                            id="bg-color-picker"
                            type="color"
                            value={displaySettings.backgroundColor}
                            onChange={e => handleStepHtmlSettingsChange(editableStep, 'backgroundColor', e.target.value)}
                            disabled={displaySettings.transparentBackground}
                            style={{
                                width: '100%',
                                height: '40px',
                                padding: '5px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--background-color)',
                                cursor: displaySettings.transparentBackground ? 'not-allowed' : 'pointer'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}