// FIX: Import React to make React types available in this file.
import React from 'react';

// For useWebGL hook
export interface ProgramInfo {
  program: WebGLProgram;
  uniforms: {
    iResolution: WebGLUniformLocation | null;
    iTime: WebGLUniformLocation | null;
    iMouse: WebGLUniformLocation | null;
    iAudio: WebGLUniformLocation | null;
    iChannel0: WebGLUniformLocation | null;
    iChannel0Resolution: WebGLUniformLocation | null;
    u_fromTexture: WebGLUniformLocation | null;
    u_toTexture: WebGLUniformLocation | null;
    u_progress: WebGLUniformLocation | null;
    u_blurAmount: WebGLUniformLocation | null;
    u_glowAmount: WebGLUniformLocation | null;
    u_chromaAmount: WebGLUniformLocation | null;
    u_hueShift: WebGLUniformLocation | null;
    u_mandalaSegments: WebGLUniformLocation | null;
    u_levelShadows: WebGLUniformLocation | null;
    u_levelMidtones: WebGLUniformLocation | null;
    u_levelHighlights: WebGLUniformLocation | null;
    u_saturation: WebGLUniformLocation | null;
    u_speed: WebGLUniformLocation | null;
    u_zoom: WebGLUniformLocation | null;
    u_baseTexture?: WebGLUniformLocation | null;
    u_overlayTexture?: WebGLUniformLocation | null;
    u_overlayTextureResolution?: WebGLUniformLocation | null;
    u_hasOverlay?: WebGLUniformLocation | null;
    u_overlayOpacity?: WebGLUniformLocation | null;
    u_overlayZoom?: WebGLUniformLocation | null;
    u_particleAmount?: WebGLUniformLocation | null;

    // For Model shader
    u_modelMatrix?: WebGLUniformLocation | null;
    u_viewMatrix?: WebGLUniformLocation | null;
    u_projectionMatrix?: WebGLUniformLocation | null;
    u_lightDirection?: WebGLUniformLocation | null;
    u_cameraPosition?: WebGLUniformLocation | null;
    u_color?: WebGLUniformLocation | null;
    u_alpha?: WebGLUniformLocation | null;
    u_shaderTexture?: WebGLUniformLocation | null;
    u_useShaderTexture?: WebGLUniformLocation | null;


    // For Texture Quad shader
    u_texture?: WebGLUniformLocation | null;
  };
  attribs: {
    a_position: number;
    a_normal?: number;
  };
}

export interface FBOInfo {
  framebuffer: WebGLFramebuffer | null;
  texture: WebGLTexture | null;
  depthBuffer?: WebGLRenderbuffer | null;
  width: number;
  height: number;
}

export type ShaderDefinition = string | { base: string; effect: string };

// For App state and components
export type UserShader = { code: string; };
export type UserShaders = Record<string, UserShader>;
export type UserImage = string; // Base64 data URL
export type UserImages = Record<string, UserImage>;
export type UserVideo = { objectURL: string; element: HTMLVideoElement; file: File };
export type UserVideos = Record<string, UserVideo>;
export type UserModel = { 
    geometry: any; // THREE.BufferGeometry
    wireframeGeometry?: any; // THREE.WireframeGeometry
    file: File;
    center?: any; // THREE.Vector3
    scale?: number;
};
export type UserModels = Record<string, UserModel>;
export type UserHtml = {
    type: 'code';
    html: string;       // Always compiled HTML
    css: string;        // Always compiled CSS
    js: string;
    sourceHtml?: string; // Raw source (HTML or Pug)
    sourceCss?: string;  // Raw source (CSS or Stylus)
    htmlLang?: 'html' | 'pug';
    cssLang?: 'css' | 'stylus';
} | {
    type: 'url';
    url: string;
};
export type UserHtmls = Record<string, UserHtml>;
export type HtmlSettings = {
    htmlTransitionType: 'fade' | 'slide-in-top' | 'slide-in-bottom' | 'slide-in-left' | 'slide-in-right' | 'zoom-in' | 'zoom-out';
    transparentBackground: boolean;
    backgroundColor: string;
};
export type ControlSettings = {
    stepsPerMinute: number;
    audioInfluence: number;
    blurAmount: number;
    glowAmount: number;
    chromaAmount: number;
    hueShift: number;
    mandalaSegments: number;
    overlayOpacity: number;
    levelShadows: number;
    levelMidtones: number;
    levelHighlights: number;
    saturation: number;
    speed: number;
    zoom: number;
    particles: number;
    modelAnimationType: string;
    modelAnimationSpeed: number;
    modelTransitionType: string;
    modelZoom: number;
    modelRotationX: number;
    modelRotationY: number;
    modelRotationZ: number;
    modelWireframe: boolean;
    modelUseShaderTexture: boolean;
    cameraFlyAround: boolean;
    cameraRotationX: number;
    cameraRotationY: number;
};
export type MediaSequenceItem = { 
    key: string | null; 
    htmlSettings?: HtmlSettings;
};

