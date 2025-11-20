
const source = `
// CloudySky by user, adapted for Shader Sequencer by AI

// A simple random function based on sine
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D noise function
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  // Four corners in 2D of a tile
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  // Smooth interpolation
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion for added cloud detail
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // Use the provided fragCoord and iResolution
  vec2 uv = fragCoord.xy / iResolution.xy;
  
  // --- Audio-reactive parameters ---
  // The wrapper #defines iTime, so we can use it directly
  float time = iTime * (0.2 + iAudio.w * 0.3); // Overall volume controls speed
  float cloud_density = 3.0 + iAudio.x * 3.0; // Bass affects cloud density/scale
  float sky_hue_shift = iAudio.y * 0.1; // Mids shift the sky color
  float lightning_flash = pow(iAudio.z, 3.0) * 2.0; // Highs create flashes in clouds
  
  // Define a sky gradient: bottom (light blue) to top (deep blue)
  vec3 bottomColor = vec3(0.6, 0.8, 1.0) + sky_hue_shift;
  vec3 topColor    = vec3(0.1, 0.3, 0.7) + sky_hue_shift;
  vec3 skyColor = mix(bottomColor, topColor, uv.y);

  // Create cloud noise effect over the sky
  float cloudNoise = fbm(uv * cloud_density + time);
  
  // Smooth cloud boundaries
  float clouds = smoothstep(0.5, 0.7, cloudNoise);

  // Subtle mouse interaction: brighten clouds near the mouse position
  // The wrapper provides mouse in pixels, so we normalize it.
  vec2 mouse_uv = iMouse.xy / iResolution.xy;
  float mouseEffect = 1.0 - smoothstep(0.0, 0.2, distance(uv, mouse_uv));
  clouds += mouseEffect * 0.2;
  
  // Blend clouds with the sky
  vec3 finalColor = mix(skyColor, vec3(1.0), clouds);

  // Add audio-reactive "lightning" flash
  finalColor += clouds * lightning_flash * vec3(0.8, 0.9, 1.0);

  fragColor = vec4(finalColor, 1.0);
}
`;
export default source;