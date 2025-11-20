import React, { useRef, useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useSequencer, usePlayback } from '../contexts/SequencerAndPlaybackProvider';
import { HtmlThumbnail } from './HtmlThumbnail';
import './LibraryTab.css';

export const LibraryTab: React.FC = () => {
  // FIX: Destructure `itemToDelete` from useUI() to make it available in the component scope.
  const { selectedItem, setSelectedItem, setIsAddShaderModalOpen, setIsAddMediaModalOpen, setIsAddHtmlModalOpen, setIsEditHtmlModalOpen, setIsConfirmDeleteModalOpen, setItemToDelete, itemToDelete } = useUI();
  const { userImages, userVideos, userModels, userHtml, modelPreviews, userShaders, shaderPreviews, updateMediaName } = useLibrary();
  const { mediaSequences, currentPage, editableStep, activeShaderKey, renameSequencerItem } = useSequencer();
  const { isPlaying, currentStep } = usePlayback();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const activeShaderKeyRef = useRef(activeShaderKey);
  activeShaderKeyRef.current = activeShaderKey;
  
  const activeSequencerMediaKey = mediaSequences[currentPage][isPlaying ? currentStep : editableStep]?.key;
  const isMediaSelected = selectedItem in userImages || selectedItem in userVideos || selectedItem in userModels || selectedItem in userHtml;
  
  const handleDeleteClick = (e: React.MouseEvent, key: string, type: 'media' | 'shader') => {
      e.stopPropagation();
      setItemToDelete({ key, type });
      setIsConfirmDeleteModalOpen(true);
  };

  const handleEditHtmlClick = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    setSelectedItem(key);
    setIsEditHtmlModalOpen(true);
  };

  const handleEditDoubleClick = (key: string) => {
    setEditingKey(key);
    setNewName(key);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setNewName('');
  };

  const handleNameSubmit = async () => {
    if (!editingKey) return;

    const oldKey = editingKey;
    const trimmedNewName = newName.trim();

    if (trimmedNewName === '' || trimmedNewName === oldKey) {
        cancelEdit();
        return;
    }

    const success = await updateMediaName(oldKey, trimmedNewName);

    if (success) {
        renameSequencerItem(oldKey, trimmedNewName);
        if (selectedItem === oldKey) {
            setSelectedItem(trimmedNewName);
        }
        if (itemToDelete && itemToDelete.key === oldKey) {
            setItemToDelete({ ...itemToDelete, key: trimmedNewName });
        }
        cancelEdit();
    }
    // Error alert is handled in context, so we just don't cancel edit on failure
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleNameSubmit();
      } else if (e.key === 'Escape') {
          cancelEdit();
      }
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
          <button className="add-html-button" title="Add HTML Overlay" onClick={() => setIsAddHtmlModalOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"></path></svg>
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
             {editingKey === key ? (
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleNameSubmit} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()} className="media-item-name-input" autoFocus onFocus={(e) => e.target.select()} />
             ) : (
                <span className="media-item-name" onDoubleClick={() => handleEditDoubleClick(key)} title="Double-click to rename">{key}</span>
             )}
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
             {editingKey === key ? (
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleNameSubmit} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()} className="media-item-name-input" autoFocus onFocus={(e) => e.target.select()} />
             ) : (
                <span className="media-item-name" onDoubleClick={() => handleEditDoubleClick(key)} title="Double-click to rename">{key}</span>
             )}
             <button className="delete-media-button" onClick={(e) => handleDeleteClick(e, key, 'media')} title={`Delete ${key}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
             </button>
          </div>
        ))}
      </div>
      
      <hr className="list-separator" />
      <h4 className="list-subheader">HTML Overlays</h4>
       <div className="user-media-grid">
        {Object.keys(userHtml).map(key => (
            <div key={key} className={`user-media-grid-item ${selectedItem === key ? 'selected' : ''} ${activeSequencerMediaKey === key ? 'playing' : ''}`} onClick={() => setSelectedItem(key)}>
                <div className="media-thumbnail-wrapper">
                    <HtmlThumbnail content={userHtml[key]} />
                </div>
                {editingKey === key ? (
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleNameSubmit} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()} className="media-item-name-input" autoFocus onFocus={(e) => e.target.select()} />
                ) : (
                    <span className="media-item-name" onDoubleClick={() => handleEditDoubleClick(key)} title="Double-click to rename">{key}</span>
                )}
                <button className="delete-media-button" onClick={(e) => handleDeleteClick(e, key, 'media')} title={`Delete ${key}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
                </button>
                <button className="settings-model-button html-edit-button" onClick={(e) => handleEditHtmlClick(e, key)} title={`Edit Content of ${key}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>
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
                {editingKey === key ? (
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleNameSubmit} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()} className="media-item-name-input" autoFocus onFocus={(e) => e.target.select()} />
                ) : (
                    <span className="media-item-name" onDoubleClick={() => handleEditDoubleClick(key)} title="Double-click to rename">{key}</span>
                )}
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
              {editingKey === key ? (
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={handleNameSubmit} onKeyDown={handleNameKeyDown} onClick={e => e.stopPropagation()} className="shader-item-name-input" autoFocus onFocus={(e) => e.target.select()} />
              ) : (
                <span className="shader-item-name" onDoubleClick={() => handleEditDoubleClick(key)} title="Double-click to rename">{key}</span>
              )}
              <button className="delete-shader-button" onClick={(e) => handleDeleteClick(e, key, 'shader')} title={`Delete ${key}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
};