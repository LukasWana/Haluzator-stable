const source = `
// FilmGrain - Vintage film grain effect
// Simulates old film texture with grain and flickering

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float filmGrain(vec2 uv, float time, float intensity) {
    float grain = 0.0;
    
    // Multiple octaves of noise for realistic grain
    grain += noise(uv * 150.0 + time * 20.0) * 0.6;
    grain += noise(uv * 300.0 - time * 15.0) * 0.3;
    grain += noise(uv * 600.0 + time * 25.0) * 0.1;
    
    // Occasional larger dust particles
    float dust = hash(floor(uv * 100.0) + floor(time * 10.0));
    if (dust > 0.998) grain += 0.8;
    
    return grain * intensity;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    float time = iTime * (0.8 + iAudio.z * 1.2); // Highs control grain speed
    
    // Audio-reactive parameters
    float grain_intensity = 0.15 + iAudio.x * 0.25; // Bass controls grain strength
    float flicker = 1.0 + sin(time * 30.0) * 0.05 + iAudio.y * 0.15; // Mids add flicker
    float brightness = 0.7 + iAudio.w * 0.3; // Overall volume controls brightness
    
    // Create base pattern - more chaotic than oil slick
    vec2 distorted_uv = uv + vec2(
        noise(uv * 8.0 + time * 0.3) * 0.02,
        noise(uv * 6.0 - time * 0.2) * 0.02
    );
    
    float pattern = 0.0;
    pattern += noise(distorted_uv * 12.0 + time * 0.1) * 0.4;
    pattern += noise(distorted_uv * 24.0 - time * 0.15) * 0.3;
    pattern += noise(distorted_uv * 48.0 + time * 0.2) * 0.2;
    pattern += noise(distorted_uv * 96.0 - time * 0.25) * 0.1;
    
    // Vintage sepia/film color palette
    vec3 base_color = mix(
        vec3(0.2, 0.15, 0.1),  // Dark sepia
        vec3(0.9, 0.8, 0.6),   // Light sepia
        smoothstep(0.2, 0.8, pattern)
    );
    
    // Add film grain
    float grain = filmGrain(uv, time, grain_intensity);
    base_color += grain;
    
    // Vignetting effect
    vec2 center_uv = (uv - 0.5) * 2.0;
    float vignette = 1.0 - smoothstep(0.7, 1.4, length(center_uv));
    base_color *= vignette;
    
    // Apply flicker and brightness
    base_color *= flicker * brightness;
    
    // Slight contrast boost for film look
    base_color = pow(base_color, vec3(1.1));
    
    // Clamp values
    base_color = clamp(base_color, 0.0, 1.0);
    
    fragColor = vec4(base_color, 1.0);
}
`;
export default source;