import type { ControlSettings, HtmlSettings } from './types';

export const MAX_SEQUENCER_STEPS = 32;
export const DEFAULT_SEQUENCER_STEPS = 8;
export const SEQUENCER_STEP_OPTIONS = [2, 4, 8, 16];
export const TRANSITION_DURATION_MS = 1000;
export const NUM_PAGES = 8;

export const initialShaderSequence = Array(MAX_SEQUENCER_STEPS).fill(null);

export const APP_STATE_STORAGE_KEY = 'shaderSequencerAppState';
export const USER_SHADERS_STORAGE_KEY = 'userCustomShaders';
export const USER_HTML_STORAGE_KEY = 'userUploadedHtml';
export const USER_IMAGES_STORAGE_KEY = 'userUploadedImages';
export const STATE_VERSION = 9;
export const SESSION_FILE_VERSION = 16;

export const defaultControls: ControlSettings = {
    stepsPerMinute: 15,
    audioInfluence: 100,
    blurAmount: 0,
    glowAmount: 0,
    chromaAmount: 0,
    hueShift: 0,
    mandalaSegments: 1,
    overlayOpacity: 100,
    levelShadows: 0,
    levelMidtones: 50,
    levelHighlights: 0,
    saturation: 50,
    speed: 50,
    zoom: 50,
    particles: 0,
    modelAnimationType: 'rotate-y',
    modelAnimationSpeed: 100,
    modelTransitionType: 'fade',
    modelZoom: 50,
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: 0,
    modelWireframe: false,
    modelUseShaderTexture: false,
    cameraFlyAround: false,
    cameraRotationX: 0,
    cameraRotationY: 0,
};

export const defaultHtmlSettings: HtmlSettings = {
    htmlTransitionType: 'fade',
    transparentBackground: true,
    backgroundColor: '#000000',
};