// For AddMediaModal
export type StagedFile = {
    id: string;
    name: string;
    file: File;
    previewSrc: string;
    type: 'image' | 'video' | 'model';
};

// --- New Multi-Context State Types ---

// UI Context
export interface UIState {
    isAddShaderModalOpen: boolean;
    isAddMediaModalOpen: boolean;
    isAddHtmlModalOpen: boolean;
    isEditHtmlModalOpen: boolean;
    isHtmlSettingsModalOpen: boolean;
    isModelSettingsModalOpen: boolean;
    isHelpModalOpen: boolean;
    isConfirmDeleteModalOpen: boolean;
    itemToDelete: { key: string; type: 'media' | 'shader' } | null;
    isProjectingTransition: boolean;
    shaderErrors: Record<string, string | null>;
    fpsDisplay: string;
    selectedItem: string;
    isFullscreen: boolean;
    isSessionLoading: boolean;
    sessionLoadingDetails: string;
    isDraggingOver: boolean;
    initialFilesForModal: File[] | null;
}
export interface UIActions {
    setIsAddShaderModalOpen: (isOpen: boolean) => void;
    setIsAddMediaModalOpen: (isOpen: boolean) => void;
    setIsAddHtmlModalOpen: (isOpen: boolean) => void;
    setIsEditHtmlModalOpen: (isOpen: boolean) => void;
    setIsHtmlSettingsModalOpen: (isOpen: boolean) => void;
    setIsModelSettingsModalOpen: (isOpen: boolean) => void;
    setIsHelpModalOpen: (isOpen: boolean) => void;
    setIsConfirmDeleteModalOpen: (isOpen: boolean) => void;
    setItemToDelete: (item: { key: string; type: 'media' | 'shader' } | null) => void;
    setIsProjectingTransition: (isTransitioning: boolean) => void;
    handleShaderError: (key: string, message: string | null) => void;
    handleFpsUpdate: (fps: number, scale: number) => void;
    setSelectedItem: (item: string) => void;
    setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
    handleFullscreenToggle: (canvasRef: React.RefObject<HTMLCanvasElement>) => void;
    setIsSessionLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setSessionLoadingDetails: React.Dispatch<React.SetStateAction<string>>;
    setIsDraggingOver: React.Dispatch<React.SetStateAction<boolean>>;
    setInitialFilesForModal: React.Dispatch<React.SetStateAction<File[] | null>>;
}
export type UIContextValue = UIState & UIActions;

