import React, { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { LicenseView } from './LicenseView';
import './ModalBase.css';
import './HelpModal.css';

export function HelpModal() {
    const { isHelpModalOpen, setIsHelpModalOpen } = useUI();
    const [showLicense, setShowLicense] = useState(false);

    if (!isHelpModalOpen) return null;

    const onClose = () => {
      setShowLicense(false);
      setIsHelpModalOpen(false);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`help-modal-content ${showLicense ? 'license-active' : ''}`} onClick={e => e.stopPropagation()}>
                <button className="help-modal-close-button" onClick={onClose} aria-label="Close help">&times;</button>
                
                {showLicense ? (
                    <LicenseView onBack={() => setShowLicense(false)} />
                ) : (
                    <>
                        <h2>Shortcuts & Controls</h2>
                        <div className="help-grid">
                            <div className="help-category">
                                <h3>Sequencer</h3>
                                <p><span>Spacebar</span> Play / Pause</p>
                                <p><span>Enter</span> Set selected item to step</p>
                                <p><span>&larr;</span> / <span>&rarr;</span> Select previous/next step</p>
                                <p><span>1</span> - <span>8</span> Switch to page 1-8</p>
                            </div>
                            <div className="help-category">
                                <h3>Loop Control</h3>
                                <p><span>Shift + Click</span> Set loop start</p>
                                <p><span>Ctrl/Cmd + Click</span> Set loop end</p>
                                <p><span>[</span> Shift loop left</p>
                                <p><span>]</span> Shift loop right</p>
                            </div>
                            <div className="help-category">
                                <h3>Live VJing</h3>
                                <p><span>Q W E R T Y U I</span></p>
                                <p>Trigger item in step 1-8</p>
                            </div>
                            <div className="help-category">
                                <h3>Effect Controls</h3>
                                <p><span>A</span> / <span>S</span> Overlay Opacity</p>
                                <p><span>D</span> / <span>F</span> Audio Influence</p>
                                <p><span>G</span> / <span>H</span> Blur Amount</p>
                                <p><span>J</span> / <span>K</span> Hue Shift</p>
                                <p><span>L</span> / <span>;</span> Mandala Segments</p>
                            </div>
                        </div>
                        <div className="help-footer">
                            <a className="license-link" onClick={() => setShowLicense(true)}>
                                License Information
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}