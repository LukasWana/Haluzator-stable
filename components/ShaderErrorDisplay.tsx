import React from 'react';
import { useUI } from '../contexts/UIContext';
import './ShaderErrorDisplay.css';

interface ShaderErrorDisplayProps {
    activeShaderKey: string;
}

export function ShaderErrorDisplay({ activeShaderKey }: ShaderErrorDisplayProps) {
    const { shaderErrors } = useUI();
    const errorMessage = shaderErrors[activeShaderKey];
    
    if (!errorMessage) return null;

    return (
        <div className="shader-error-overlay">
            <div className="shader-error-content">
                <h3>Error: {activeShaderKey}</h3>
                <pre>{errorMessage}</pre>
            </div>
        </div>
    );
}