// Sequencer Context
export interface SequencerState {
    shaderSequences: (string | null)[][];
    mediaSequences: MediaSequenceItem[][];
    currentPage: number;
    pageControls: ControlSettings[];
    sequencerSteps: number;
    isPlaying: boolean;
    isLoopingEnabled: boolean;
    loopStart: number;
    loopEnd: number;
    currentStep: number;
    editableStep: number;
    liveVjStep: number | null;
    activeShaderKey: string;
    transitionState: {
        fromShaderKey: string;
        toShaderKey: string;
        fromMediaKey: string | null;
        toMediaKey: string | null;
        fromHtmlSettings: HtmlSettings | null;
        toHtmlSettings: HtmlSettings | null;
        isTransitioning: boolean;
        transitionProgress: number;
    };
    isSelectingLoop: boolean;
}
export interface SequencerActions {
    setMediaSequences: React.Dispatch<React.SetStateAction<MediaSequenceItem[][]>>;
    setShaderSequences: React.Dispatch<React.SetStateAction<(string | null)[][]>>;
    setPageControls: React.Dispatch<React.SetStateAction<ControlSettings[]>>;
    setSequencerSteps: React.Dispatch<React.SetStateAction<number>>;
    setIsLoopingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setLoopStart: React.Dispatch<React.SetStateAction<number>>;
    setLoopEnd: React.Dispatch<React.SetStateAction<number>>;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    handleControlChange: (field: keyof ControlSettings, value: number | boolean | string) => void;
    handlePageChange: (newPageIndex: number) => void;
    handleSequencerStepsChange: (newSteps: number) => void;
    handleStepClick: (index: number, type: 'media' | 'shader', event: React.MouseEvent) => void;
    togglePlay: () => void;
    toggleLoop: () => void;
    shiftLoop: (direction: 'left' | 'right') => void;
    advanceSequence: () => void;
    triggerLiveVjStep: (stepIndex: number) => void;
    startTransition: (from: { shaderKey: string | null; mediaKey: string | null; htmlSettings: HtmlSettings | null; }, to: { shaderKey: string | null; mediaKey: string | null; htmlSettings: HtmlSettings | null; }) => void;
    setEditableStep: (step: number) => void;
    startLoopSelection: (index: number) => void;
    updateLoopSelection: (index: number) => void;
    endLoopSelection: () => void;
    addMediaToSequencer: (keys: string[]) => void;
}
export type SequencerContextValue = SequencerState & SequencerActions;

// Library Context
export interface LibraryState {
    userShaders: UserShaders;
    userImages: UserImages;
    userVideos: UserVideos;
    userModels: UserModels;
    userHtml: UserHtmls;
    shaderPreviews: Record<string, string>;
    modelPreviews: Record<string, string>;
    shaders: Record<string, string>;
    defaultShaderKeys: string[];
    allDisplayableKeys: string[];
}
export interface LibraryActions {
    setUserShaders: React.Dispatch<React.SetStateAction<UserShaders>>;
    setUserImages: React.Dispatch<React.SetStateAction<UserImages>>;
    setUserVideos: React.Dispatch<React.SetStateAction<UserVideos>>;
    setUserModels: React.Dispatch<React.SetStateAction<UserModels>>;
    setUserHtml: React.Dispatch<React.SetStateAction<UserHtmls>>;
    deleteShader: (key: string) => void;
    deleteMedia: (key: string) => void;
    saveShader: (name: string, code: string) => void;
    saveMedia: (files: { name: string; file: File }[]) => Promise<string[]>;
    saveHtml: (name: string, data: UserHtml) => void;
    updateHtml: (name: string, content: UserHtml) => void;
    handlePreviewGenerated: (key: string, dataUrl: string) => void;
    handleModelPreviewGenerated: (key: string, dataUrl: string) => void;
}
export type LibraryContextValue = LibraryState & LibraryActions;

// Device Context
export interface DeviceState {
    midiInputs: any[];
    selectedMidiInputId: string;
    projectionWindow: Window | null;
    audioState: string;
    audioDataRef: React.MutableRefObject<{ low: number; mid: number; high: number; overall: number; }>;
}
export interface DeviceActions {
    setMidiInputs: (inputs: any[]) => void;
    setSelectedMidiInputId: (id: string) => void;
    toggleAudio: () => void;
    handleProjectionToggle: (canvasElement: HTMLCanvasElement | null, wrapperElement: HTMLDivElement | null, htmlOverlayElement: HTMLDivElement | null) => void;
}
export type DeviceContextValue = DeviceState & DeviceActions;

// Session Context
export interface SessionState {}
export interface SessionActions {
    handleSaveSession: () => Promise<void>;
    handleLoadSession: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export type SessionContextValue = SessionState & SessionActions;