// GoldSpire by user, adapted for Shader Sequencer by AI

const source = `
// Add tanh for vec4
vec4 Tanh(vec4 x) {
    vec4 ex = exp(x);
    vec4 emx = exp(-x);
    return (ex - emx) / (ex + emx + 1e-9);
}

// g function: calculates a noise-like value from a 4D point
float g(vec4 p, float s) {
  // p is modified in place, which is part of the original algorithm.
  return abs(dot(sin(p *= s), cos(p.zxwy)) - 1.) / s;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Loop counters and distance variables
  float d=0.0;
  float z=0.0;
  float s=0.0;
  
  // Time and constants
  float T = iTime * (1.0 + iAudio.w * 0.5); // Audio-reactive speed
  vec4 U = vec4(2.0, 1.0, 0.0, 3.0);
  vec2 r = iResolution.xy;
  
  // Accumulated color
  vec4 o = vec4(0.0);

  // Main raymarching loop.
  // Converted to a standard integer-based for-loop for WebGL 1 compatibility.
  for (int i = 0; i < 79; i++) {
    // Current 3D position along ray.
    vec4 q = vec4(normalize(vec3(fragCoord - 0.5 * r, r.y)) * z, 0.2);
    
    // Evolve position over time
    q.z += T / 30.0;
    
    s = q.y + 0.1;
    q.y = abs(s);
    
    vec4 p = q;
    p.y -= 0.11;
    
    // The original shader's rotation logic was invalid (mat2(vec4)).
    // Replaced with a simple, visually interesting rotation.
    float angle = (p.x + p.z) * 2.0;
    p.xy *= mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    
    p.y -= 0.2;
    
    // Calculate distance to surface
    d = abs(g(p, 8.0) - g(p, 24.0)) / 4.0;
    
    // Color calculation for the hit point
    vec4 p_color_mod = 1.0 + cos(0.7 * U + 5.0 * q.z + iAudio.y * 2.0); // Mids shift color
    
    // Accumulate color. The divisor is complex to avoid division by zero and create highlights.
    float divisor = max(s > 0. ? d : d * d * d, 5e-4);
    o += (s > 0. ? 1.0 : 0.1) * p_color_mod.w * p_color_mod / divisor;
    
    // March the ray forward
    z += d + 5e-4;
  }
  
  // Add a central glow / singularity effect, pulsating with bass
  vec4 q_final = vec4(normalize(vec3(fragCoord - .5 * r, r.y)) * z, .2);
  // Add an epsilon to prevent division by zero at the very center
  o += (1.4 + sin(T) * sin(1.7 * T) * sin(2.3 * T)) * 1000.0 * (1.0 + iAudio.x) * U / (length(q_final.xy) + 1e-6);

  // Tonemapping to bring the high values into a visible range
  fragColor = Tanh(o / 100000.0);
}
`;
export default source;
