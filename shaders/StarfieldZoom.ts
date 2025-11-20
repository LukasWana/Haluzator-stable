const source = `
#define PI 3.14159265359
#define MAX_STARS 100.0

// Hash function for random values
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// 3D hash function
vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
}

// Noise for nebula
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(dot(i, vec2(1.0, 57.0)));
    float b = hash(dot(i + vec2(1.0, 0.0), vec2(1.0, 57.0)));
    float c = hash(dot(i + vec2(0.0, 1.0), vec2(1.0, 57.0)));
    float d = hash(dot(i + vec2(1.0, 1.0), vec2(1.0, 57.0)));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Correct UVs
    vec2 uv = fragCoord / iResolution.xy;
    
    // Audio-reactive time for flight speed
    float time = iTime * (0.5 + iAudio.w * 2.0);

    // --- Starfield Rendering ---
    vec3 color = vec3(0.0);
    
    // Mouse interaction
    vec2 mouse_uv = iMouse.xy / iResolution.xy;
    vec2 mouse_centered = (mouse_uv - 0.5) * 2.0;
    vec2 uv_centered = (uv - 0.5) * 2.0;

    // Aspect ratio correction for centered UVs
    uv_centered.x *= iResolution.x / iResolution.y;
    mouse_centered.x *= iResolution.x / iResolution.y;

    for (int i_int = 1; i_int <= int(MAX_STARS); i_int++) {
        float i = float(i_int);
        // Star properties
        float randAngle = hash(i) * 2.0 * PI;
        // Place stars in a disk for a more natural distribution
        vec2 starPos_polar = vec2(sqrt(hash(i + 100.0)), randAngle);
        vec2 starPos_cartesian = vec2(cos(starPos_polar.y), sin(starPos_polar.y)) * starPos_polar.x;

        // Star depth and position
        float starDepth = fract(hash(i + 200.0) + time * (0.05 + hash(i) * 0.05));
        vec2 pos = starPos_cartesian / (starDepth + 0.001);
        
        // Star size, pulses with bass
        float starSize = (0.002 + hash(i + 300.0) * 0.015) / (starDepth + 0.1);
        starSize *= (1.0 + iAudio.x * 3.0);
        
        // Mouse influence on star size for a more interactive feel
        float mouseDistance = length(uv_centered - pos);
        starSize *= 1.0 + smoothstep(0.8, 0.0, mouseDistance) * 2.0;

        // Star brightness
        float brightness = smoothstep(starSize * 2.0, 0.0, length(uv_centered - pos));
        
        // Pulsating/twinkling effect, accelerated by highs
        float twinkle_speed = 3.0 + iAudio.z * 10.0;
        brightness *= 0.7 + 0.3 * sin(time * twinkle_speed + hash(i) * 10.0);
        
        // Star color, shifted by mids
        vec3 starColor = hash3(vec3(starPos_cartesian, i));
        starColor = pow(starColor, vec3(0.5)) * 1.5;
        starColor = mix(starColor, vec3(0.6, 0.8, 1.0), iAudio.y * 0.5);

        // Add star to scene
        color += brightness * starColor * (1.0 + iAudio.x * 2.0); // Bass also increases brightness
    }

    // --- Background and Nebula ---
    // Mids affect nebula color
    vec3 nebula_color = vec3(0.1, 0.2, 0.5) + iAudio.y * vec3(0.3, -0.1, 0.1);
    float nebula = noise(uv_centered * 2.0 + time * 0.1) * 0.2;
    nebula += noise(uv_centered * 4.0 - time * 0.05) * 0.1;
    
    // Deep space background
    vec3 backgroundColor = vec3(0.01, 0.01, 0.03) + nebula * nebula_color;

    // --- Composition ---
    vec3 finalColor = backgroundColor + color;

    // Vignette
    finalColor *= 1.0 - length(uv_centered) * 0.3;
    
    // Contrast
    finalColor = pow(finalColor, vec3(0.9));
    
    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;