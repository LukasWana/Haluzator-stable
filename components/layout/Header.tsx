import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { usePlayback } from '../../contexts/SequencerAndPlaybackProvider';
import { useDevice } from '../../contexts/DeviceContext';
import { useSession } from '../../contexts/SessionContext';
import { MidiComponent } from '../MidiComponent';
import { AppLogo } from './AppLogo';
import './Header.css';

interface HeaderProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasWrapperRef: React.RefObject<HTMLDivElement>;
}

export const Header: React.FC<HeaderProps> = ({ fileInputRef, canvasRef, canvasWrapperRef }) => {
  const { isFullscreen, fpsDisplay, setIsHelpModalOpen, handleFullscreenToggle } = useUI();
  const { isPlaying, togglePlay } = usePlayback();
  const { audioState, projectionWindow, toggleAudio, handleProjectionToggle } = useDevice();
  const { handleSaveSession } = useSession();

  return (
    <header>
      <div className="header-content">
        <div className="app-logo" title="Shader Sequencer">
          <AppLogo />
        </div>
      </div>
      <div className="session-controls">
        <div className="header-actions">
          <div className="fps-display">{fpsDisplay}</div>
          <button className={`header-icon-button ${isPlaying ? 'active' : ''}`} onClick={togglePlay} title="Play/Pause (Spacebar)">
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button className={`header-icon-button ${audioState === 'active' ? 'active' : ''}`} onClick={toggleAudio} title="Toggle Microphone Input">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
            </svg>
          </button>
          <button className="header-icon-button help-button" onClick={() => setIsHelpModalOpen(true)} title="Help (?)">?</button>
          <button className={`header-icon-button ${isFullscreen ? 'active' : ''}`} onClick={() => handleFullscreenToggle(canvasRef)} title="Fullscreen">
            <svg viewBox="0 0 24 24" fill="currentColor">
              {isFullscreen
                ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              }
            </svg>
          </button>
          <button className={`header-icon-button ${projectionWindow ? 'active' : ''}`} onClick={() => handleProjectionToggle(canvasRef.current, canvasWrapperRef.current)} title="Open Projection Window">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </button>
        </div>
        <div className="header-separator"></div>
        <div className="header-actions">
          <button className="header-icon-button" onClick={handleSaveSession} title="Save Session">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"></path></svg>
          </button>
          <button className="header-icon-button" onClick={() => fileInputRef.current?.click()} title="Load Session">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z"></path></svg>
          </button>
        </div>
        <div className="status-indicators">
          <MidiComponent />
        </div>
      </div>
    </header>
  );
};