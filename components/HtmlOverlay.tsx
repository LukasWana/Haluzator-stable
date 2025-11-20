import React, { forwardRef, useMemo } from 'react';
import { usePlayback } from '../contexts/SequencerAndPlaybackProvider';
import { useLibrary } from '../contexts/LibraryContext';
import { useSequencer } from '../contexts/SequencerAndPlaybackProvider';
import { generateSrcDoc } from '../utils/htmlOverlay';
import { defaultHtmlSettings } from '../constants';
import type { UserHtml } from '../types';
import './HtmlOverlay.css';

interface PreloadedIframeProps {
    itemKey: string;
    transitionState: ReturnType<typeof usePlayback>['transitionState'];
    overallOpacity: number;
}

const PreloadedIframe: React.FC<PreloadedIframeProps> = React.memo(({ itemKey, transitionState, overallOpacity }) => {
    const { userHtml } = useLibrary();
    const htmlContent = userHtml[itemKey] || null;

    const { isTransitioning, transitionProgress, toMediaKey, fromMediaKey, toHtmlSettings, fromHtmlSettings } = transitionState;
    
    let isVisible = false;
    let isIn = false;
    let settings = defaultHtmlSettings;

    if (isTransitioning) {
        if (itemKey === toMediaKey) {
            isVisible = true;
            isIn = true;
            settings = toHtmlSettings || defaultHtmlSettings;
        } else if (itemKey === fromMediaKey) {
            isVisible = true;
            isIn = false;
            settings = fromHtmlSettings || defaultHtmlSettings;
        }
    } else if (itemKey === toMediaKey) {
        isVisible = true;
        isIn = true;
        settings = toHtmlSettings || defaultHtmlSettings;
    }

    const srcDoc = useMemo(() => {
        if (!htmlContent || htmlContent.type !== 'code') return '';
        return generateSrcDoc(htmlContent, false, settings);
    }, [htmlContent, settings]);

    if (!htmlContent || !isVisible) {
        return null;
    }

    const progress = isTransitioning ? transitionProgress : 1.0;
    // Ease-in-out for smoother animations
    const easedProgress = progress * progress * (3 - 2 * progress);
    
    const finalProgress = isIn ? easedProgress : 1 - easedProgress;
    
    let transform = 'none';
    let opacity = 0;

    switch (settings.htmlTransitionType) {
        case 'slide-in-top':
            transform = `translateY(${(1 - finalProgress) * -100}%)`;
            opacity = finalProgress;
            break;
        case 'slide-in-bottom':
            transform = `translateY(${(1 - finalProgress) * 100}%)`;
            opacity = finalProgress;
            break;
        case 'slide-in-left':
            transform = `translateX(${(1 - finalProgress) * -100}%)`;
            opacity = finalProgress;
            break;
        case 'slide-in-right':
            transform = `translateX(${(1 - finalProgress) * 100}%)`;
            opacity = finalProgress;
            break;
        case 'zoom-in':
            transform = `scale(${0.8 + finalProgress * 0.2})`;
            opacity = finalProgress;
            break;
        case 'zoom-out':
            transform = `scale(${1.2 - (1 - finalProgress) * 0.2})`;
            opacity = finalProgress;
            break;
        case 'fade':
        default:
            opacity = finalProgress;
            break;
    }

    const finalOpacity = opacity * overallOpacity;
    
    if (finalOpacity <= 0) {
        return null;
    }

    const style: React.CSSProperties = {
        opacity: finalOpacity,
        transform,
        pointerEvents: finalOpacity >= 1 && overallOpacity >= 1 ? 'auto' : 'none',
    };

    if (htmlContent.type === 'code') {
        return (
            <iframe
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                className="html-overlay-iframe"
                style={style}
            />
        );
    }

    if (htmlContent.type === 'url') {
        return (
            <iframe
                src={htmlContent.url}
                sandbox="allow-scripts allow-same-origin allow-forms"
                className="html-overlay-iframe"
                style={style}
            />
        );
    }

    return null;
});


export const HtmlOverlay = forwardRef<HTMLDivElement>((props, ref) => {
    const { transitionState } = usePlayback();
    const { userHtml } = useLibrary();
    const { pageControls, currentPage, mediaSequences, sequencerSteps } = useSequencer();

    const overallOpacity = pageControls[currentPage].overlayOpacity / 100;

    const uniqueHtmlKeysOnPage = useMemo(() => {
        const keys = new Set<string>();
        const currentMediaSequence = mediaSequences[currentPage];
        for (let i = 0; i < sequencerSteps; i++) {
            const itemKey = currentMediaSequence[i]?.key;
            if (itemKey && userHtml[itemKey]) {
                keys.add(itemKey);
            }
        }
        // Also ensure the currently transitioning items are included, even if not on the page
        if (transitionState.fromMediaKey && userHtml[transitionState.fromMediaKey]) {
            keys.add(transitionState.fromMediaKey);
        }
        if (transitionState.toMediaKey && userHtml[transitionState.toMediaKey]) {
            keys.add(transitionState.toMediaKey);
        }
        return Array.from(keys);
    }, [mediaSequences, currentPage, sequencerSteps, userHtml, transitionState.fromMediaKey, transitionState.toMediaKey]);

    const containerStyle: React.CSSProperties = {
        pointerEvents: overallOpacity >= 1 ? 'auto' : 'none',
    };
    
    return (
        <div className="html-overlay-container" ref={ref} style={containerStyle}>
            {uniqueHtmlKeysOnPage.map(itemKey => (
                <PreloadedIframe
                    key={itemKey}
                    itemKey={itemKey}
                    transitionState={transitionState}
                    overallOpacity={overallOpacity}
                />
            ))}
        </div>
    );
});