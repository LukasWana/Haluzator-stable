import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSequencer, usePlayback } from '../contexts/SequencerAndPlaybackProvider';
import { useLibrary } from '../contexts/LibraryContext';
import { SequencerStep } from './SequencerStep';
import './Sequencer.css';

export const Sequencer = React.memo(function Sequencer() {
    const { 
        shaderSequences, mediaSequences, currentPage, sequencerSteps, isLoopingEnabled,
        loopStart, loopEnd, pageControls, editableStep,
        isSelectingLoop, startLoopSelection, updateLoopSelection, endLoopSelection,
        handleStepClick
    } = useSequencer();
    
    const { isPlaying, currentStep, liveVjStep } = usePlayback();
    const { userImages, userVideos, userModels, modelPreviews, shaderPreviews } = useLibrary();

    const shaderSequence = shaderSequences[currentPage].slice(0, sequencerSteps);
    const mediaSequence = mediaSequences[currentPage].slice(0, sequencerSteps);
    const duration = 60 / pageControls[currentPage].stepsPerMinute;

    const mediaStepsRef = useRef<HTMLDivElement>(null);
    const [loopIndicatorStyle, setLoopIndicatorStyle] = useState({});
    const didDragRef = useRef(false);

    const calculateLoopIndicator = useCallback(() => {
        if (isLoopingEnabled && mediaStepsRef.current?.children.length > loopEnd) {
            const row = mediaStepsRef.current;
            const startNode = row.children[loopStart] as HTMLElement;
            const endNode = row.children[loopEnd] as HTMLElement;

            if (startNode && endNode) {
                const left = startNode.offsetLeft;
                const width = (endNode.offsetLeft + endNode.offsetWidth) - left;
                setLoopIndicatorStyle({
                    left: `${left}px`,
                    width: `${width}px`,
                    opacity: 1
                });
            }
        } else {
            setLoopIndicatorStyle({ opacity: 0 });
        }
    }, [isLoopingEnabled, loopStart, loopEnd]);

    useEffect(() => {
        const timeoutId = setTimeout(calculateLoopIndicator, 0);
        window.addEventListener('resize', calculateLoopIndicator);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', calculateLoopIndicator);
        };
    }, [calculateLoopIndicator, sequencerSteps, currentPage]);

    useEffect(() => {
        const handleMouseUp = () => {
            if (isSelectingLoop) {
                endLoopSelection();
            }
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isSelectingLoop, endLoopSelection]);

    const handleLocalMouseDown = useCallback((index: number) => {
        didDragRef.current = false;
        startLoopSelection(index);
    }, [startLoopSelection]);

    const handleLocalMouseEnter = useCallback((index: number) => {
        if (isSelectingLoop) {
            didDragRef.current = true;
            updateLoopSelection(index);
        }
    }, [isSelectingLoop, updateLoopSelection]);
    
    const handleLocalClick = useCallback((index: number, type: 'media' | 'shader', e: React.MouseEvent<HTMLDivElement>) => {
        if (didDragRef.current) {
            return;
        }
        handleStepClick(index, type, e);
    }, [handleStepClick]);

    return (
        <div className="sequencer">
            <div className="sequencer-row media-sequencer">
                <div className="steps-container" ref={mediaStepsRef}>
                    {mediaSequence.map((item, index) => {
                        const isModel = !!(item?.key && userModels[item.key]);
                        return (
                            <SequencerStep
                                key={`media-${index}`}
                                type="media"
                                index={index}
                                itemKey={item?.key}
                                videoInfo={item?.key ? userVideos[item.key] : null}
                                imageSrc={item?.key ? (userImages[item.key] || modelPreviews[item.key]) : null}
                                isModel={isModel}
                                isActive={isPlaying && currentStep === index}
                                isEditable={editableStep === index}
                                isLive={liveVjStep === index}
                                onMouseDown={handleLocalMouseDown}
                                onMouseEnter={handleLocalMouseEnter}
                                onClick={handleLocalClick}
                            />
                        );
                    })}
                </div>
                {isLoopingEnabled && (
                    <div className="loop-indicator" style={loopIndicatorStyle}>
                        <div className="loop-handle" />
                        <div className="loop-bar" />
                        <div className="loop-handle" />
                    </div>
                )}
            </div>
             <div className="sequencer-row shader-sequencer">
                <div className="steps-container">
                    {shaderSequence.map((shaderKey, index) => (
                        <SequencerStep
                            key={`shader-${index}`}
                            type="shader"
                            index={index}
                            itemKey={shaderKey}
                            previewSrc={shaderKey ? shaderPreviews[shaderKey] : null}
                            isActive={isPlaying && currentStep === index}
                            isEditable={editableStep === index}
                            isLive={liveVjStep === index}
                            progressDuration={duration}
                            onMouseDown={handleLocalMouseDown}
                            onMouseEnter={handleLocalMouseEnter}
                            onClick={handleLocalClick}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});