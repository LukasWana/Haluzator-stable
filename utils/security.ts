import DOMPurify from 'dompurify';

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export const isValidUrl = (url: string): boolean => {
    try {
        const trimmed = url.trim();
        if (!trimmed) return false;

        // Must start with http:// or https://
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            return false;
        }

        // Try to parse as URL
        const urlObj = new URL(trimmed);

        // Check for valid protocol
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Note: For HTML overlay, we allow most HTML but sanitize dangerous elements
 */
export const sanitizeHtml = (html: string): string => {
    if (typeof window === 'undefined') {
        // Server-side rendering fallback (shouldn't happen in this app)
        return html;
    }

    return DOMPurify.sanitize(html, {
        // Allow most HTML tags and attributes for creative use
        // But block dangerous ones like <script>, <iframe> with src, etc.
        ALLOWED_TAGS: [
            'a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio',
            'b', 'bdi', 'bdo', 'big', 'blockquote', 'body', 'br', 'button',
            'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup',
            'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
            'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
            'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main',
            'map', 'mark', 'marquee', 'menu', 'menuitem', 'meta', 'meter', 'nav',
            'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param',
            'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp',
            'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary',
            'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead',
            'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
        ],
        ALLOWED_ATTR: [
            'href', 'title', 'alt', 'class', 'id', 'style', 'src', 'width', 'height',
            'target', 'rel', 'type', 'value', 'name', 'placeholder', 'disabled', 'checked',
            'selected', 'colspan', 'rowspan', 'scope', 'role', 'aria-label', 'aria-labelledby',
            'data-*', 'draggable', 'contenteditable'
        ],
        // Allow data URIs for images
        ALLOW_DATA_ATTR: true,
        // Keep relative URLs
        ALLOW_UNKNOWN_PROTOCOLS: false,
        // Don't allow iframes with external src
        FORBID_TAGS: ['script', 'iframe'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
    });
};

/**
 * Sanitizes CSS to prevent injection attacks
 */
export const sanitizeCss = (css: string): string => {
    // Basic CSS sanitization - remove potentially dangerous expressions
    // In a production app, you might want more sophisticated CSS parsing
    return css
        .replace(/expression\s*\(/gi, '') // Remove IE expression()
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/@import/gi, '@import') // Keep @import but could be restricted further
        .trim();
};

