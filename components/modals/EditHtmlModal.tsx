import React, { useState, useEffect, useRef } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useLibrary } from '../../contexts/LibraryContext';
import { MonacoEditor } from '../MonacoEditor';
import { generateSrcDoc } from '../../utils/htmlOverlay';
import { isValidUrl } from '../../utils/security';
import './ModalBase.css';
import './EditHtmlModal.css';

export function EditHtmlModal() {
    const { isEditHtmlModalOpen, setIsEditHtmlModalOpen, selectedItem, setSelectedItem } = useUI();
    const { userHtml, updateHtml, updateMediaName } = useLibrary();

    const [html, setHtml] = useState('');
    const [css, setCss] = useState('');
    const [js, setJs] = useState('');
    const [url, setUrl] = useState('');
    const [srcDoc, setSrcDoc] = useState('');
    const [editableName, setEditableName] = useState('');
    const [collapsedPanes, setCollapsedPanes] = useState({
        html: false,
        css: false,
        js: false,
    });

    const [compiling, setCompiling] = useState(false);
    const [compileError, setCompileError] = useState('');
    const srcDocTimeoutRef = useRef<number | null>(null);

    const currentItem = selectedItem ? userHtml[selectedItem] : null;

    useEffect(() => {
        if (isEditHtmlModalOpen && currentItem) {
            setEditableName(selectedItem);
            if (currentItem.type === 'code') {
                // Pug and Stylus are no longer supported in the editor.
                // We load the raw source if it exists, otherwise the compiled version.
                // The user will be editing plain HTML/CSS.
                setHtml(currentItem.sourceHtml ?? currentItem.html);
                setCss(currentItem.sourceCss ?? currentItem.css);
                setJs(currentItem.js ?? '');
                setCompileError('');
            } else {
                setUrl(currentItem.url);
            }
        }
    }, [isEditHtmlModalOpen, currentItem, selectedItem]);

    // Live preview update effect
    useEffect(() => {
        if (!isEditHtmlModalOpen || currentItem?.type !== 'code') return;

        if (srcDocTimeoutRef.current) {
            clearTimeout(srcDocTimeoutRef.current);
        }

        srcDocTimeoutRef.current = window.setTimeout(() => {
            // Since pug/stylus are removed, compilation is no longer needed.
            // We can directly use the editor content.
            const doc = generateSrcDoc({ type: 'code', html, css, js });
            setSrcDoc(doc);
            setCompileError('');
        }, 250); // 250ms debounce

        return () => {
            if (srcDocTimeoutRef.current) {
                clearTimeout(srcDocTimeoutRef.current);
            }
        };
    }, [html, css, js, currentItem, isEditHtmlModalOpen]);


    if (!isEditHtmlModalOpen || !currentItem) return null;

    const handleClose = () => {
        setIsEditHtmlModalOpen(false);
    };

    const togglePane = (pane: 'html' | 'css' | 'js') => {
        setCollapsedPanes(prev => ({ ...prev, [pane]: !prev[pane] }));
    };

    const handleSubmit = async () => {
        setCompiling(true);
        setCompileError('');
        try {
            const finalName = editableName.trim();
            const originalName = selectedItem;
            let effectiveName = originalName;

            if (finalName && finalName !== originalName) {
                const renameSuccess = await updateMediaName(originalName, finalName);
                if (!renameSuccess) {
                    setCompiling(false);
                    setEditableName(originalName); // Revert on failure
                    // Error is shown by updateMediaName via an alert
                    return;
                }
                effectiveName = finalName;
                setSelectedItem(finalName);
            }

            if (currentItem.type === 'code') {
                // No compilation needed. We save the current editor content
                // as both the compiled and source versions.
                updateHtml(effectiveName, {
                    type: 'code',
                    html: html,
                    css: css,
                    js,
                    sourceHtml: html,
                    sourceCss: css,
                    htmlLang: 'html',
                    cssLang: 'css',
                });

            } else { // type is 'url'
                const trimmedUrl = url.trim();
                if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
                    setCompileError('A valid URL (starting with http:// or https://) is required.');
                    setCompiling(false);
                    return;
                }
                updateHtml(effectiveName, { type: 'url', url: trimmedUrl });
            }
            handleClose();
        } catch (e: any) {
            console.error('Save error:', e);
            setCompileError(e.message || 'An unknown error occurred during save.');
        } finally {
            setCompiling(false);
        }
    };

    const title = currentItem.type === 'code' ? 'Edit Code Overlay' : 'Edit URL Overlay';

    return (
        <div className="modal-overlay">
            <div className="modal-content edit-html-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={handleClose} aria-label="Close">&times;</button>
                <h2>
                    {title}:
                    <input
                        type="text"
                        value={editableName}
                        onChange={e => setEditableName(e.target.value)}
                        className="modal-title-input"
                        onClick={e => e.stopPropagation()}
                    />
                </h2>
                {compileError && <p className="modal-error">{compileError}</p>}

                {currentItem.type === 'code' ? (
                    <div className="edit-html-layout">
                        <div className="editor-panes">
                           <div className={`editor-pane ${collapsedPanes.html ? 'collapsed' : ''}`}>
                                <div className="editor-header" onClick={() => togglePane('html')}>
                                    <div className="editor-header-left">
                                        <svg className="pane-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>
                                        <label>HTML</label>
                                    </div>
                                </div>
                                {!collapsedPanes.html && <MonacoEditor language="html" value={html} onChange={setHtml} />}
                            </div>
                             <div className={`editor-pane ${collapsedPanes.css ? 'collapsed' : ''}`}>
                                <div className="editor-header" onClick={() => togglePane('css')}>
                                    <div className="editor-header-left">
                                        <svg className="pane-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>
                                        <label>CSS</label>
                                    </div>
                                </div>
                                {!collapsedPanes.css && <MonacoEditor language="css" value={css} onChange={setCss} />}
                            </div>
                            <div className={`editor-pane ${collapsedPanes.js ? 'collapsed' : ''}`}>
                               <div className="editor-header" onClick={() => togglePane('js')}>
                                    <div className="editor-header-left">
                                        <svg className="pane-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>
                                        <label>JavaScript</label>
                                    </div>
                                </div>
                                {!collapsedPanes.js && <MonacoEditor language="javascript" value={js} onChange={setJs} />}
                            </div>
                        </div>
                        <div className="preview-pane">
                           <iframe
                                srcDoc={srcDoc}
                                sandbox="allow-scripts allow-same-origin"
                                title="Live Preview"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="modal-form-group">
                        <label htmlFor="html-url-edit">Website URL</label>
                        <input id="html-url-edit" type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
                        <p className="url-warning">Note: Many websites block being embedded due to security policies (X-Frame-Options). This may not work for all URLs.</p>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-button-cancel">Cancel</button>
                    <button onClick={handleSubmit} className="modal-button-save" disabled={compiling}>
                        {compiling ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}