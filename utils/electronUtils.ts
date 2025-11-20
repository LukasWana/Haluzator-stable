/**
 * Utilities for Electron environment detection and file paths
 */

declare global {
    interface Window {
        electronAPI?: {
            showOpenDialog: (options: any) => Promise<any>;
            showSaveDialog: (options: any) => Promise<any>;
            readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
            writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
            platform: string;
            versions: NodeJS.ProcessVersions;
        };
    }
}

export const isElectron = (): boolean => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export const getResourcePath = (relativePath: string): string => {
    if (isElectron()) {
        // In Electron, use the app's resource path
        // The media folder is copied to extraResources during build
        return `./${relativePath}`;
    }
    // In web, use relative path
    return relativePath;
};

export const getMediaPath = (filename: string): string => {
    return getResourcePath(`media/${filename}`);
};

