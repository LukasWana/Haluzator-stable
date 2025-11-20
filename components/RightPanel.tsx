

import React, { useState, useCallback } from 'react';
import { LibraryTab } from './LibraryTab';
import { ShadersTab } from './ShadersTab';
import { useUI } from '../contexts/UIContext';
import './RightPanel.css';

export const RightPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'library' | 'shaders'>('library');
  const { 
    setIsDraggingOver, 
    setInitialFilesForModal, 
    setIsAddMediaModalOpen 
  } = useUI();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  }, [setIsDraggingOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, [setIsDraggingOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const acceptedFiles = Array.from(files).filter((file: File) => 
        file.type.startsWith('image/') || file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.obj')
      );
      if (acceptedFiles.length > 0) {
        setInitialFilesForModal(acceptedFiles);
        setIsAddMediaModalOpen(true);
      }
    }
  }, [setIsDraggingOver, setInitialFilesForModal, setIsAddMediaModalOpen]);

  return (
    <div 
      className="right-panel"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="tabs">
        <button className={`tab-button ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>Library</button>
        <button className={`tab-button ${activeTab === 'shaders' ? 'active' : ''}`} onClick={() => setActiveTab('shaders')}>Shaders</button>
      </div>
      <div className="tab-content-container">
        <div className={`tab-pane ${activeTab === 'library' ? 'active' : ''}`}>
          <LibraryTab />
        </div>
        <div className={`tab-pane ${activeTab === 'shaders' ? 'active' : ''}`}>
          <ShadersTab />
        </div>
      </div>
    </div>
  );
};