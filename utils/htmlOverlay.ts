import type { UserHtml, HtmlSettings } from '../types';
import { defaultHtmlSettings } from '../constants';

const importRegex = /@import\s+url\((['"])(.*?)\1\);/g;

export const generateSrcDoc = (content: UserHtml | null, forThumbnail: boolean = false, settings?: HtmlSettings): string => {
    if (!content || content.type !== 'code') return '';
    const { html, css, js } = content;

    const currentSettings = { ...defaultHtmlSettings, ...settings };
    const bodyBackgroundColor = currentSettings.backgroundColor;

    const fontLinks: string[] = [];
    let remainingCss = css;

    // Reset regex from previous uses
    importRegex.lastIndex = 0;

    // Find all @import rules
    const imports = [...css.matchAll(importRegex)];

    if (imports.length > 0) {
        const googleFontImports: string[] = [];

        // Filter out Google Font imports and create link tags
        imports.forEach(match => {
            const url = match[2];
            if (url && url.startsWith('https://fonts.googleapis.com/css')) {
                fontLinks.push(`<link href="${url}" rel="stylesheet">`);
                googleFontImports.push(match[0]);
            }
        });

        // Remove only the Google Font imports from the CSS string
        if (googleFontImports.length > 0) {
            remainingCss = css;
            googleFontImports.forEach(importRule => {
                remainingCss = remainingCss.replace(importRule, '');
            });
        }
    }

    const thumbnailStyles = forThumbnail ? `
        transform: scale(0.2);
        transform-origin: 0 0;
        width: 500%;
        height: 500%;
    ` : '';

    // Styles to disable all animations and scripts for thumbnails
    const thumbnailAnimationReset = forThumbnail ? `
        * {
            animation-play-state: paused !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
        }
    ` : '';

    const bodyBaseStyles = `margin: 0; padding: 0; overflow: hidden;`;

    // Key change:
    // 1. Set html background to transparent to avoid the white iframe bg.
    // 2. Add an inline style to the body for the user-selected color to ensure highest priority.
    // 3. Add base tag to resolve relative URLs (like images) in iframe
    // Note: For srcDoc iframes, we need to use the current page URL as base
    let baseUrl = '';
    if (typeof window !== 'undefined') {
        // Use current page URL as base for relative paths
        const url = new URL(window.location.href);
        baseUrl = url.origin + url.pathname;
        // Remove filename if present to get directory
        if (baseUrl.endsWith('.html') || baseUrl.endsWith('/')) {
            baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        }
    }

    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: http: blob:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${baseUrl ? `<base href="${baseUrl}">` : ''}
                ${fontLinks.join('\n')}
                <style>
                    html {
                        background-color: transparent;
                        color-scheme: dark; /* Prevents user-agent from overriding with a light theme bg */
                    }
                    body {
                        ${bodyBaseStyles}
                        ${thumbnailStyles}
                    }
                    ${thumbnailAnimationReset}
                    ${remainingCss}
                    /* Force transparent background with !important to override any user CSS */
                    html {
                        background-color: transparent !important;
                    }
                    body {
                        background-color: ${bodyBackgroundColor} !important;
                    }
                </style>
            </head>
            <body style="background-color: ${bodyBackgroundColor};">
                ${html}
                ${forThumbnail ? '' : `<script>${js}</script>`}
            </body>
        </html>
    `;
};