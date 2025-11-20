// Dithered Fluid - based on user-provided code
// Adapted for VJ app with audio reactivity and GLSL compatibility fixes.

const source = `
// Simplex noise function
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// FBM (Fractal Brownian Motion)
float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 5; i++) {
        f += w * snoise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
}

// Dithering function (4x4 Bayer matrix)
float dither(vec2 position, float brightness) {
    int x = int(mod(position.x, 4.0));
    int y = int(mod(position.y, 4.0));
    int index = x + y * 4;
    float limit = 0.0;

    // This is an unrolled lookup table for a 4x4 Bayer matrix
    if (index == 0) limit = 0.0625;
    if (index == 1) limit = 0.5625;
    if (index == 2) limit = 0.1875;
    if (index == 3) limit = 0.6875;
    if (index == 4) limit = 0.8125;
    if (index == 5) limit = 0.3125;
    if (index == 6) limit = 0.9375;
    if (index == 7) limit = 0.4375;
    if (index == 8) limit = 0.25;
    if (index == 9) limit = 0.75;
    if (index == 10) limit = 0.125;
    if (index == 11) limit = 0.625;
    if (index == 12) limit = 1.0;
    if (index == 13) limit = 0.5;
    if (index == 14) limit = 0.875;
    if (index == 15) limit = 0.375;

    return brightness < limit ? 0.0 : 1.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;

    // Audio-reactive parameters
    float speed = 0.2 + iAudio.w * 0.5;
    float scale = 3.0 + iAudio.x * 4.0;
    float dither_brightness = 0.8 + iAudio.z * 0.4;

    // Fluid animation
    vec2 distortedUV = uv;
    distortedUV.x += fbm(uv * 0.5 + iTime * speed) * 0.3;
    distortedUV.y += fbm(uv * 0.5 - iTime * speed) * 0.3;

    // Create fluid patterns
    float noise1 = fbm(distortedUV * scale + vec2(iTime * 0.1, 0.0));
    float noise2 = fbm(distortedUV * scale * 0.8 + vec2(0.0, iTime * 0.14));
    float noise3 = fbm(distortedUV * scale * 1.2 - vec2(iTime * 0.08, iTime * 0.09));

    float finalNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
    finalNoise = finalNoise * dither_brightness;

    // Apply dithering
    vec2 pixelCoord = fragCoord.xy * 0.25;
    float dithered = dither(pixelCoord, finalNoise);

    // Define color palette with audio reactivity
    vec3 color1 = vec3(0.0, 0.4, 0.6);
    vec3 color2 = vec3(0.0, 0.7, 0.9);
    vec3 color3 = vec3(0.9, 0.4, 0.0) + iAudio.y * vec3(-0.3, 0.2, 0.3);
    vec3 bgColor = vec3(0.05, 0.07, 0.1);

    // Create color gradient based on noise
    vec3 fluidColor = mix(color1, color2, noise2);
    fluidColor = mix(fluidColor, color3, noise3 * 0.6);

    // Final color with dithering
    vec3 ditheredColor = mix(bgColor, fluidColor, dithered);
    
    // Add audio-reactive glow from the brightest fluid parts
    float glowMask = smoothstep(0.7, 1.0, finalNoise); // Glow mask from pre-dithered brightness
    vec3 glowColor = color3; // Use the highlight color for the glow
    float glowIntensity = 0.1 + iAudio.z * 0.3; // High frequencies control glow intensity
    
    vec3 finalColor = ditheredColor + glowColor * glowMask * glowIntensity;

    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;