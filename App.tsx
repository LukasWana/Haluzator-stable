import React, { useRef, useEffect } from 'react';
import { useUI } from './contexts/UIContext';
import { useLibrary } from './contexts/LibraryContext';
import { useDevice } from './contexts/DeviceContext';
import { useSession } from './contexts/SessionContext';
import { useSequencer, usePlayback } from './contexts/SequencerAndPlaybackProvider';
import { useInputHandler } from './hooks/useInputHandler';

import { RightPanel } from './components/RightPanel';
import { Controls } from './components/Controls';
import { Sequencer } from './components/Sequencer';
import { AddShaderModal } from './components/modals/AddShaderModal';
import { AddMediaModal } from './components/modals/AddMediaModal';
import { AddHtmlModal } from './components/modals/AddHtmlModal';
import { EditHtmlModal } from './components/modals/EditHtmlModal';
import { ModelSettingsModal } from './components/modals/ModelSettingsModal';
import { HtmlSettingsModal } from './components/modals/HtmlSettingsModal';
import { HelpModal } from './components/modals/HelpModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { ShaderErrorDisplay } from './components/ShaderErrorDisplay';
import { Header } from './components/layout/Header';
import { HtmlOverlay } from './components/HtmlOverlay';
import { NUM_PAGES, SEQUENCER_STEP_OPTIONS } from './constants';
import { useWebGL } from './hooks/useWebGL';
import './App.css';

export function App() {
  const {
    isProjectingTransition, isFullscreen, isSessionLoading, sessionLoadingDetails, isDraggingOver,
    isRightPanelVisible, isControlsVisible, isSequencerVisible,
  } = useUI();
  
  const { currentPage, pageControls } = useSequencer();
  const { isPlaying, transitionState } = usePlayback();
  
  const { shaders, userImages, userVideos, userModels } = useLibrary();
  const { projectionWindow, audioDataRef } = useDevice();
  const { handleShaderError, handleFpsUpdate } = useUI();
  const { handleLoadSession } = useSession();

  useInputHandler();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const htmlOverlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const preloader = document.getElementById('preloader');
    const details = document.getElementById('preloader-details');
    if (!preloader || !details) return;

    if (isSessionLoading) {
        preloader.style.display = 'flex'; // Ensure it's not display:none
        preloader.classList.remove('loaded');
        details.textContent = sessionLoadingDetails;
    } else {
        if (!preloader.classList.contains('loaded')) {
            preloader.classList.add('loaded');
            const onTransitionEnd = () => {
                // Check if it's still loaded before hiding, to avoid race conditions
                if (preloader.classList.contains('loaded')) {
                    preloader.style.display = 'none';
                }
                preloader.removeEventListener('transitionend', onTransitionEnd);
            };
            preloader.addEventListener('transitionend', onTransitionEnd);
        }
    }
  }, [isSessionLoading, sessionLoadingDetails]);
  
  const currentControls = pageControls[currentPage];
  
  const activeShaderToRender = transitionState.toShaderKey;
  
  const webGLProps = { 
    ...transitionState,
    isPlaying: isPlaying,
    ...currentControls,
    fromModelSettings: transitionState.fromModelSettings,
    toModelSettings: transitionState.toModelSettings,
    projectionWindow,
    isSessionLoading,
  };
  
  useWebGL(canvasRef, webGLProps, shaders, userImages, userVideos, userModels, audioDataRef, handleShaderError, handleFpsUpdate);
  
  return (
    <>
      <Header fileInputRef={fileInputRef} canvasRef={canvasRef} canvasWrapperRef={canvasWrapperRef} htmlOverlayRef={htmlOverlayRef} />
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadSession}
        accept=".json,application/json"
        style={{ display: 'none' }}
      />

      <div 
        className={`app-container ${!isRightPanelVisible ? 'right-panel-hidden' : ''}`}
      >
        <div className="main-content">
          <div ref={canvasWrapperRef} className={`canvas-wrapper ${projectionWindow ? 'projection-mode' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
            <canvas id="shader-canvas" ref={canvasRef}></canvas>
            <HtmlOverlay ref={htmlOverlayRef} />
            <ShaderErrorDisplay activeShaderKey={activeShaderToRender} />
            {isProjectingTransition && (
                <div className="preloader-overlay">
                    <div className="spinner"></div>
                </div>
            )}
            {projectionWindow && !isProjectingTransition && (
                 <div className="projection-active-display">
                    <p>PROJECTION ACTIVE</p>
                </div>
            )}
          </div>
          <div className="controls-sequencer-wrapper">
            {isSequencerVisible && (
              <>
                <SequencerToolbar />
                <Sequencer />
              </>
            )}
            {isControlsVisible && <Controls />}
          </div>
        </div>
        <RightPanel />
      </div>

      <AddShaderModal />
      <AddMediaModal />
      <AddHtmlModal />
      <EditHtmlModal />
      <HtmlSettingsModal />
      <HelpModal />
      <ConfirmDeleteModal />
      <ModelSettingsModal />

      {isDraggingOver && <DropOverlay />}
    </>
  );
}

const SequencerToolbar = () => {
    const { currentPage, sequencerSteps, isLoopingEnabled, editableStep, handlePageChange, handleSequencerStepsChange, toggleLoop, setLoopStart, setLoopEnd, shiftLoop, loopStart, loopEnd } = useSequencer();
    
    return (
        <div className="sequencer-toolbar">
          <div className="page-buttons">
            {Array.from({length: NUM_PAGES}).map((_, i) => (
              <button key={i} className={`page-button ${currentPage === i ? 'active' : ''}`} onClick={() => handlePageChange(i)}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="toolbar-separator" />
          <div className="sequencer-mode-control">
            {SEQUENCER_STEP_OPTIONS.map(steps => (
                <button
                    key={steps}
                    className={`sequencer-mode-button ${sequencerSteps === steps ? 'active' : ''}`}
                    onClick={() => handleSequencerStepsChange(steps)}
                    title={`Set sequencer to ${steps} steps`}
                >
                    {steps}
                </button>
            ))}
          </div>
          <div className="toolbar-separator" />
           <button
              className={`sequencer-mode-button icon-button ${isLoopingEnabled ? 'active' : ''}`}
              onClick={toggleLoop}
              title="Toggle Sequencer Loop"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"></path>
              </svg>
            </button>
            {isLoopingEnabled && (
              <>
                <button className="sequencer-mode-button icon-button" onClick={() => setLoopStart(editableStep)} title="Set Loop Start">[</button>
                <button className="sequencer-mode-button icon-button" onClick={() => setLoopEnd(editableStep)} title="Set Loop End">]</button>
                <button className="sequencer-mode-button icon-button" onClick={() => shiftLoop('left')} disabled={loopStart === 0} title="Shift Loop Left"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg></button>
                <button className="sequencer-mode-button icon-button" onClick={() => shiftLoop('right')} disabled={loopEnd >= sequencerSteps - 1} title="Shift Loop Right"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg></button>
              </>
            )}
        </div>
    );
}

const DropOverlay = () => (
  <div className="drop-overlay">
    <div className="drop-overlay-content">
      <svg className="drop-overlay-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
      </svg>
      <p>Drop files to upload</p>
    </div>
  </div>
);