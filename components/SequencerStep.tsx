import React, { useEffect, useRef } from 'react';
import { useUI } from '../contexts/UIContext';
import { useSequencer } from '../contexts/SequencerAndPlaybackProvider';
import type { UserVideo, UserHtml } from '../types';
import { HtmlThumbnail } from './HtmlThumbnail';

interface SequencerStepProps {
    type: 'media' | 'shader';
    index: number;
    itemKey: string | null;
    videoInfo?: UserVideo | null;
    imageSrc?: string | null;
    isModel?: boolean;
    isHtml?: boolean;
    htmlContent?: UserHtml | null;
    previewSrc?: string | null;
    isActive: boolean;
    isEditable: boolean;
    isLive: boolean;
    progressDuration?: number;
    onMouseDown: (index: number) => void;
    onMouseEnter: (index: number) => void;
    onClick: (index: number, type: 'media' | 'shader', e: React.MouseEvent<HTMLDivElement>) => void;
}

export const SequencerStep: React.FC<SequencerStepProps> = React.memo(({
    type, index, itemKey, videoInfo, imageSrc, isModel, isHtml, htmlContent, previewSrc,
    isActive, isEditable, isLive, progressDuration,
    onMouseDown, onMouseEnter, onClick
}) => {
    const progressRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const { setIsModelSettingsModalOpen, setSelectedItem, setIsEditHtmlModalOpen, setIsHtmlSettingsModalOpen } = useUI();
    const { setEditableStep } = useSequencer();

    useEffect(() => {
        const progressEl = progressRef.current;
        const cleanup = () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };

        if (isActive && type === 'media' && videoInfo?.element && progressEl) {
            const video = videoInfo.element;

            const updateProgress = () => {
                if (video.duration > 0) {
                    const progress = video.currentTime / video.duration;
                    progressEl.style.transform = `scaleX(${progress})`;
                }
                // Continue the loop only if the video is still playing
                if (!video.paused && !video.ended) {
                    animationFrameRef.current = requestAnimationFrame(updateProgress);
                } else {
                    // When the video ends, ensure the bar is full, then clean up.
                    if (video.ended) {
                        progressEl.style.transform = 'scaleX(1)';
                    }
                    cleanup();
                }
            };
            
            // Start the animation loop
            animationFrameRef.current = requestAnimationFrame(updateProgress);

        } else {
            // If the step is not an active video, reset the progress bar and clean up any running animation.
            if(progressEl) {
                progressEl.style.transform = 'scaleX(0)';
            }
            cleanup();
        }

        return cleanup;
    }, [isActive, videoInfo, type]);

    const handleSettingsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditableStep(index);
        if (itemKey) {
            setSelectedItem(itemKey);
        }
        setIsModelSettingsModalOpen(true);
    };

    const handleHtmlSettingsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditableStep(index);
        if (itemKey) {
            setSelectedItem(itemKey);
        }
        setIsEditHtmlModalOpen(true);
    };

    const handleHtmlAnimationSettingsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditableStep(index);
        if (itemKey) {
            setSelectedItem(itemKey);
        }
        setIsHtmlSettingsModalOpen(true);
    };

    const isVideoStep = type === 'media' && videoInfo;
    
    const classNames = `sequencer-step ${type}-step ${isActive ? 'active' : ''} ${isEditable ? 'editable' : ''} ${isLive ? 'live' : ''}`;
    
    const title = `Step ${index + 1}\nClick & Drag: Set Loop\nShift+Click: Set Loop Start\nCtrl/Cmd+Click: Set Loop End`;
    
    return (
        <div
            data-index={index}
            data-type={type}
            className={classNames}
            onMouseDown={() => onMouseDown(index)}
            onMouseEnter={() => onMouseEnter(index)}
            onClick={(e) => onClick(index, type, e)}
            style={{ 
                backgroundImage: (!isHtml && imageSrc) ? `url(${imageSrc})` : (!isHtml && previewSrc ? `url(${previewSrc})` : 'none'), 
                backgroundColor: (isVideoStep || isModel || isHtml) ? '#000' : (type === 'shader' && itemKey && !previewSrc) ? `hsl(0, 0%, ${20 + (index/31) * 15}%)` : undefined 
            }}
            title={title}
        >
            {isHtml && htmlContent && (
                <>
                    <HtmlThumbnail content={htmlContent} />
                    <div className="media-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"></path></svg>
                    </div>
                    <button className="step-settings-button html-settings-button edit" onClick={handleHtmlSettingsClick} title={`Edit content of HTML overlay in step ${index + 1}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>
                    </button>
                    <button className="step-settings-button html-settings-button anim" onClick={handleHtmlAnimationSettingsClick} title={`Animation settings for HTML overlay in step ${index + 1}`}>
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                    </button>
                </>
            )}

            {isVideoStep && (
                <>
                    <video 
                        key={videoInfo.objectURL}
                        src={videoInfo.objectURL} 
                        className="sequencer-video-preview"
                        muted
                        playsInline
                        preload="metadata"
                    />
                    <div className="media-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                    </div>
                </>
            )}

            {isModel && (
                 <>
                    <div className="media-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM12 13.5l-10-5V13l10 5 10-5V8.5l-10 5z"></path></svg>
                    </div>
                    <button className="step-settings-button" onClick={handleSettingsClick} title={`Settings for model in step ${index + 1}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                    </button>
                 </>
            )}
            
            {(type === 'shader' || isHtml) && itemKey && (
                <span className="shader-name">{itemKey}</span>
            )}
            
            {isActive && (
                (isVideoStep) ? (
                    <div
                        ref={progressRef}
                        className="sequencer-progress"
                        style={{
                            transform: 'scaleX(0)',
                            animation: 'none',
                            transition: 'none'
                        }}
                    />
                ) : (
                    progressDuration && (
                        <div
                            key={`progress-${index}`}
                            className="sequencer-progress"
                            style={{ animationDuration: `${progressDuration}s` }}
                        />
                    )
                )
            )}
        </div>
    );
});