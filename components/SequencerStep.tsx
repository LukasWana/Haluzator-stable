import React, { useEffect, useRef } from 'react';
import type { UserVideo } from '../types';

interface SequencerStepProps {
    type: 'media' | 'shader';
    index: number;
    itemKey: string | null;
    videoInfo?: UserVideo | null;
    imageSrc?: string | null;
    isModel?: boolean;
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
    type, index, itemKey, videoInfo, imageSrc, isModel, previewSrc,
    isActive, isEditable, isLive, progressDuration,
    onMouseDown, onMouseEnter, onClick
}) => {
    const progressRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);

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
                backgroundImage: imageSrc ? `url(${imageSrc})` : (previewSrc ? `url(${previewSrc})` : 'none'), 
                backgroundColor: (isVideoStep || isModel) ? '#000' : (type === 'shader' && itemKey && !previewSrc) ? `hsl(0, 0%, ${20 + (index/31) * 15}%)` : undefined 
            }}
            title={title}
        >
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
                 <div className="media-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM12 13.5l-10-5V13l10 5 10-5V8.5l-10 5z"></path></svg>
                </div>
            )}
            
            {type === 'shader' && itemKey && (
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