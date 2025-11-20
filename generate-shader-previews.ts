import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import gl from 'gl';
import sharp from 'sharp';
import { SHADERS } from './shaders/index';
import { getFragmentShaderSrc } from './gl/glUtils';
import { VERTEX_SHADER_SRC } from './gl/shaders';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PREVIEW_SIZE = 128;
const OUTPUT_DIR = join(__dirname, 'public', 'assets', 'shaders-previews');

// Create output directory if it doesn't exist
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const createAndCompileShader = (glContext: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = glContext.createShader(type);
  if (!shader) return null;
  glContext.shaderSource(shader, source);
  glContext.compileShader(shader);
  if (glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
    return shader;
  }
  const shaderType = type === glContext.VERTEX_SHADER ? 'Vertex' : 'Fragment';
  console.error(`Error compiling ${shaderType} shader:`, glContext.getShaderInfoLog(shader));
  glContext.deleteShader(shader);
  return null;
};

const createProgram = (glContext: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null => {
  const vertexShader = createAndCompileShader(glContext, glContext.VERTEX_SHADER, vsSrc);
  const fragmentShader = createAndCompileShader(glContext, glContext.FRAGMENT_SHADER, fsSrc);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) glContext.deleteShader(vertexShader);
    if (fragmentShader) glContext.deleteShader(fragmentShader);
    return null;
  }

  const program = glContext.createProgram();
  if (!program) return null;

  glContext.attachShader(program, vertexShader);
  glContext.attachShader(program, fragmentShader);
  glContext.linkProgram(program);

  if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
    console.error('Error linking program:', glContext.getProgramInfoLog(program));
    glContext.deleteProgram(program);
    return null;
  }

  glContext.deleteShader(vertexShader);
  glContext.deleteShader(fragmentShader);

  return program;
};

const generatePreview = (glContext: WebGLRenderingContext, shaderCode: string, shaderName: string): Uint8Array | null => {
  try {
    const fsSrc = getFragmentShaderSrc(shaderCode);
    const program = createProgram(glContext, VERTEX_SHADER_SRC, fsSrc);

    if (!program) {
      console.warn(`Failed to create program for ${shaderName}`);
      return null;
    }

    glContext.useProgram(program);

    const a_position = glContext.getAttribLocation(program, "a_position");
    glContext.enableVertexAttribArray(a_position);

    const positionBuffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, positionBuffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), glContext.STATIC_DRAW);
    glContext.vertexAttribPointer(a_position, 2, glContext.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLoc = glContext.getUniformLocation(program, "iResolution");
    const timeLoc = glContext.getUniformLocation(program, "iTime_app");
    const audioLoc = glContext.getUniformLocation(program, "iAudio");
    const qualityLoc = glContext.getUniformLocation(program, "u_quality");
    const speedLoc = glContext.getUniformLocation(program, "u_speed");
    const zoomLoc = glContext.getUniformLocation(program, "u_zoom");

    if (resolutionLoc !== null) glContext.uniform3f(resolutionLoc, PREVIEW_SIZE, PREVIEW_SIZE, 1);
    if (timeLoc !== null) glContext.uniform1f(timeLoc, 5.0);
    if (audioLoc !== null) glContext.uniform4f(audioLoc, 0.5, 0.5, 0.5, 0.5);
    if (qualityLoc !== null) glContext.uniform1f(qualityLoc, 0.5);
    if (speedLoc !== null) glContext.uniform1f(speedLoc, 1.0);
    if (zoomLoc !== null) glContext.uniform1f(zoomLoc, 1.0);

    glContext.drawArrays(glContext.TRIANGLES, 0, 6);

    // Read pixels
    const pixels = new Uint8Array(PREVIEW_SIZE * PREVIEW_SIZE * 4);
    glContext.readPixels(0, 0, PREVIEW_SIZE, PREVIEW_SIZE, glContext.RGBA, glContext.UNSIGNED_BYTE, pixels);

    // Flip vertically (WebGL has origin at bottom-left, PNG has at top-left)
    const flippedPixels = new Uint8Array(PREVIEW_SIZE * PREVIEW_SIZE * 4);
    for (let y = 0; y < PREVIEW_SIZE; y++) {
      const srcRow = (PREVIEW_SIZE - 1 - y) * PREVIEW_SIZE * 4;
      const dstRow = y * PREVIEW_SIZE * 4;
      flippedPixels.set(pixels.subarray(srcRow, srcRow + PREVIEW_SIZE * 4), dstRow);
    }

    glContext.deleteProgram(program);
    glContext.deleteBuffer(positionBuffer);

    return flippedPixels;
  } catch (error: any) {
    console.error(`Error generating preview for ${shaderName}:`, error.message);
    return null;
  }
};

// Create WebGL context
const glContext = gl(PREVIEW_SIZE, PREVIEW_SIZE, {
  preserveDrawingBuffer: true,
}) as unknown as WebGLRenderingContext;

const SHADERS_SOURCES = SHADERS.sources;
const shaderEntries = Object.entries(SHADERS_SOURCES);
const total = shaderEntries.length;
let processed = 0;
let success = 0;
let failed = 0;

console.log(`Generating ${total} shader previews...`);

for (const [shaderName, shaderCode] of shaderEntries) {
  processed++;
  const pixels = generatePreview(glContext, shaderCode, shaderName);

  if (pixels) {
    try {
      // Convert to PNG using sharp
      const pngBuffer = await sharp(pixels, {
        raw: {
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          channels: 4,
        },
      })
        .png()
        .toBuffer();

      const outputPath = join(OUTPUT_DIR, `${shaderName}.png`);
      writeFileSync(outputPath, pngBuffer);
      success++;
      console.log(`[${processed}/${total}] ✓ ${shaderName}`);
    } catch (error: any) {
      console.error(`[${processed}/${total}] ✗ ${shaderName} - Failed to save:`, error.message);
      failed++;
    }
  } else {
    console.error(`[${processed}/${total}] ✗ ${shaderName} - Failed to generate`);
    failed++;
  }
}

// Cleanup
const loseContextExt = glContext.getExtension('WEBGL_lose_context');
if (loseContextExt) {
  loseContextExt.loseContext();
}

console.log(`\nDone! Generated ${success}/${total} previews. ${failed} failed.`);

