import React from 'react';
import { useSequencer, usePlayback } from '../contexts/SequencerAndPlaybackProvider';
import { useLibrary } from '../contexts/LibraryContext';
import { useUI } from '../contexts/UIContext';
import './Controls.css';

export const Controls: React.FC = () => {
    const { pageControls, currentPage, handleControlChange } = useSequencer();

    if (!pageControls[currentPage]) return null;
    const currentControls = pageControls[currentPage];

    return (
        <div className="controls">
            <div className="sliders-container">
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>TEMPO</label>
                  <span className="slider-value">{currentControls.stepsPerMinute}</span>
                </div>
                <input type="range" min="6" max="120" value={currentControls.stepsPerMinute} onChange={e => handleControlChange('stepsPerMinute', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>OVERLAY</label>
                  <span className="slider-value">{currentControls.overlayOpacity}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.overlayOpacity} onChange={e => handleControlChange('overlayOpacity', parseInt(e.target.value))} title="A/S" />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>AUDIO</label>
                  <span className="slider-value">{currentControls.audioInfluence}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.audioInfluence} onChange={e => handleControlChange('audioInfluence', parseInt(e.target.value))} title="D/F" />
              </div>
               <div className="slider-group">
                <div className="slider-label-container">
                  <label>BLUR</label>
                  <span className="slider-value">{currentControls.blurAmount}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.blurAmount} onChange={e => handleControlChange('blurAmount', parseInt(e.target.value))} title="G/H" />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>GLOW</label>
                  <span className="slider-value">{currentControls.glowAmount}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.glowAmount} onChange={e => handleControlChange('glowAmount', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>CHROMA</label>
                  <span className="slider-value">{currentControls.chromaAmount}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.chromaAmount} onChange={e => handleControlChange('chromaAmount', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>HUE</label>
                  <span className="slider-value">{currentControls.hueShift}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.hueShift} onChange={e => handleControlChange('hueShift', parseInt(e.target.value))} title="J/K" />
              </div>
               <div className="slider-group">
                <div className="slider-label-container">
                  <label>MANDALA</label>
                  <span className="slider-value">{currentControls.mandalaSegments}</span>
                </div>
                <input type="range" min="1" max="16" step="1" value={currentControls.mandalaSegments} onChange={e => handleControlChange('mandalaSegments', parseInt(e.target.value))} title="L/;" />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>SHADOWS</label>
                  <span className="slider-value">{currentControls.levelShadows}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.levelShadows} onChange={e => handleControlChange('levelShadows', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>MIDTONES</label>
                  <span className="slider-value">{currentControls.levelMidtones}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.levelMidtones} onChange={e => handleControlChange('levelMidtones', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>HIGHLIGHTS</label>
                  <span className="slider-value">{currentControls.levelHighlights}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.levelHighlights} onChange={e => handleControlChange('levelHighlights', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>SATURATION</label>
                  <span className="slider-value">{currentControls.saturation}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.saturation} onChange={e => handleControlChange('saturation', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>SPEED</label>
                  <span className="slider-value">{currentControls.speed}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.speed} onChange={e => handleControlChange('speed', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>ZOOM</label>
                  <span className="slider-value">{currentControls.zoom}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.zoom} onChange={e => handleControlChange('zoom', parseInt(e.target.value))} />
              </div>
              <div className="slider-group">
                <div className="slider-label-container">
                  <label>PARTICLES</label>
                  <span className="slider-value">{currentControls.particles}</span>
                </div>
                <input type="range" min="0" max="100" value={currentControls.particles} onChange={e => handleControlChange('particles', parseInt(e.target.value))} />
              </div>
            </div>
        </div>
    );
};