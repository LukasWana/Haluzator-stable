import type { UserHtml, HtmlSettings } from '../types';
import { defaultHtmlSettings } from '../constants';
import { sanitizeHtml, sanitizeCss } from './security';

const importRegex = /@import\s+url\((['"])(.*?)\1\);/g;

export const generateSrcDoc = (content: UserHtml | null, forThumbnail: boolean = false, settings?: HtmlSettings): string => {
    if (!content || content.type !== 'code') return '';
    // Sanitize user input to prevent XSS attacks
    const html = sanitizeHtml(content.html);
    const css = sanitizeCss(content.css);
    const js = content.js; // JS is already sandboxed in iframe with CSP

    const currentSettings = { ...defaultHtmlSettings, ...settings };
    const effectiveBackgroundColor = currentSettings.transparentBackground
        ? 'transparent'
        : currentSettings.backgroundColor;

    // This variable will be used for the inline style on the body.
    const bodyBackgroundColor = forThumbnail ? 'transparent' : effectiveBackgroundColor;

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
    return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'unsafe-inline' 'unsafe-eval';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                </style>
            </head>
            <body style="background-color: ${bodyBackgroundColor};">
                ${html}
                ${forThumbnail ? '' : `<script>${js}</script>`}
            </body>
        </html>
    `;
};