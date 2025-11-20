import React from 'react';
import { UIProvider } from './UIContext';
import { LibraryProvider } from './LibraryContext';
import { DeviceProvider } from './DeviceContext';
import { SessionProvider } from './SessionContext';
import { SequencerAndPlaybackProvider } from './SequencerAndPlaybackProvider';
import { ToastProvider } from '../components/Toast';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ToastProvider>
            <UIProvider>
                <LibraryProvider>
                    <DeviceProvider>
                        <SequencerAndPlaybackProvider>
                            <SessionProvider>
                                {children}
                            </SessionProvider>
                        </SequencerAndPlaybackProvider>
                    </DeviceProvider>
                </LibraryProvider>
            </UIProvider>
        </ToastProvider>
    );
};
