
const source = `
// Transwarp by user, adapted and enhanced by AI for Shader Sequencer.

precision mediump float;

#define PI 3.14159265359

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = p.x + p.y * 57.0 + p.z * 113.0;
    
    float res = mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                         mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                     mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                         mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    return res;
}

float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    
    for(int i = 0; i < 6; i++) {
        sum += amp * noise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    
    return sum;
}

vec3 getColor(float t) {
    // Star Trek Voyager transwarp colors: blue, purple, and electric blue
    vec3 color1 = vec3(0.0, 0.2, 0.8);  // Deep blue
    vec3 color2 = vec3(0.5, 0.0, 0.8);  // Purple
    vec3 color3 = vec3(0.0, 0.8, 1.0);  // Electric blue
    
    float t_wrapped = fract(t);
    if (t_wrapped < 0.333) {
        return mix(color1, color2, t_wrapped * 3.0);
    } else if (t_wrapped < 0.666) {
        return mix(color2, color3, (t_wrapped - 0.333) * 3.0);
    } else {
        return mix(color3, color1, (t_wrapped - 0.666) * 3.0);
    }
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 v_uv = fragCoord.xy / iResolution.xy;

    // Adjust for aspect ratio
    vec2 uv = v_uv;
    float aspectRatio = iResolution.x / iResolution.y;
    uv.x *= aspectRatio;
    
    // Center coordinates
    vec2 center = vec2(aspectRatio * 0.5, 0.5);
    
    // Mouse influence on speed and distortion
    vec2 u_mouse = iMouse.xy / iResolution.xy;
    float mouseDistance = length(u_mouse - vec2(0.5));
    
    // Audio-reactive parameters
    float speedFactor = 1.0 + mouseDistance * 2.0 + iAudio.w * 2.0;
    float distortionFactor = 0.2 + mouseDistance * 0.8 + iAudio.x * 0.5;
    
    // Calculate polar coordinates
    vec2 p = uv - center;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    
    // Tunnel effect parameters
    float tunnelSpeed = iTime * 0.5 * speedFactor;
    float tunnelZoom = 0.5;
    
    // Create the tunnel effect with distortion
    float z = tunnelSpeed + 1.0 / (radius * tunnelZoom);
    
    // Add some swirling
    float swirl = sin(angle * 3.0 + iTime) * 0.1;
    z += swirl;
    
    // Create streaks in the tunnel
    float streaks = sin(angle * 8.0) * 0.05;
    z += streaks;
    
    // Apply noise for a more organic feel
    vec3 noiseCoord = vec3(p * 2.0, z * 0.1);
    float noiseVal = fbm(noiseCoord) * distortionFactor;
    z += noiseVal;
    
    // Create energy streaks along the tunnel
    float energyStreaks = 
        sin(angle * 12.0 + z * 2.0) * 0.3 + 
        sin(angle * 7.0 - z * 3.0) * 0.2 + 
        sin(angle * 5.0 + z * 1.5) * 0.1;
    
    // Final color calculation
    // Mids shift the color palette
    vec3 color = getColor(fract(z * 0.2 + iAudio.y * 0.3));
    
    // Add energy streaks glow
    color += vec3(0.1, 0.3, 0.9) * abs(energyStreaks) * 0.8;
    
    // Add brightness based on radius for tunnel effect
    float brightness = 0.15 / (radius * 2.0 + 0.1);
    color += vec3(0.0, 0.5, 1.0) * brightness;
    
    // Add vignette effect
    float vignette = smoothstep(1.0, 0.3, radius);
    color *= vignette;
    
    // Add pulsing glow - Highs make it flicker
    float pulse = sin(iTime * 2.0) * 0.5 + 0.5 + iAudio.z * 0.5;
    color += vec3(0.0, 0.2, 0.5) * pulse * 0.1;
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;
