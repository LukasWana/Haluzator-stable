import React, { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useLibrary } from '../../contexts/LibraryContext';
import './ModalBase.css';

export function AddShaderModal() {
    const { isAddShaderModalOpen, setIsAddShaderModalOpen } = useUI();
    const { saveShader } = useLibrary();

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    if (!isAddShaderModalOpen) return null;

    const handleClose = () => {
        setName('');
        setCode('');
        setError('');
        setIsAddShaderModalOpen(false);
    };

    const handleSubmit = () => {
        if (!name.trim()) { setError('Shader name is required.'); return; }
        if (!code.trim()) { setError('Shader code is required.'); return; }
        setError('');
        saveShader(name.trim(), code);
        handleClose();
    };

    const placeholderCode = `// Your GLSL code can use main() or mainImage().
// The app will adapt main() automatically.
//
// Uniforms available:
// uniform vec3 iResolution; // (in main(): resolution)
// uniform float iTime;       // (in main(): time)
// uniform vec4 iMouse;      // (in main(): mouse)
// uniform vec4 iAudio;      // audio data (low, mid, high, overall)
//
// Example with main():
void main()
{
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 col = 0.5 + 0.5*cos(time+uv.xyx+vec3(0,2,4));
    gl_FragColor = vec4(col,1.0);
}`;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Add Custom Shader</h2>
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-form-group">
                    <label htmlFor="shader-name">Shader Name</label>
                    <input id="shader-name" type="text" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="modal-form-group">
                    <label htmlFor="shader-code">GLSL Code</label>
                    <textarea id="shader-code" value={code} onChange={e => setCode(e.target.value)} placeholder={placeholderCode} rows={15}></textarea>
                </div>
                
                <div className="modal-actions">
                    <button onClick={handleClose} className="modal-button-cancel">Cancel</button>
                    <button onClick={handleSubmit} className="modal-button-save">Save Shader</button>
                </div>
            </div>
        </div>
    );
}