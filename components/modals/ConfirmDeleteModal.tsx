import React from 'react';
import { useUI } from '../../contexts/UIContext';
import { useLibrary } from '../../contexts/LibraryContext';
import './ModalBase.css';

export function ConfirmDeleteModal() {
    const { 
        isConfirmDeleteModalOpen, 
        setIsConfirmDeleteModalOpen,
        itemToDelete,
        setItemToDelete
    } = useUI();
    const { deleteMedia, deleteShader } = useLibrary();

    if (!isConfirmDeleteModalOpen || !itemToDelete) return null;

    const handleClose = () => {
        setIsConfirmDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const handleConfirm = () => {
        if (itemToDelete.type === 'media') {
            deleteMedia(itemToDelete.key);
        } else if (itemToDelete.type === 'shader') {
            deleteShader(itemToDelete.key);
        }
        handleClose();
    };
    
    const message = `Are you sure you want to delete "${itemToDelete.key}"? This action cannot be undone.`;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Confirm Deletion</h2>
                <p style={{color: 'var(--on-surface-color)', lineHeight: 1.6}}>{message}</p>
                
                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-button-cancel">Cancel</button>
                    <button onClick={handleConfirm} className="modal-button-danger">Delete</button>
                </div>
            </div>
        </div>
    );
}