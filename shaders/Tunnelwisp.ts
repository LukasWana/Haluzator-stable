
const source = `
// CC0: Trailing the Twinkling Tunnelwisp
// Adapted for Shader Sequencer with audio reactivity

// Distance field for gyroid
float g(vec4 p,float s) {
  return abs(dot(sin(p*=s),cos(p.zxwy))-1.)/s;
}

// Manual tanh for compatibility
vec4 Tanh(vec4 x) {
    vec4 ex = exp(x);
    vec4 emx = exp(-x);
    // Add epsilon to avoid division by zero
    return (ex - emx) / (ex + emx + 1e-9);
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // --- Initialization for WebGL compatibility ---
  // Uninitialized variables are undefined behavior in WebGL.
  float d = 0.0, z = 0.0, s = 0.0;
  vec4 o = vec4(0.0), q, p;
  vec4 U = vec4(2,1,0,3);

  // --- Audio-reactive parameters ---
  // Overall volume (w) controls the travel speed through the tunnel.
  float T = iTime * (1.0/3.0 + iAudio.w * 0.5); 
  // Bass (x) and mids (y) modulate the gyroid scales for visual complexity.
  float scale1 = 8.0 + iAudio.x * 6.0;
  float scale2 = 24.0 + iAudio.y * 12.0;
  // Mids (y) and highs (z) shift the color palette.
  vec4 color_mod = vec4(0.0, iAudio.y * 2.0, iAudio.z * 1.5, 0.0);
  // Bass (x) controls the intensity of the central "wisp" light.
  float wisp_audio_boost = iAudio.x * 1.5;

  // --- Main Raymarching Loop ---
  // FIX: The original compact for-loop was rewritten into a standard, compatible format
  // to resolve GLSL compilation errors on some platforms. The logic remains the same.
  vec2 r = iResolution.xy;
  for (int i = 0; i < 78; i++) {
    // This is the original loop body. It uses values from the previous iteration.
    o += (s > 0. ? 1. : .1) * p.w * p / max(s > 0. ? d : d*d*d, 5E-4);

    // This block contains the logic from the original loop's "increment" section.
    // It prepares the values for the next iteration of the loop.
    z += d + 5E-4;
    q = vec4(normalize(vec3(fragCoord-.5*r, r.y)) * z, .2);
    q.z += T;
    s = q.y + .1;
    q.y = abs(s);
    p = q;
    p.y -= .11;
    p.xy *= mat2(cos(11.*U.zywz - 2. * p.z ));
    p.y -= .2;
    d = abs(g(p, scale1) - g(p, scale2)) / 4.0;
    p = 1. + cos(.7 * (U + color_mod) + 5. * q.z);
  }

  // Add the central "tunnelwisp" light.
  // Add epsilon to length to prevent division by zero at the center.
  o += (1.4 + sin(iTime) * sin(1.7 * iTime) * sin(2.3 * iTime) + wisp_audio_boost)
       * 1E3 * U / (length(q.xy) + 1e-5);

  // Apply tanh for soft tone mapping and output.
  fragColor = Tanh(o / 1E5);
}
`;
export default source;