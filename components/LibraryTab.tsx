import React, { useRef } from 'react';
import { useUI } from '../contexts/UIContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useSequencer, usePlayback } from '../contexts/SequencerAndPlaybackProvider';
import './LibraryTab.css';

export const LibraryTab: React.FC = () => {
  const { selectedItem, setSelectedItem, setIsAddShaderModalOpen, setIsAddMediaModalOpen, setIsConfirmDeleteModalOpen, setItemToDelete, setIsModelSettingsModalOpen } = useUI();
  const { userImages, userVideos, userModels, modelPreviews, userShaders, shaderPreviews } = useLibrary();
  const { mediaSequences, currentPage, editableStep, activeShaderKey } = useSequencer();
  const { isPlaying, currentStep } = usePlayback();

  const activeShaderKeyRef = useRef(activeShaderKey);
  activeShaderKeyRef.current = activeShaderKey;
  
  const activeSequencerMediaKey = mediaSequences[currentPage][isPlaying ? currentStep : editableStep]?.key;
  const isMediaSelected = selectedItem in userImages || selectedItem in userVideos || selectedItem in userModels;
  
  const handleDeleteClick = (e: React.MouseEvent, key: string, type: 'media' | 'shader') => {
      e.stopPropagation();
      setItemToDelete({ key, type });
      setIsConfirmDeleteModalOpen(true);
  };

  return (
    <>
      <div className="library-header">
        <h3>Library</h3>
        <div className="library-actions">
          <button className="add-shader-button" title="Add Custom Shader" onClick={() => setIsAddShaderModalOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>
          </button>
          <button className="add-media-button" title="Add Image, Video, or 3D Model" onClick={() => setIsAddMediaModalOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path></svg>
          </button>
        </div>
      </div>

      <h4 className="list-subheader">Media</h4>
      <div className="user-media-grid">
        {Object.keys(userImages).map(key => (
          <div key={key} className={`user-media-grid-item ${selectedItem === key ? 'selected' : ''} ${activeSequencerMediaKey === key ? 'playing' : ''}`} onClick={() => setSelectedItem(key)}>
             <div className="media-thumbnail-wrapper">
                <div className="media-thumbnail" style={{backgroundImage: `url(${userImages[key]})`}}></div>
             </div>
             <button className="delete-media-button" onClick={(e) => handleDeleteClick(e, key, 'media')} title={`Delete ${key}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
             </button>
          </div>
        ))}
        {Object.keys(userVideos).map(key => (
           <div key={key} className={`user-media-grid-item ${selectedItem === key ? 'selected' : ''} ${activeSequencerMediaKey === key ? 'playing' : ''}`} onClick={() => setSelectedItem(key)}>
             <div className="media-thumbnail-wrapper">
                <video src={userVideos[key].objectURL} className="media-thumbnail" muted loop playsInline preload="metadata"></video>
                <div className="media-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                </div>
             </div>
             <button className="delete-media-button" onClick={(e) => handleDeleteClick(e, key, 'media')} title={`Delete ${key}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
             </button>
          </div>
        ))}
      </div>

      <hr className="list-separator" />
      <h4 className="list-subheader">Models</h4>
       <div className="user-media-grid">
        {Object.keys(userModels).map(key => (
            <div key={key} className={`user-media-grid-item ${selectedItem === key ? 'selected' : ''} ${activeSequencerMediaKey === key ? 'playing' : ''}`} onClick={() => setSelectedItem(key)}>
                <div className="media-thumbnail-wrapper">
                    {modelPreviews[key] ? (
                        <div className="media-thumbnail" style={{backgroundImage: `url(${modelPreviews[key]})`}}></div>
                    ) : (
                        <div className="media-thumbnail-placeholder"></div>
                    )}
                    <div className="media-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM12 13.5l-10-5V13l10 5 10-5V8.5l-10 5z"></path></svg>
                    </div>
                </div>
                <button className="settings-model-button" onClick={(e) => { e.stopPropagation(); setSelectedItem(key); setIsModelSettingsModalOpen(true); }} title={`Settings for ${key}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                </button>
                <button className="delete-media-button" onClick={(e) => handleDeleteClick(e, key, 'media')} title={`Delete ${key}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
                </button>
            </div>
        ))}
      </div>

      <hr className="list-separator" />
      <h4 className="list-subheader">Custom Shaders</h4>
      <div className="custom-shader-list">
        {Object.keys(userShaders).map(key => {
          const previewSrc = shaderPreviews[key];
          return (
            <div
              key={key}
              className={`shader-item ${selectedItem === key ? 'selected' : ''} ${!isMediaSelected && activeShaderKeyRef.current === key ? 'playing' : ''}`}
              onClick={() => setSelectedItem(key)}
              title={key}
            >
              {previewSrc ? (
                <img src={previewSrc} alt={`${key} preview`} className="shader-preview-image" loading="lazy" />
              ) : (
                <div className="shader-preview-placeholder"></div>
              )}
              <span className="shader-item-name">{key}</span>
              <button className="delete-shader-button" onClick={(e) => handleDeleteClick(e, key, 'shader')} title={`Delete ${key}`}>
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};