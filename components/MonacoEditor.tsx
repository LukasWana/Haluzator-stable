import React, { useRef, useEffect, useState } from 'react';

type Monaco = typeof import('monaco-editor');

interface MonacoEditorProps {
    language: string;
    value: string;
    onChange: (value: string) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ language, value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const [isMonacoReady, setIsMonacoReady] = useState(false);

    useEffect(() => {
        // Check if monaco is already loaded
        if ((window as any).monaco) {
            monacoRef.current = (window as any).monaco;
            setIsMonacoReady(true);
            return;
        }

        // If not, use the loader
        if ((window as any).require) {
            (window as any).require(['vs/editor/editor.main'], (monaco: Monaco) => {
                monacoRef.current = monaco;
                setIsMonacoReady(true);
            });
        }

        return () => {
            editorInstanceRef.current?.dispose();
            editorInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (isMonacoReady && editorRef.current && !editorInstanceRef.current && monacoRef.current) {
            const editor = monacoRef.current.editor.create(editorRef.current, {
                value: value,
                language: language,
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
            });

            editor.onDidChangeModelContent(() => {
                const currentValue = editor.getValue();
                if (currentValue !== value) {
                    onChange(currentValue);
                }
            });

            editorInstanceRef.current = editor;
        }
    }, [isMonacoReady]);

    useEffect(() => {
        const editor = editorInstanceRef.current;
        if (editor && monacoRef.current) {
            monacoRef.current.editor.setModelLanguage(editor.getModel()!, language);
        }
    }, [language]);

    useEffect(() => {
        const editor = editorInstanceRef.current;
        if (editor && editor.getValue() !== value) {
            editor.setValue(value);
        }
    }, [value]);

    return <div ref={editorRef} style={{ height: '100%', width: '100%', border: '1px solid var(--border-color)', borderRadius: '0' }} />;
};
