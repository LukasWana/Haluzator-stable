import React, { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useLibrary } from '../../contexts/LibraryContext';
import type { UserHtml } from '../../types';
import './ModalBase.css';
import './AddHtmlModal.css';

export function AddHtmlModal() {
    const { isAddHtmlModalOpen, setIsAddHtmlModalOpen } = useUI();
    const { saveHtml, allDisplayableKeys } = useLibrary();

    const [name, setName] = useState('');
    const [type, setType] = useState<'code' | 'url'>('code');
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    if (!isAddHtmlModalOpen) return null;

    const handleClose = () => {
        setName('');
        setUrl('');
        setType('code');
        setError('');
        setIsAddHtmlModalOpen(false);
    };

    const handleSubmit = () => {
        const trimmedName = name.trim();
        if (!trimmedName) { setError('HTML Overlay name is required.'); return; }
        if (allDisplayableKeys.includes(trimmedName)) {
            setError(`An item named "${trimmedName}" already exists. Please choose a unique name.`);
            return;
        }

        let data: UserHtml;

        if (type === 'url') {
            if (!url.trim() || !url.startsWith('http')) {
                setError('A valid URL (starting with http or https) is required.');
                return;
            }
            data = { type: 'url', url: url.trim() };
        } else {
            const htmlContent = '<h1>Hello World</h1>\n<p>Edit me!</p>';
            const cssContent = 'body {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  color: white;\n  font-family: sans-serif;\n  text-align: center;\n}';
            data = { 
                type: 'code',
                html: htmlContent, 
                css: cssContent, 
                js: 'console.log("Hello from the JS panel!");',
                sourceHtml: htmlContent,
                sourceCss: cssContent,
                htmlLang: 'html',
                cssLang: 'css',
            };
        }

        setError('');
        saveHtml(trimmedName, data);
        handleClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={handleClose} aria-label="Close">&times;</button>
                <h2>Add HTML Overlay</h2>
                {error && <p className="modal-error">{error}</p>}
                
                <div className="modal-form-group">
                    <label>Type</label>
                    <div className="type-selector">
                        <button className={type === 'code' ? 'active' : ''} onClick={() => setType('code')}>Code</button>
                        <button className={type === 'url' ? 'active' : ''} onClick={() => setType('url')}>URL</button>
                    </div>
                </div>

                <div className="modal-form-group">
                    <label htmlFor="html-name">Name</label>
                    <input id="html-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., 'My Title Card'" />
                </div>

                {type === 'url' && (
                    <div className="modal-form-group">
                        <label htmlFor="html-url">Website URL</label>
                        <input id="html-url" type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
                        <p className="url-warning">Note: Many websites (like Google, YouTube, etc.) block being embedded. This may not work for all URLs.</p>
                    </div>
                )}
                
                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-button-cancel">Cancel</button>
                    <button onClick={handleSubmit} className="modal-button-save">Create</button>
                </div>
            </div>
        </div>
    );
}