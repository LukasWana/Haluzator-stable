import React, { useRef, useEffect, useCallback } from 'react';
import { getFragmentShaderSrc } from '../gl/glUtils';
import { VERTEX_SHADER_SRC, TEXTURE_VERTEX_SHADER_SRC, TEXTURE_FRAGMENT_SHADER_SRC, MODEL_VERTEX_SHADER_SRC, MODEL_FRAGMENT_SHADER_SRC, ERROR_SHADER_SRC, COMPOSITING_SHADER_SRC, POST_PROCESSING_SHADER_SRC, TRANSITION_SHADER_SRC, BLACK_SHADER_SRC, PARTICLE_OVERLAY_SHADER_SRC, WIREFRAME_VERTEX_SHADER_SRC, WIREFRAME_FRAGMENT_SHADER_SRC } from '../gl/shaders';
import type { ProgramInfo, FBOInfo, UserImages, UserVideos, UserModels, ControlSettings, ModelSettings } from '../types';

// --- Matrix Helper Functions ---
function createIdentityMatrix() {
    return [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
}
function multiplyMatrices(a: number[], b: number[]) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3], b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7], b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11], b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];
    return [
        b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30, b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31, b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32, b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
        b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30, b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31, b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32, b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
        b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30, b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31, b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32, b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
        b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30, b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31, b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32, b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
}
function createPerspectiveMatrix(fieldOfView: number, aspect: number, zNear: number, zFar: number) {
    const f = 1.0 / Math.tan(fieldOfView / 2);
    const rangeInv = 1.0 / (zNear - zFar);
    return [ f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (zNear + zFar) * rangeInv, -1, 0, 0, zNear * zFar * rangeInv * 2, 0 ];
}
function createOrthographicMatrix(left: number, right: number, bottom: number, top: number, near: number, far: number) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    const fn = 1 / (far - near);
    return [
        2 * rl, 0, 0, 0,
        0, 2 * tb, 0, 0,
        0, 0, -2 * fn, 0,
        -(right + left) * rl, -(top + bottom) * tb, -(far + near) * fn, 1
    ];
}
function createLookAtMatrix(cameraPosition: number[], target: number[], up: number[]) {
    // FIX: Changed z0, z1, z2 to `let` as they are modified for normalization.
    let z0 = cameraPosition[0] - target[0], z1 = cameraPosition[1] - target[1], z2 = cameraPosition[2] - target[2];
    let len = z0 * z0 + z1 * z1 + z2 * z2; if (len > 0) { len = 1 / Math.sqrt(len); z0 *= len; z1 *= len; z2 *= len; }
    let x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2; if (len > 0) { len = 1 / Math.sqrt(len); x0 *= len; x1 *= len; x2 *= len; }
    let y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    len = y0 * y0 + y1 * y1 + y2 * y2; if (len > 0) { len = 1 / Math.sqrt(len); y0 *= len; y1 *= len; y2 *= len; }
    return [ x0, y0, z0, 0, x1, y1, z1, 0, x2, y2, z2, 0, -(x0 * cameraPosition[0] + x1 * cameraPosition[1] + x2 * cameraPosition[2]), -(y0 * cameraPosition[0] + y1 * cameraPosition[1] + y2 * cameraPosition[2]), -(z0 * cameraPosition[0] + z1 * cameraPosition[1] + z2 * cameraPosition[2]), 1 ];
}
function createXRotationMatrix(angle: number) { const c = Math.cos(angle), s = Math.sin(angle); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
function createYRotationMatrix(angle: number) { const c = Math.cos(angle), s = Math.sin(angle); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
function createZRotationMatrix(angle: number) { const c = Math.cos(angle), s = Math.sin(angle); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
function createScaleMatrix(sx: number, sy: number, sz: number) { return [ sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1 ]; }
function createTranslationMatrix(tx: number, ty: number, tz: number) { return [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1 ]; }


export function useWebGL(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  props: {
    fromShaderKey: string; toShaderKey: string; isTransitioning: boolean; transitionProgress: number;
    isPlaying: boolean;
    fromMediaKey: string | null; toMediaKey: string | null;
    fromModelSettings: ModelSettings | null;
    toModelSettings: ModelSettings | null;
    projectionWindow: Window | null;
    isSessionLoading: boolean;
  } & ControlSettings,
  shaders: Record<string, string>,
  userImages: UserImages,
  userVideos: UserVideos,
  userModels: UserModels,
  audioDataRef: React.MutableRefObject<{ low: number; mid: number; high: number; overall: number; }>,
  onShaderError: (key: string, message: string | null) => void,
  onFpsUpdate: (fps: number, scale: number) => void
) {
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const renderStateRef = useRef({
      programs: {} as Record<string, ProgramInfo>,
      fbos: {} as Record<string, FBOInfo>,
      imageTextures: {} as Record<string, WebGLTexture | null>,
      videoTextures: {} as Record<string, WebGLTexture | null>,
      modelBuffers: {} as Record<string, { position: WebGLBuffer, normal: WebGLBuffer, wireframe?: WebGLBuffer, count: number, wireframeCount?: number }>,
      mediaDimensions: {} as Record<string, { width: number; height: number }>,
      time: 0,
      lastFrameTime: Date.now(),
      positionBuffer: null as WebGLBuffer | null,
      fps: {
        lastTime: Date.now(),
        history: [] as number[],
      },
  });

  const propsRef = useRef({ ...props, shaders, userImages, userVideos, userModels, audioDataRef, onShaderError, onFpsUpdate });
  useEffect(() => {
    propsRef.current = { ...props, shaders, userImages, userVideos, userModels, audioDataRef, onShaderError, onFpsUpdate };
  });

  const getProgram = useCallback((gl: WebGLRenderingContext, key: string, vsSrc: string, fsSrc: string): ProgramInfo | null => {
    const cached = renderStateRef.current.programs[key];
    if (cached) {
      propsRef.current.onShaderError(key, null);
      return cached;
    }

    const createAndCompileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      
      const log = gl.getShaderInfoLog(shader);
      propsRef.current.onShaderError(key, `Error compiling shader:\n${log}`);
      gl.deleteShader(shader);
      return null;
    };

    const vertexShader = createAndCompileShader(gl.VERTEX_SHADER, vsSrc);
    const fragmentShader = createAndCompileShader(gl.FRAGMENT_SHADER, fsSrc);
    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      propsRef.current.onShaderError(key, `Error linking program:\n${gl.getProgramInfoLog(program)}`);
      gl.deleteProgram(program);
      return null;
    }

    const programInfo: ProgramInfo = {
        program,
        uniforms: {
            iResolution: gl.getUniformLocation(program, "iResolution"),
            iTime: gl.getUniformLocation(program, "iTime_app"),
            iMouse: gl.getUniformLocation(program, "iMouse"),
            iAudio: gl.getUniformLocation(program, "iAudio"),
            iChannel0: gl.getUniformLocation(program, "iChannel0"),
            iChannel0Resolution: gl.getUniformLocation(program, "iChannel0Resolution"),
            u_fromTexture: gl.getUniformLocation(program, "u_fromTexture"),
            u_toTexture: gl.getUniformLocation(program, "u_toTexture"),
            u_progress: gl.getUniformLocation(program, "u_progress"),
            u_blurAmount: gl.getUniformLocation(program, "u_blurAmount"),
            u_glowAmount: gl.getUniformLocation(program, "u_glowAmount"),
            u_chromaAmount: gl.getUniformLocation(program, "u_chromaAmount"),
            u_hueShift: gl.getUniformLocation(program, "u_hueShift"),
            u_mandalaSegments: gl.getUniformLocation(program, "u_mandalaSegments"),
            u_levelShadows: gl.getUniformLocation(program, "u_levelShadows"),
            u_levelMidtones: gl.getUniformLocation(program, "u_levelMidtones"),
            u_levelHighlights: gl.getUniformLocation(program, "u_levelHighlights"),
            u_saturation: gl.getUniformLocation(program, "u_saturation"),
            u_speed: gl.getUniformLocation(program, "u_speed"),
            u_zoom: gl.getUniformLocation(program, "u_zoom"),
            u_baseTexture: gl.getUniformLocation(program, "u_baseTexture"),
            u_overlayTexture: gl.getUniformLocation(program, "u_overlayTexture"),
            u_overlayTextureResolution: gl.getUniformLocation(program, "u_overlayTextureResolution"),
            u_hasOverlay: gl.getUniformLocation(program, "u_hasOverlay"),
            u_overlayOpacity: gl.getUniformLocation(program, "u_overlayOpacity"),
            u_overlayZoom: gl.getUniformLocation(program, "u_overlayZoom"),
            u_particleAmount: gl.getUniformLocation(program, "u_particleAmount"),
            u_vertexNoiseAmount: gl.getUniformLocation(program, "u_vertexNoiseAmount"),
            u_modelMatrix: gl.getUniformLocation(program, "u_modelMatrix"),
            u_viewMatrix: gl.getUniformLocation(program, "u_viewMatrix"),
            u_projectionMatrix: gl.getUniformLocation(program, "u_projectionMatrix"),
            u_lightDirection: gl.getUniformLocation(program, "u_lightDirection"),
            u_cameraPosition: gl.getUniformLocation(program, "u_cameraPosition"),
            u_color: gl.getUniformLocation(program, "u_color"),
            u_alpha: gl.getUniformLocation(program, "u_alpha"),
            u_texture: gl.getUniformLocation(program, "u_texture"),
            u_shaderTexture: gl.getUniformLocation(program, "u_shaderTexture"),
            u_useShaderTexture: gl.getUniformLocation(program, "u_useShaderTexture"),
        },
        attribs: { 
            a_position: gl.getAttribLocation(program, "a_position"),
            a_normal: gl.getAttribLocation(program, "a_normal"),
        }
    };
    renderStateRef.current.programs[key] = programInfo;
    propsRef.current.onShaderError(key, null);
    return programInfo;
  }, []);

  const renderScene = useCallback((shaderKey: string, mediaKey: string | null, targetFbo: FBOInfo, time: number, modelSettings: ModelSettings | null) => {
    const gl = glRef.current;
    if (!gl) return;
    const { shaders, userImages, userVideos, userModels, audioDataRef, audioInfluence, speed, zoom, overlayOpacity, isTransitioning, transitionProgress } = propsRef.current;
    
    // --- 1. RENDER BASE SHADER ---
    const baseFbo = renderStateRef.current.fbos.baseFbo;
    if (!baseFbo) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, baseFbo.framebuffer);
    gl.viewport(0, 0, baseFbo.width, baseFbo.height);
    
    const shaderCode = shaders[shaderKey] || BLACK_SHADER_SRC;
    const baseProgram = getProgram(gl, shaderKey, VERTEX_SHADER_SRC, getFragmentShaderSrc(shaderCode)) || getProgram(gl, '__ERROR__', VERTEX_SHADER_SRC, getFragmentShaderSrc(ERROR_SHADER_SRC));
    if (!baseProgram) return;

    gl.useProgram(baseProgram.program);
    gl.enableVertexAttribArray(baseProgram.attribs.a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderStateRef.current.positionBuffer);
    gl.vertexAttribPointer(baseProgram.attribs.a_position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform3f(baseProgram.uniforms.iResolution, baseFbo.width, baseFbo.height, 1);
    gl.uniform1f(baseProgram.uniforms.iTime, time);
    gl.uniform4f(baseProgram.uniforms.iAudio, audioDataRef.current.low, audioDataRef.current.mid, audioDataRef.current.high, audioDataRef.current.overall * (audioInfluence / 100.0));
    gl.uniform1f(baseProgram.uniforms.u_speed, speed / 50.0);
    if (baseProgram.uniforms.u_zoom) {
        const min_u_zoom = 0.002, max_u_zoom = 500.0, t = zoom / 100.0;
        gl.uniform1f(baseProgram.uniforms.u_zoom, Math.exp(Math.log(max_u_zoom) * (1.0 - t) + Math.log(min_u_zoom) * t));
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(baseProgram.attribs.a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    // --- 2. RENDER MEDIA OVERLAY (IF ANY) ---
    let overlayTexture: WebGLTexture | null = null;
    let overlayDims: { width: number, height: number } | null = null;
    const isModel = mediaKey && userModels[mediaKey];

    if (isModel && modelSettings) {
        const { modelAnimationType, modelAnimationSpeed, modelTransitionType, modelZoom, modelRotationX, modelRotationY, modelRotationZ, modelWireframe, modelUseShaderTexture, cameraFlyAround, vertexNoiseAmount, cameraType } = modelSettings;
        // --- 2a. RENDER 3D MODEL TO ITS OWN FBO ---
        const modelFbo = renderStateRef.current.fbos.modelFbo;
        if (modelFbo) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, modelFbo.framebuffer);
            gl.viewport(0, 0, modelFbo.width, modelFbo.height);
            gl.clearColor(0, 0, 0, 0); // Transparent background is crucial
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            const model = userModels[mediaKey!];
            if (model) {
                 // --- TRANSITION LOGIC ---
                let transitionAlpha = 1.0;
                let transitionMatrix = createIdentityMatrix();
                if (isTransitioning) {
                    const { toMediaKey, fromMediaKey } = propsRef.current;
                    let progress = 0;
                    let isApplying = false;

                    if (mediaKey === toMediaKey && mediaKey !== fromMediaKey) { // In
                        progress = transitionProgress;
                        isApplying = true;
                    } else if (mediaKey === fromMediaKey && mediaKey !== toMediaKey) { // Out
                        progress = 1.0 - transitionProgress;
                        isApplying = true;
                    }

                    if (isApplying) {
                        switch (modelTransitionType) {
                            case 'fade':
                                transitionAlpha = progress;
                                break;
                            case 'grow':
                            case 'shrink': {
                                const scale = progress;
                                transitionMatrix = createScaleMatrix(scale, scale, scale);
                                break;
                            }
                            case 'drop-in': {
                                const ty = (1.0 - progress) * 3.0;
                                transitionMatrix = createTranslationMatrix(0, ty, 0);
                                break;
                            }
                            case 'spiral-out': {
                                const scale = progress;
                                const rotation = (1.0 - progress) * Math.PI * 4.0;
                                const scaleMatrix = createScaleMatrix(scale, scale, scale);
                                const rotationMatrix = createYRotationMatrix(rotation);
                                transitionMatrix = multiplyMatrices(scaleMatrix, rotationMatrix);
                                break;
                            }
                            default:
                                transitionAlpha = progress;
                                break;
                        }
                    }
                }

                // --- Camera Logic ---
                const cameraDist = 3.5;
                const cameraPosition = [0, 0, cameraDist];
                const viewMatrix = createLookAtMatrix(cameraPosition, [0, 0, 0], [0, 1, 0]);

                let projectionMatrix;
                const aspect = modelFbo.width / modelFbo.height;
                const zNear = 0.1, zFar = 100.0;

                switch (cameraType) {
                    case 'orthographic': {
                        const orthoHeight = 4.0;
                        const top = orthoHeight * 0.5;
                        const bottom = -orthoHeight * 0.5;
                        const left = bottom * aspect;
                        const right = top * aspect;
                        projectionMatrix = createOrthographicMatrix(left, right, bottom, top, zNear, zFar);
                        break;
                    }
                    case 'exaggerated': {
                        const fieldOfView = 90 * Math.PI / 180;
                        projectionMatrix = createPerspectiveMatrix(fieldOfView, aspect, zNear, zFar);
                        break;
                    }
                    case 'fisheye': {
                        const fieldOfView = 140 * Math.PI / 180; // Very wide FOV to simulate fisheye
                        projectionMatrix = createPerspectiveMatrix(fieldOfView, aspect, zNear, zFar);
                        break;
                    }
                    case 'perspective':
                    default: {
                        const fieldOfView = 45 * Math.PI / 180;
                        projectionMatrix = createPerspectiveMatrix(fieldOfView, aspect, zNear, zFar);
                        break;
                    }
                }
                
                let modelMatrix = createIdentityMatrix();
                if (model.center && typeof model.scale === 'number') {
                     modelMatrix = multiplyMatrices(modelMatrix, createTranslationMatrix(-model.center.x, -model.center.y, -model.center.z));
                     modelMatrix = multiplyMatrices(modelMatrix, createScaleMatrix(model.scale, model.scale, model.scale));
                }
                
                const zoomAmount = 0.1 + (modelZoom / 100.0) * 4.0;
                modelMatrix = multiplyMatrices(modelMatrix, createScaleMatrix(zoomAmount, zoomAmount, zoomAmount));
                
                // Static Rotation
                let staticRotationMatrix = createIdentityMatrix();
                staticRotationMatrix = multiplyMatrices(staticRotationMatrix, createXRotationMatrix(modelRotationX * Math.PI / 180));
                staticRotationMatrix = multiplyMatrices(staticRotationMatrix, createYRotationMatrix(modelRotationY * Math.PI / 180));
                staticRotationMatrix = multiplyMatrices(staticRotationMatrix, createZRotationMatrix(modelRotationZ * Math.PI / 180));
                modelMatrix = multiplyMatrices(staticRotationMatrix, modelMatrix);

                // --- Animation Logic ---
                let animationMatrix = createIdentityMatrix();
                const animationSpeedFactor = (modelAnimationSpeed ?? 100) / 100.0;
                const modelRotationAnim = time * (speed / 50.0) * 1.5 * animationSpeedFactor;

                if (cameraFlyAround) {
                    animationMatrix = multiplyMatrices(animationMatrix, createYRotationMatrix(time * 0.5));
                }

                switch (modelAnimationType) {
                    case 'rotate-x':
                        animationMatrix = multiplyMatrices(animationMatrix, createXRotationMatrix(modelRotationAnim));
                        break;
                    case 'rotate-y':
                        animationMatrix = multiplyMatrices(animationMatrix, createYRotationMatrix(modelRotationAnim));
                        break;
                    case 'rotate-z':
                        animationMatrix = multiplyMatrices(animationMatrix, createZRotationMatrix(modelRotationAnim));
                        break;
                    case 'tumble': {
                        let tumbleMatrix = createYRotationMatrix(modelRotationAnim);
                        tumbleMatrix = multiplyMatrices(tumbleMatrix, createXRotationMatrix(modelRotationAnim * 0.8));
                        tumbleMatrix = multiplyMatrices(tumbleMatrix, createZRotationMatrix(modelRotationAnim * 0.3));
                        animationMatrix = multiplyMatrices(animationMatrix, tumbleMatrix);
                        break;
                    }
                    case 'pulse': {
                        const pulseScale = 1.0 + Math.sin(time * 5.0 * animationSpeedFactor + audioDataRef.current.low * 5.0) * 0.1;
                        animationMatrix = multiplyMatrices(animationMatrix, createScaleMatrix(pulseScale, pulseScale, pulseScale));
                        break;
                    }
                    case 'wobble': {
                        const wobbleX = Math.sin(time * 1.1 * animationSpeedFactor + 1.0) * 0.1;
                        const wobbleY = Math.sin(time * 1.3 * animationSpeedFactor + 2.0) * 0.1;
                        const wobbleZ = Math.sin(time * 1.5 * animationSpeedFactor + 3.0) * 0.1;
                        let rotationMatrix = createXRotationMatrix(Math.sin(time * 0.8 * animationSpeedFactor) * 0.05);
                        rotationMatrix = multiplyMatrices(rotationMatrix, createYRotationMatrix(Math.sin(time * 0.9 * animationSpeedFactor) * 0.05));
                        const translationMatrix = createTranslationMatrix(wobbleX, wobbleY, wobbleZ);
                        animationMatrix = multiplyMatrices(animationMatrix, multiplyMatrices(translationMatrix, rotationMatrix));
                        break;
                    }
                    case 'audio-reactive-spin': {
                        const spinSpeed = 0.5 + audioDataRef.current.overall * 15.0;
                        const audioSpinAngle = time * spinSpeed * animationSpeedFactor;
                        animationMatrix = multiplyMatrices(animationMatrix, createYRotationMatrix(audioSpinAngle));
                        break;
                    }
                }
                modelMatrix = multiplyMatrices(animationMatrix, modelMatrix);
                modelMatrix = multiplyMatrices(transitionMatrix, modelMatrix);

                if (modelWireframe) {
                    const wireframeProgram = getProgram(gl, '__WIREFRAME__', WIREFRAME_VERTEX_SHADER_SRC, WIREFRAME_FRAGMENT_SHADER_SRC);
                    const modelBuffers = renderStateRef.current.modelBuffers[mediaKey!];
                    if (wireframeProgram && modelBuffers?.wireframe && modelBuffers?.wireframeCount) {
                        gl.useProgram(wireframeProgram.program);
                        gl.enableVertexAttribArray(wireframeProgram.attribs.a_position);
                        gl.bindBuffer(gl.ARRAY_BUFFER, modelBuffers.wireframe);
                        gl.vertexAttribPointer(wireframeProgram.attribs.a_position, 3, gl.FLOAT, false, 0, 0);
                        gl.uniformMatrix4fv(wireframeProgram.uniforms.u_projectionMatrix, false, projectionMatrix);
                        gl.uniformMatrix4fv(wireframeProgram.uniforms.u_viewMatrix, false, viewMatrix);
                        gl.uniformMatrix4fv(wireframeProgram.uniforms.u_modelMatrix, false, modelMatrix);
                        gl.uniform1f(wireframeProgram.uniforms.u_alpha, transitionAlpha);
                        gl.drawArrays(gl.LINES, 0, modelBuffers.wireframeCount);
                        gl.disableVertexAttribArray(wireframeProgram.attribs.a_position);
                        gl.bindBuffer(gl.ARRAY_BUFFER, null);
                    }
                } else {
                    const modelProgram = getProgram(gl, '__MODEL__', MODEL_VERTEX_SHADER_SRC, MODEL_FRAGMENT_SHADER_SRC);
                    const modelBuffers = renderStateRef.current.modelBuffers[mediaKey!];
                    if (modelProgram && modelBuffers && modelProgram.attribs.a_normal !== undefined && modelProgram.attribs.a_normal !== -1) {
                        gl.useProgram(modelProgram.program);
                        gl.enableVertexAttribArray(modelProgram.attribs.a_position);
                        gl.bindBuffer(gl.ARRAY_BUFFER, modelBuffers.position);
                        gl.vertexAttribPointer(modelProgram.attribs.a_position, 3, gl.FLOAT, false, 0, 0);
                        gl.enableVertexAttribArray(modelProgram.attribs.a_normal);
                        gl.bindBuffer(gl.ARRAY_BUFFER, modelBuffers.normal);
                        gl.vertexAttribPointer(modelProgram.attribs.a_normal, 3, gl.FLOAT, false, 0, 0);
                        
                        gl.uniform1i(modelProgram.uniforms.u_useShaderTexture, modelUseShaderTexture ? 1 : 0);
                        if (modelUseShaderTexture) {
                            gl.activeTexture(gl.TEXTURE2);
                            gl.bindTexture(gl.TEXTURE_2D, baseFbo.texture);
                            gl.uniform1i(modelProgram.uniforms.u_shaderTexture, 2);
                        }
                        
                        gl.uniformMatrix4fv(modelProgram.uniforms.u_projectionMatrix, false, projectionMatrix);
                        gl.uniformMatrix4fv(modelProgram.uniforms.u_viewMatrix, false, viewMatrix);
                        gl.uniformMatrix4fv(modelProgram.uniforms.u_modelMatrix, false, modelMatrix);
                        gl.uniform3f(modelProgram.uniforms.u_lightDirection, 0.5, 0.7, 1.0);
                        gl.uniform3f(modelProgram.uniforms.u_color, 1.0, 1.0, 1.0);
                        gl.uniform3f(modelProgram.uniforms.u_cameraPosition, cameraPosition[0], cameraPosition[1], cameraPosition[2]);
                        gl.uniform1f(modelProgram.uniforms.u_alpha, transitionAlpha);
                        gl.uniform1f(modelProgram.uniforms.u_vertexNoiseAmount, vertexNoiseAmount / 100.0);
                        gl.uniform1f(modelProgram.uniforms.iTime, time);
                        
                        gl.drawArrays(gl.TRIANGLES, 0, modelBuffers.count);

                        gl.disableVertexAttribArray(modelProgram.attribs.a_position);
                        gl.disableVertexAttribArray(modelProgram.attribs.a_normal);
                        gl.bindBuffer(gl.ARRAY_BUFFER, null);
                    }
                }
            }
            gl.disable(gl.DEPTH_TEST);

            overlayTexture = modelFbo.texture;
            overlayDims = { width: modelFbo.width, height: modelFbo.height };
        }
    } else if (mediaKey) {
        // --- 2b. GET 2D MEDIA TEXTURE ---
        overlayTexture = renderStateRef.current.imageTextures[mediaKey] || renderStateRef.current.videoTextures[mediaKey];
        overlayDims = renderStateRef.current.mediaDimensions[mediaKey];
    }
    
    // --- 3. COMPOSITE FINAL SCENE TO TARGET FBO ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo.framebuffer);
    gl.viewport(0, 0, targetFbo.width, targetFbo.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const compositingProgram = getProgram(gl, '__COMPOSITING__', VERTEX_SHADER_SRC, COMPOSITING_SHADER_SRC);
    if (!compositingProgram) return;

    gl.useProgram(compositingProgram.program);
    gl.enableVertexAttribArray(compositingProgram.attribs.a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, renderStateRef.current.positionBuffer);
    gl.vertexAttribPointer(compositingProgram.attribs.a_position, 2, gl.FLOAT, false, 0, 0);
    
    gl.uniform3f(compositingProgram.uniforms.iResolution, targetFbo.width, targetFbo.height, 1);
    
    // Bind base texture (from step 1)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, baseFbo.texture);
    gl.uniform1i(compositingProgram.uniforms.u_baseTexture, 0);

    // Always tell the shader that the overlay texture is on texture unit 1.
    // This prevents it from defaulting to 0 and conflicting with the base texture.
    gl.uniform1i(compositingProgram.uniforms.u_overlayTexture, 1);

    const hasOverlay = !!overlayTexture;
    gl.uniform1i(compositingProgram.uniforms.u_hasOverlay, hasOverlay ? 1 : 0);
    
    gl.activeTexture(gl.TEXTURE1); // Activate unit 1 for the overlay texture
    if (hasOverlay) {
        gl.uniform1f(compositingProgram.uniforms.u_overlayOpacity, overlayOpacity / 100.0);
        gl.uniform1f(compositingProgram.uniforms.u_overlayZoom, 1.0);
        gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
        if (overlayDims) {
            gl.uniform2f(compositingProgram.uniforms.u_overlayTextureResolution, overlayDims.width, overlayDims.height);
        }
    } else {
        // If there's no overlay, bind null to texture unit 1 to ensure we're not using a stale texture.
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(compositingProgram.attribs.a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

  }, [getProgram]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: false });
    if (!gl) return;
    glRef.current = gl;

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    renderStateRef.current.positionBuffer = posBuffer;

    const render = () => {
        const currentActiveWindow = propsRef.current.projectionWindow || window;
        animationFrameIdRef.current = currentActiveWindow.requestAnimationFrame(render);
      
        if (propsRef.current.isSessionLoading || !glRef.current || glRef.current.isContextLost()) {
            return;
        }
        
        const gl = glRef.current;
        const now = Date.now();
        const delta = (now - renderStateRef.current.lastFrameTime) / 1000.0;
        renderStateRef.current.time += delta;
        renderStateRef.current.lastFrameTime = now;
        
        const {
            fromShaderKey, toShaderKey, fromMediaKey, toMediaKey, isTransitioning, transitionProgress,
            fromModelSettings, toModelSettings,
            projectionWindow: _p,
            isSessionLoading: _l,
            isPlaying: _ip,
            shaders: _s,
            userImages: _ui,
            userVideos: _uv,
            userModels: _um,
            audioDataRef: _a,
            onShaderError: _e,
            onFpsUpdate: _f,
            ...controls
        } = propsRef.current;
        
        const { fbos } = renderStateRef.current;
        const sceneFboA = fbos.sceneFboA;
        const sceneFboB = fbos.sceneFboB;
        if (!sceneFboA || !sceneFboB) return;
        
        // --- Scene Rendering Phase ---
        // Always render the 'to' scene, as it's the current target.
        renderScene(toShaderKey, toMediaKey, sceneFboB, renderStateRef.current.time, toModelSettings);
        // Only render the 'from' scene if a transition is active.
        if (isTransitioning) {
            renderScene(fromShaderKey, fromMediaKey, sceneFboA, renderStateRef.current.time, fromModelSettings);
        }

        // Update video textures
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        [fromMediaKey, toMediaKey].filter(Boolean).forEach(key => {
            const videoInfo = propsRef.current.userVideos[key!];
            if (videoInfo && videoInfo.element.readyState >= videoInfo.element.HAVE_METADATA) {
                const videoTexture = renderStateRef.current.videoTextures[key!];
                gl.bindTexture(gl.TEXTURE_2D, videoTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoInfo.element);
                const { videoWidth, videoHeight } = videoInfo.element;
                if (videoWidth > 0 && videoHeight > 0) {
                    renderStateRef.current.mediaDimensions[key!] = { width: videoWidth, height: videoHeight };
                }
            }
        });
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        // --- Composition Phase ---
        const postFbo = fbos.postFbo;
        if (!postFbo) return;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, postFbo.framebuffer);
        gl.viewport(0, 0, postFbo.width, postFbo.height);
        
        const transitionProgram = getProgram(gl, '__TRANSITION__', VERTEX_SHADER_SRC, TRANSITION_SHADER_SRC);
        if (transitionProgram) {
            gl.useProgram(transitionProgram.program);
            
            gl.enableVertexAttribArray(transitionProgram.attribs.a_position);
            gl.bindBuffer(gl.ARRAY_BUFFER, renderStateRef.current.positionBuffer);
            gl.vertexAttribPointer(transitionProgram.attribs.a_position, 2, gl.FLOAT, false, 0, 0);
            
            // If not transitioning, use the 'to' buffer for both 'from' and 'to' textures
            // to avoid reading from a stale 'from' buffer. This fixes the blinking.
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, isTransitioning ? sceneFboA.texture : sceneFboB.texture);
            gl.uniform1i(transitionProgram.uniforms.u_fromTexture, 0);
            
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, sceneFboB.texture);
            gl.uniform1i(transitionProgram.uniforms.u_toTexture, 1);
            
            gl.uniform1f(transitionProgram.uniforms.u_progress, isTransitioning ? transitionProgress : 1.0);
            gl.uniform3f(transitionProgram.uniforms.iResolution, postFbo.width, postFbo.height, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            gl.disableVertexAttribArray(transitionProgram.attribs.a_position);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        // --- Post-processing Phase ---
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        const postProgram = getProgram(gl, '__POST__', VERTEX_SHADER_SRC, POST_PROCESSING_SHADER_SRC);
        if(postProgram) {
            gl.useProgram(postProgram.program);

            gl.enableVertexAttribArray(postProgram.attribs.a_position);
            gl.bindBuffer(gl.ARRAY_BUFFER, renderStateRef.current.positionBuffer);
            gl.vertexAttribPointer(postProgram.attribs.a_position, 2, gl.FLOAT, false, 0, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, postFbo.texture);
            gl.uniform1i(postProgram.uniforms.iChannel0, 0);
            gl.uniform3f(postProgram.uniforms.iResolution, gl.canvas.width, gl.canvas.height, 1);
            gl.uniform1f(postProgram.uniforms.u_blurAmount, controls.blurAmount / 100.0);
            gl.uniform1f(postProgram.uniforms.u_glowAmount, controls.glowAmount / 100.0);
            gl.uniform1f(postProgram.uniforms.u_chromaAmount, controls.chromaAmount / 100.0);
            gl.uniform1f(postProgram.uniforms.u_hueShift, controls.hueShift / 100.0);
            gl.uniform1f(postProgram.uniforms.u_mandalaSegments, Math.floor(controls.mandalaSegments));
            gl.uniform1f(postProgram.uniforms.u_levelShadows, controls.levelShadows / 100.0);
            gl.uniform1f(postProgram.uniforms.u_levelMidtones, controls.levelMidtones / 100.0);
            gl.uniform1f(postProgram.uniforms.u_levelHighlights, 1.0 - (controls.levelHighlights / 100.0));
            gl.uniform1f(postProgram.uniforms.u_saturation, controls.saturation / 100.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            gl.disableVertexAttribArray(postProgram.attribs.a_position);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        // --- Particle Overlay Phase ---
        if (controls.particles > 0) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending

            const particleProgram = getProgram(gl, '__PARTICLES__', VERTEX_SHADER_SRC, PARTICLE_OVERLAY_SHADER_SRC);
            if (particleProgram) {
                gl.useProgram(particleProgram.program);
                
                gl.enableVertexAttribArray(particleProgram.attribs.a_position);
                gl.bindBuffer(gl.ARRAY_BUFFER, renderStateRef.current.positionBuffer);
                gl.vertexAttribPointer(particleProgram.attribs.a_position, 2, gl.FLOAT, false, 0, 0);

                gl.uniform3f(particleProgram.uniforms.iResolution, gl.canvas.width, gl.canvas.height, 1);
                gl.uniform1f(particleProgram.uniforms.iTime, renderStateRef.current.time);
                gl.uniform4f(particleProgram.uniforms.iAudio, _a.current.low, _a.current.mid, _a.current.high, _a.current.overall * (controls.audioInfluence / 100.0));
                gl.uniform1f(particleProgram.uniforms.u_particleAmount, controls.particles / 100.0);
                
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                gl.disableVertexAttribArray(particleProgram.attribs.a_position);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }

            gl.disable(gl.BLEND);
        }
        
        // --- FPS Calculation ---
        const fpsState = renderStateRef.current.fps;
        const currentFps = 1.0 / delta;
        fpsState.history.push(currentFps);
        if (fpsState.history.length > 30) fpsState.history.shift();
        if (now - fpsState.lastTime > 250) {
            const smoothedFps = fpsState.history.reduce((a, b) => a + b, 0) / fpsState.history.length;
            propsRef.current.onFpsUpdate(smoothedFps, 1.0);
            fpsState.lastTime = now;
        }
    };
    
    if (animationFrameIdRef.current === null) {
        const currentActiveWindow = propsRef.current.projectionWindow || window;
        animationFrameIdRef.current = currentActiveWindow.requestAnimationFrame(render);
    }

    return () => {
        if (animationFrameIdRef.current) {
            // Use the window context where the loop was started to cancel it
            const currentActiveWindow = propsRef.current.projectionWindow || window;
            currentActiveWindow.cancelAnimationFrame(animationFrameIdRef.current);
        }
        animationFrameIdRef.current = null;
    };
  }, [canvasRef, getProgram, renderScene, props.projectionWindow]);

  useEffect(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    if (!gl || !canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = Math.round(parent.clientWidth * dpr);
    const height = Math.round(parent.clientHeight * dpr);

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;

        const createFBO = (w: number, h: number, withDepth: boolean): FBOInfo => {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            let depthBuffer: WebGLRenderbuffer | null = null;
            if (withDepth) {
                depthBuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
            }
            return { framebuffer, texture, depthBuffer, width: w, height: h };
        };

        ['baseFbo', 'postFbo'].forEach(name => {
            const oldFbo = renderStateRef.current.fbos[name];
            if (oldFbo) {
                gl.deleteFramebuffer(oldFbo.framebuffer);
                gl.deleteTexture(oldFbo.texture);
            }
            renderStateRef.current.fbos[name] = createFBO(width, height, false);
        });

        ['sceneFboA', 'sceneFboB'].forEach(name => {
             const oldFbo = renderStateRef.current.fbos[name];
            if (oldFbo) {
                gl.deleteFramebuffer(oldFbo.framebuffer);
                gl.deleteTexture(oldFbo.texture);
            }
            renderStateRef.current.fbos[name] = createFBO(width, height, false);
        });

        const modelFboName = 'modelFbo';
        const oldModelFbo = renderStateRef.current.fbos[modelFboName];
        if (oldModelFbo) {
            gl.deleteFramebuffer(oldModelFbo.framebuffer);
            gl.deleteTexture(oldModelFbo.texture);
            if (oldModelFbo.depthBuffer) gl.deleteRenderbuffer(oldModelFbo.depthBuffer);
        }
        renderStateRef.current.fbos[modelFboName] = createFBO(width, height, true);
    }
  }, [props.projectionWindow, (canvasRef.current && canvasRef.current.parentElement ? canvasRef.current.parentElement.clientWidth : 0)]);
  
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    const { userImages, userVideos, userModels } = propsRef.current;
    
    Object.keys(userImages).forEach(key => {
        if (!renderStateRef.current.imageTextures[key]) {
            const img = new Image();
            img.onload = () => {
                if (!glRef.current || glRef.current.isContextLost()) return;
                const gl = glRef.current;
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); // Reset state
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                renderStateRef.current.imageTextures[key] = texture;
                renderStateRef.current.mediaDimensions[key] = { width: img.width, height: img.height };
            };
            img.src = userImages[key];
        }
    });
    
    Object.keys(userVideos).forEach(key => {
        if (!renderStateRef.current.videoTextures[key]) {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            renderStateRef.current.videoTextures[key] = texture;
        }
    });

    Object.keys(userModels).forEach(key => {
        if (!renderStateRef.current.modelBuffers[key]) {
            const model = userModels[key];
            if (model && model.geometry) {
                const positionBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, model.geometry.attributes.position.array, gl.STATIC_DRAW);

                const normalBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, model.geometry.attributes.normal.array, gl.STATIC_DRAW);

                let wireframeBuffer: WebGLBuffer | undefined = undefined;
                let wireframeCount: number | undefined = undefined;

                if (model.wireframeGeometry) {
                    wireframeBuffer = gl.createBuffer()!;
                    gl.bindBuffer(gl.ARRAY_BUFFER, wireframeBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, model.wireframeGeometry.attributes.position.array, gl.STATIC_DRAW);
                    wireframeCount = model.wireframeGeometry.attributes.position.count;
                }

                renderStateRef.current.modelBuffers[key] = {
                    position: positionBuffer!,
                    normal: normalBuffer!,
                    wireframe: wireframeBuffer,
                    count: model.geometry.attributes.position.count,
                    wireframeCount: wireframeCount,
                };
            }
        }
    });

  }, [userImages, userVideos, userModels]);
}