


import { getFragmentShaderSrc } from '../gl/glUtils';
import { VERTEX_SHADER_SRC } from '../gl/shaders';

const createAndCompileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }
    const shaderType = type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment';
    console.error(`Preview Gen: Error compiling ${shaderType} shader`, gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
};

const createProgram = (gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null => {
    const vertexShader = createAndCompileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fragmentShader = createAndCompileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vertexShader || !fragmentShader) {
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        return null;
    }

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Preview Gen: Error linking program', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null; // Return null instead of the program variable
    }
    
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
};

export const generateShaderPreviews = (
    shaders: Record<string, string>,
    onPreviewGenerated: (key: string, dataUrl: string) => void,
    // FIX: Added optional onProgress callback to support progress reporting.
    onProgress?: (key: string, current: number, total: number) => void
): Promise<void> => {
    return new Promise((resolve) => {
        const shaderQueue = Object.entries(shaders);
        const totalShaders = shaderQueue.length;

        if (shaderQueue.length === 0) {
            resolve();
            return;
        }

        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 128;
        previewCanvas.height = 128;
        
        const gl = previewCanvas.getContext('webgl', { 
            antialias: false, 
            preserveDrawingBuffer: true,
            powerPreference: 'low-power' 
        });
        
        if (!gl) {
            console.error("Preview Gen: WebGL not supported");
            resolve();
            return;
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const processQueue = () => {
            if (shaderQueue.length === 0) {
                if (gl.isBuffer(positionBuffer)) gl.deleteBuffer(positionBuffer);
                const ext = gl.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
                resolve();
                return;
            }

            const [key, shaderCode] = shaderQueue.shift()!;
            const currentShaderNum = totalShaders - shaderQueue.length;
            if (onProgress) {
                onProgress(key, currentShaderNum, totalShaders);
            }
            
            const fsSrc = getFragmentShaderSrc(shaderCode);
            const program = createProgram(gl, VERTEX_SHADER_SRC, fsSrc);
            
            if (program) {
                gl.useProgram(program);

                const a_position = gl.getAttribLocation(program, "a_position");
                gl.enableVertexAttribArray(a_position);
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

                gl.uniform3f(gl.getUniformLocation(program, "iResolution"), 128, 128, 1);
                gl.uniform1f(gl.getUniformLocation(program, "iTime_app"), 5.0);
                gl.uniform4f(gl.getUniformLocation(program, "iAudio"), 0.5, 0.5, 0.5, 0.5);
                gl.uniform1f(gl.getUniformLocation(program, "u_quality"), 0.5);
                gl.uniform1f(gl.getUniformLocation(program, "u_speed"), 1.0);
                gl.uniform1f(gl.getUniformLocation(program, "u_zoom"), 1.0);
                
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                
                try {
                    const dataUrl = previewCanvas.toDataURL('image/webp', 0.8);
                    onPreviewGenerated(key, dataUrl);
                } catch (e) {
                    console.error(`Preview Gen: Error creating data URL for ${key}`, e);
                }

                gl.deleteProgram(program);
            }

            setTimeout(processQueue, 16);
        };

        processQueue();
    });
};