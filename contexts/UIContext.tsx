import React, { createContext, useState, useCallback, useMemo, useEffect, useContext } from 'react';
import type { UIContextValue } from '../types';

export const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAddShaderModalOpen, setIsAddShaderModalOpen] = useState(false);
    const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);
    const [isAddHtmlModalOpen, setIsAddHtmlModalOpen] = useState(false);
    const [isEditHtmlModalOpen, setIsEditHtmlModalOpen] = useState(false);
    const [isModelSettingsModalOpen, setIsModelSettingsModalOpen] = useState(false);
    const [isHtmlSettingsModalOpen, setIsHtmlSettingsModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ key: string; type: 'media' | 'shader' } | null>(null);
    const [isProjectingTransition, setIsProjectingTransition] = useState(false);
    const [shaderErrors, setShaderErrors] = useState<Record<string, string | null>>({});
    const [fpsDisplay, setFpsDisplay] = useState('000 FPS');
    const [selectedItem, setSelectedItem] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [sessionLoadingDetails, setSessionLoadingDetails] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [initialFilesForModal, setInitialFilesForModal] = useState<File[] | null>(null);
    const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isSequencerVisible, setIsSequencerVisible] = useState(true);


    const handleShaderError = useCallback((key: string, message: string | null) => {
        setShaderErrors(prev => ({ ...prev, [key]: message }));
    }, []);

    const handleFpsUpdate = useCallback((fps: number, scale: number) => {
        // scale is no longer used
        setFpsDisplay(`${Math.round(fps).toString().padStart(3, '0')} FPS`);
    }, []);
    
    const handleFullscreenToggle = useCallback((canvasRef: React.RefObject<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const element = canvasRef.current.parentElement as HTMLElement;
        if (document.fullscreenElement) {
            document.exitFullscreen();
            setIsFullscreen(false);
        } else {
            element.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }
    }, []);
    
    useEffect(() => {
        const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const value = useMemo(() => ({
        isAddShaderModalOpen,
        isAddMediaModalOpen,
        isAddHtmlModalOpen,
        isEditHtmlModalOpen,
        isModelSettingsModalOpen,
        isHtmlSettingsModalOpen,
        isHelpModalOpen,
        isConfirmDeleteModalOpen,
        itemToDelete,
        isProjectingTransition,
        shaderErrors,
        fpsDisplay,
        selectedItem,
        isFullscreen,
        isSessionLoading,
        sessionLoadingDetails,
        isDraggingOver,
        initialFilesForModal,
        isRightPanelVisible,
        isControlsVisible,
        isSequencerVisible,
        setIsAddShaderModalOpen,
        setIsAddMediaModalOpen,
        setIsAddHtmlModalOpen,
        setIsEditHtmlModalOpen,
        setIsModelSettingsModalOpen,
        setIsHtmlSettingsModalOpen,
        setIsHelpModalOpen,
        setIsConfirmDeleteModalOpen,
        setItemToDelete,
        setIsProjectingTransition,
        handleShaderError,
        handleFpsUpdate,
        setSelectedItem,
        setIsFullscreen,
        handleFullscreenToggle,
        setIsSessionLoading,
        setSessionLoadingDetails,
        setIsDraggingOver,
        setInitialFilesForModal,
        setIsRightPanelVisible,
        setIsControlsVisible,
        setIsSequencerVisible,
    }), [
        isAddShaderModalOpen, isAddMediaModalOpen, isAddHtmlModalOpen, isEditHtmlModalOpen, isModelSettingsModalOpen, isHtmlSettingsModalOpen, isHelpModalOpen,
        isConfirmDeleteModalOpen, itemToDelete,
        isProjectingTransition, shaderErrors, fpsDisplay, selectedItem, isFullscreen,
        isSessionLoading, sessionLoadingDetails, isDraggingOver, initialFilesForModal,
        isRightPanelVisible, isControlsVisible, isSequencerVisible,
        handleShaderError, handleFpsUpdate, handleFullscreenToggle
    ]);

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};