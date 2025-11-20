import React from 'react';
import type { UserHtml } from '../../types';
import { generateSrcDoc } from '../utils/htmlOverlay';
import './HtmlThumbnail.css';

interface HtmlThumbnailProps {
    content: UserHtml;
}

export const HtmlThumbnail: React.FC<HtmlThumbnailProps> = ({ content }) => {
    if (content.type === 'url') {
        return (
            <div className="html-thumbnail-wrapper url-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path>
                </svg>
            </div>
        );
    }

    const srcDoc = generateSrcDoc(content, true);

    return (
        <div className="html-thumbnail-wrapper">
            <iframe
                srcDoc={srcDoc}
                sandbox="" /* Disable scripts for security and performance */
                scrolling="no"
                className="html-thumbnail-iframe"
            />
        </div>
    );
};