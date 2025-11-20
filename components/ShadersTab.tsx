import React, { useState, useRef } from 'react';
import { useUI } from '../contexts/UIContext';
import { useLibrary } from '../contexts/LibraryContext';
import { useSequencer } from '../contexts/SequencerAndPlaybackProvider';
import './ShadersTab.css';

export const ShadersTab: React.FC = () => {
  const { selectedItem, setSelectedItem } = useUI();
  const { defaultShaderKeys, shaderPreviews, userImages, userVideos } = useLibrary();
  const { activeShaderKey } = useSequencer();

  const [filter, setFilter] = useState('');
  
  const activeShaderKeyRef = useRef(activeShaderKey);
  activeShaderKeyRef.current = activeShaderKey;
  
  const isMediaSelected = selectedItem in userImages || selectedItem in userVideos;

  const filteredShaders = defaultShaderKeys.filter(key =>
    key.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <h4 className="list-subheader">Default Shaders</h4>
      <div className="shader-filter-container">
        <input
          type="text"
          placeholder="Filter shaders..."
          className="shader-filter-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="default-shader-list">
        {filteredShaders.map(key => {
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
            </div>
          );
        })}
      </div>
    </>
  );
};