// Fluid Stars by user, adapted for Shader Sequencer

const source = `
precision mediump float;

#define MAX_STARS 100
#define PI 3.14159265359

// Hash function for pseudo-random values
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// 2D noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0;
    return mix(mix(hash(n), hash(n + 1.0), f.x),
               mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
}

// Fluid-like motion
vec2 fluidMotion(vec2 p, float time) {
    float speed = 0.3;
    vec2 offset = vec2(0.0);
    
    // Multiple layers of noise for more complex motion
    offset.x += 0.3 * sin(time * 0.5 + p.y * 4.0);
    offset.y += 0.3 * cos(time * 0.3 + p.x * 4.0);
    
    offset.x += 0.2 * noise(p * 3.0 + time * speed) * (1.0 + iAudio.x * 2.0);
    offset.y += 0.2 * noise(p * 3.0 + vec2(100.0) + time * speed) * (1.0 + iAudio.x * 2.0);
    
    // Mouse influence
    vec2 u_mouse = iMouse.xy / iResolution.xy;
    vec2 mouseVec = u_mouse - (p * 0.5 + 0.5); // Remap p to UV space for mouse calc
    float mouseDist = length(mouseVec);
    float mouseInfluence = 0.05 / (0.01 + mouseDist * 2.0);
    offset += normalize(mouseVec) * mouseInfluence;
    
    return offset;
}

// Star function
float star(vec2 p, float size, float brightness) {
    float d = length(p);
    float glow = size / (d * 2.0);
    
    // Core of the star
    float core = smoothstep(size, size * 0.1, d) * brightness;
    
    // Glow around the star
    glow = pow(glow, 1.5) * 0.5;
    
    return core + glow;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 v_uv = fragCoord.xy / iResolution.xy;
    vec2 p = v_uv - 0.5;
    p.x *= iResolution.x / iResolution.y;
    
    // Audio reactive time
    float time = iTime * (0.5 + iAudio.w * 1.5);
    
    // Background color - deep space blue
    vec3 color = vec3(0.02, 0.04, 0.1);
    
    // Subtle nebula effect
    float nebula = noise(p * 3.0 + time * 0.05) * 
                   noise(p * 2.0 - time * 0.03);
    color += vec3(0.05 + iAudio.y * 0.1, 0.0, 0.1) * nebula;
    
    // Add stars with fluid-like motion
    for (int i = 0; i < MAX_STARS; i++) {
        // Generate pseudo-random star positions
        float randBase = float(i) * 0.1;
        vec2 pos = vec2(
            hash(randBase + 1.3),
            hash(randBase + 2.4)
        ) * 2.0 - 1.0;
        
        // Apply fluid motion to the stars
        vec2 offset = fluidMotion(pos, time);
        vec2 starPos = pos + offset * 0.3;
        
        // Adjust position to screen space
        starPos.x *= iResolution.x / iResolution.y;
        
        // Star properties
        float size = hash(randBase + 5.6) * 0.01 + 0.002;
        float brightness = hash(randBase + 7.8) * 0.5 + 0.5 + iAudio.z * 1.0;
        
        // Mouse interaction - make stars bigger near mouse
        vec2 u_mouse = iMouse.xy / iResolution.xy;
        float mouseDist = length(u_mouse - (starPos * 0.5 + 0.5));
        size *= 1.0 + 0.5 * smoothstep(0.2, 0.0, mouseDist) + iAudio.x * 0.5;
        
        // Calculate star intensity
        float starIntensity = star(p - starPos, size, brightness);
        
        // Star color - slightly different for each star
        vec3 starColor = vec3(
            0.8 + hash(randBase) * 0.2,
            0.8 + hash(randBase + 1.1) * 0.2,
            0.9 + hash(randBase + 2.2) * 0.1
        );
        
        // Add star to scene
        color += starColor * starIntensity;
    }
    
    // Add a subtle vignette effect
    float vignette = 1.0 - length(v_uv - 0.5) * 1.2;
    vignette = smoothstep(0.0, 0.5, vignette);
    color *= vignette;
    
    // Output final color
    fragColor = vec4(color, 1.0);
}
`;
export default source;
