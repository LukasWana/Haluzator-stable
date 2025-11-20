// Portal Shader - Converted from Unity URP ShaderGraph
// Based on VOiD1 Gaming Free Portal Shader
// Converted, made audio-reactive, and GLSL-optimized for Shader Sequencer.

const source = `
// Portal shader parameters - now audio reactive
vec3 twirlColor;
float speed;
float fadeAmount;
float twirlStrength;
float scale;

// This function is called once per frame to set parameters based on audio.
void setPortalParams() {
    // Type A (Green) or Type B (Purple) based on time
    float typeSwitch = sin(iTime * 0.1) * 0.5 + 0.5;
    int portalType = int(step(0.5, typeSwitch));

    if (portalType == 0) {
        // Type A - Green/Cyan portal
        // Mids (y) shift the color towards cyan
        twirlColor = vec3(1.97, 7.13 + iAudio.y * 2.0, 0.78 + iAudio.y * 2.0);
        speed = 0.2 + iAudio.w * 0.8; // Speed up with volume
        twirlStrength = 20.0 + iAudio.x * 30.0; // Twirl with bass
    } else {
        // Type B - Purple/Pink portal
        // Mids (y) shift the color towards pink
        twirlColor = vec3(2.95, iAudio.y * 1.5, 4.0);
        speed = 0.5 + iAudio.w * 1.2; // Speed up with volume
        twirlStrength = 20.0 + iAudio.x * 40.0; // Twirl with bass
    }

    fadeAmount = 0.5 + iAudio.y * 0.3; // Mids affect mistiness/fade
    scale = 5.0 + iAudio.x * 3.0; // Scale with bass
}

// Noise function (standard)
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise (standard)
float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    // Corrected mixing formula
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal noise (standard FBM)
float fractalNoise(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    // Fewer octaves for better performance
    for (int i = 0; i < 3; i++) {
        value += amplitude * smoothNoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// Twirl effect
vec2 twirl(vec2 uv, float strength, float scale) {
    vec2 center = vec2(0.5);
    vec2 offset = uv - center;
    // Clamping length to prevent instability with high audio input
    float angle = clamp(length(offset), 0.0, 1.5) * strength * scale;
    float s = sin(angle);
    float c = cos(angle);
    mat2 rot = mat2(c, -s, s, c);
    return center + rot * offset;
}

// Portal effect rendering logic
vec4 portalEffect(vec2 uv) {
    // Apply twirl effect
    vec2 twirledUV = twirl(uv, twirlStrength * 0.01, scale);

    // Add time-based animation
    float time = iTime * speed;
    twirledUV += vec2(sin(time), cos(time * 0.7)) * 0.1;

    // Create spiral pattern
    // Add epsilon to length to avoid atan(0,0) at the center
    float angle = atan(twirledUV.y, twirledUV.x);
    float radius = length(twirledUV);

    // Spiral wave
    float spiral = sin(angle * 8.0 + radius * 20.0 - time * 10.0);
    spiral = smoothstep(0.3, 0.7, spiral);

    // Add noise for organic feel
    float noiseValue = fractalNoise(twirledUV * 4.0 + time * 0.5);
    spiral += noiseValue * 0.3;

    // Create radial gradient
    float radial = 1.0 - smoothstep(0.0, 0.8, radius);
    radial = pow(radial, 2.0);

    // Combine effects
    float finalPattern = spiral * radial;
    finalPattern = smoothstep(0.2, 0.8, finalPattern);

    // Apply fade
    finalPattern *= fadeAmount;

    // Color the pattern
    vec3 color = twirlColor * finalPattern;

    // Add glow effect
    float glow = smoothstep(0.0, 0.5, finalPattern);
    color += glow * twirlColor * 0.5;

    // Add rim lighting
    float rim = 1.0 - smoothstep(0.6, 0.8, radius);
    color += rim * twirlColor * 0.3;

    // Highs create bright flashes
    color *= (1.0 + iAudio.z * 1.5);

    return vec4(color, finalPattern);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Standard UV setup
    vec2 uv = fragCoord / iResolution.xy;

    // Set audio-reactive portal parameters for this frame
    setPortalParams();

    // Generate portal effect
    vec4 portal = portalEffect(uv);

    // Add dark background
    vec3 background = vec3(0.05, 0.05, 0.1);

    // Composite final color
    vec3 finalColor = mix(background, portal.rgb, portal.a);

    // Add vignette for focus
    float vignette = 1.0 - smoothstep(0.4, 0.8, length(uv - 0.5));
    finalColor *= vignette;

    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;
