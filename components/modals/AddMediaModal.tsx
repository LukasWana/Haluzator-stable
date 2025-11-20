import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { useSequencer } from '../../contexts/SequencerAndPlaybackProvider';
import { fileToDataUrl } from '../../utils/helpers';
import type { StagedFile } from '../../types';
import './ModalBase.css';
import './AddMediaModal.css';

export function AddMediaModal() {
    const { isAddMediaModalOpen, setIsAddMediaModalOpen, initialFilesForModal, setInitialFilesForModal } = useUI();
    const { saveMedia, userImages, userVideos, userModels } = useLibrary();
    const { addMediaToSequencer } = useSequencer();
    
    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
    const [addToSequencer, setAddToSequencer] = useState(true);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const existingKeys = [...Object.keys(userImages), ...Object.keys(userVideos), ...Object.keys(userModels)];

    const processFiles = useCallback(async (files: File[] | FileList) => {
        if (files) {
            setError('');
            const newStagedFiles: StagedFile[] = [];
            for (const file of (Array.from(files) as File[])) {
                let previewSrc = '';
                const type = file.type.startsWith('image/') ? 'image' 
                           : file.type.startsWith('video/') ? 'video'
                           : file.name.toLowerCase().endsWith('.obj') ? 'model' 
                           : null;

                if (type === 'image') {
                    previewSrc = await fileToDataUrl(file);
                } else if (type === 'video') {
                    previewSrc = URL.createObjectURL(file);
                } else if (type === 'model') {
                    previewSrc = ''; // Placeholder, real preview is generated on save
                }
                else {
                    setError(prev => prev + `\nUnsupported file type: ${file.name}`);
                    continue;
                }
                newStagedFiles.push({
                    id: `${file.name}-${file.lastModified}-${Math.random()}`,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    file,
                    previewSrc,
                    type
                });
            }
            setStagedFiles(prev => [...prev, ...newStagedFiles]);
        }
    }, []);

    useEffect(() => {
        if (isAddMediaModalOpen && initialFilesForModal) {
            processFiles(initialFilesForModal);
            setInitialFilesForModal(null);
        }
    }, [isAddMediaModalOpen, initialFilesForModal, processFiles, setInitialFilesForModal]);


    const resetState = useCallback(() => {
        stagedFiles.forEach(sf => {
            if (sf.type === 'video') URL.revokeObjectURL(sf.previewSrc);
        });
        setStagedFiles([]);
        setError('');
        setAddToSequencer(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [stagedFiles]);

    const handleClose = useCallback(() => {
        resetState();
        setIsAddMediaModalOpen(false);
    }, [resetState, setIsAddMediaModalOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };
    
    const handleNameChange = (id: string, newName: string) => {
        setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    };

    const handleRemoveFile = (id: string) => {
        setStagedFiles(prev => {
            const fileToRemove = prev.find(f => f.id === id);
            if (fileToRemove && fileToRemove.type === 'video') {
                URL.revokeObjectURL(fileToRemove.previewSrc);
            }
            return prev.filter(f => f.id !== id);
        });
    };

    const handleSubmit = async () => {
        if (stagedFiles.length === 0) {
            setError('Please add files to upload.');
            return;
        }
        const names = stagedFiles.map(f => f.name.trim());
        if (names.some(name => name === '')) {
            setError('All media items must have a name.');
            return;
        }
        if (new Set(names).size !== names.length) {
            setError('Media names must be unique within this upload batch.');
            return;
        }
        const existingNameCollision = names.find(name => existingKeys.includes(name));
        if (existingNameCollision) {
            setError(`An item named "${existingNameCollision}" already exists. Please choose a unique name.`);
            return;
        }
        setError('');

        const newMediaKeys = await saveMedia(stagedFiles.map(({ name, file }) => ({ name: name.trim(), file })));
        
        if (addToSequencer) {
            addMediaToSequencer(newMediaKeys);
        }

        handleClose();
    };

    if (!isAddMediaModalOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Add Media</h2>
                {error && <p className="modal-error">{error}</p>}
                
                <div className="modal-form-group">
                    <label htmlFor="media-file">Select Image(s), Video(s) or .obj Model(s)</label>
                    <input id="media-file" type="file" accept="image/*,video/*,model/obj,.obj" onChange={handleFileChange} ref={fileInputRef} multiple />
                </div>
                
                {stagedFiles.length > 0 && (
                    <div className="modal-preview-grid">
                       {stagedFiles.map((sf) => (
                           <div key={sf.id} className="modal-staged-item">
                               {sf.type === 'image' && <img src={sf.previewSrc} alt="Preview" className="modal-staged-item-thumbnail" />}
                               {sf.type === 'video' && <video src={sf.previewSrc} autoPlay muted loop playsInline className="modal-staged-item-thumbnail" />}
                               {sf.type === 'model' && (
                                   <div className="modal-staged-item-thumbnail model-placeholder">
                                       <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM12 13.5l-10-5V13l10 5 10-5V8.5l-10 5z"></path>
                                       </svg>
                                   </div>
                               )}
                               <input type="text" value={sf.name} onChange={(e) => handleNameChange(sf.id, e.target.value)} />
                               <button className="modal-staged-item-remove-btn" onClick={() => handleRemoveFile(sf.id)}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
                               </button>
                           </div>
                       ))}
                    </div>
                )}

                <div className="modal-form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input 
                        id="add-to-sequencer-checkbox" 
                        type="checkbox" 
                        checked={addToSequencer} 
                        onChange={e => setAddToSequencer(e.target.checked)}
                        style={{ width: 'auto', margin: 0, height: 'auto', appearance: 'auto' }}
                    />
                    <label htmlFor="add-to-sequencer-checkbox" style={{ cursor: 'pointer', fontWeight: 'normal' }}>
                        Add new media to sequencer
                    </label>
                </div>
                
                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-button-cancel">Cancel</button>
                    <button onClick={handleSubmit} className="modal-button-save" disabled={stagedFiles.length === 0}>Save Batch</button>
                </div>
            </div>
        </div>
    );
}