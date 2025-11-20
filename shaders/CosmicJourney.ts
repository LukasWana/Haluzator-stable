// Cosmic Journey by user, adapted for Shader Sequencer

const source = `
precision mediump float;

// Constants
#define PI 3.14159265359
#define NUM_STARS 60.0
#define MAX_STARS_DIST 20.0

// Random functions
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 hash3(float n) {
    return fract(sin(vec3(n, n + 1.0, n + 2.0)) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Star field function
vec3 starField(vec2 uv, float time) {
    vec3 col = vec3(0.0);
    float speed = 0.3 + iAudio.w * 0.7; // Audio reactive speed

    for (int i_int = 0; i_int < int(NUM_STARS); i_int++) {
        float i = float(i_int);
        vec3 h = hash3(i);
        
        // Star position
        vec2 starPos = h.xy;
        starPos.x *= iResolution.x / iResolution.y; // Pre-correct aspect for positioning
        float starDepth = mix(0.1, MAX_STARS_DIST, h.z);
        
        // Moving forward effect
        starPos.y = fract(starPos.y + time * speed / starDepth);
        
        // Calculate star size and brightness based on depth
        float size = mix(0.001, 0.006, 1.0 / starDepth);
        
        // Pulsing effect - Highs pulse
        float pulse = 0.5 + 0.5 * sin(time * (1.0 + h.z * 3.0 + iAudio.z * 5.0) + h.x * 10.0);
        size *= 0.8 + 0.4 * pulse;
        
        // Mouse influence on star size
        vec2 u_mouse = iMouse.xy / iResolution.xy;
        u_mouse.x *= iResolution.x / iResolution.y;
        float mouseInfluence = max(0.0, 1.0 - length(uv - u_mouse) * 2.0);
        size *= 1.0 + mouseInfluence * 3.0 + iAudio.x * 2.0; // Bass size
        
        // Calculate distance to star
        float d = length(uv - starPos) / size;
        
        // Star color based on spectrum - Mids color
        vec3 starColor = 0.5 + 0.5 * cos(vec3(0.0, 0.3, 0.6) * PI * 2.0 + h.z * 4.0 + iAudio.y * 2.0);
        
        // Add glow
        float brightness = smoothstep(1.0, 0.0, d) * (0.4 + 0.6 * pulse);
        col += brightness * starColor / (starDepth * 0.5);
    }
    
    return col;
}

// Background nebula
vec3 nebula(vec2 uv, float time) {
    // Distorted coordinates for nebula
    vec2 q = uv;
    q.x += 0.1 * noise(vec2(q.y * 2.0, time * 0.25 + iAudio.y)); // Mids turbulence
    q.y += 0.1 * noise(vec2(q.x * 2.0, time * 0.25 + 10.0));
    
    // Mouse influence
    vec2 u_mouse = iMouse.xy / iResolution.xy;
    u_mouse.x *= iResolution.x / iResolution.y;
    vec2 mouseOffset = (u_mouse - vec2(0.5 * iResolution.x / iResolution.y, 0.5)) * 0.1;
    q += mouseOffset;
    
    // Layered noise for nebula
    float f = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
        f += amplitude * noise(q * frequency + time * 0.05);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    // Create colored nebula
    vec3 nebulaColor = mix(
        vec3(0.1, 0.0, 0.2),  // Deep purple
        vec3(0.0, 0.2, 0.4),  // Deep blue
        noise(uv * 2.0 + time * 0.1 + iAudio.y)
    );
    
    // Add some spectrum color highlights - Bass highlights
    nebulaColor += 0.04 * vec3(0.8, 0.2, 0.5) * smoothstep(0.3, 0.7, f) * (1.0 + iAudio.x);
    nebulaColor += 0.04 * vec3(0.2, 0.5, 0.8) * smoothstep(0.5, 0.8, f) * (1.0 + iAudio.x);
    
    return nebulaColor * f * 0.4;
}

// Forward tunnel effect
vec3 tunnel(vec2 uv, float time) {
    // Center the coordinates
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    
    // Mouse influence
    vec2 u_mouse = iMouse.xy / iResolution.xy;
    vec2 mouseOffset = (u_mouse - 0.5) * 0.5;
    uv += mouseOffset;
    
    // Polar coordinates for tunnel
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float speed = 0.3 + iAudio.w * 0.7; // Audio reactive speed
    
    // Moving forward effect
    float z = 0.1 / radius + time * speed;
    
    // Create tunnel pattern - Bass turbulence
    vec2 polarCoord = vec2(angle / PI, z);
    float pattern = noise(polarCoord * (10.0 + iAudio.x * 5.0)) * noise(polarCoord * 5.0 + vec2(time * 0.1, 0.0));
    
    // Spectrum coloring - Mids color
    vec3 tunnelColor = 0.5 + 0.5 * cos(vec3(3.0, 5.0, 7.0) + z * 0.5 + iAudio.y * 2.0);
    tunnelColor *= pattern * smoothstep(1.0, 0.0, radius);
    
    return tunnelColor * 0.2;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv_raw = fragCoord.xy / iResolution.xy;
    vec2 uv_aspect = uv_raw;
    uv_aspect.x *= iResolution.x / iResolution.y;
    
    // Base deep dark background
    vec3 color = vec3(0.01, 0.01, 0.02);
    
    // Add nebula effect
    color += nebula(uv_aspect, iTime);
    
    // Add tunnel effect
    color += tunnel(uv_raw, iTime);
    
    // Add stars
    color += starField(uv_aspect, iTime);
    
    // Add central glow
    vec2 center = vec2(iResolution.x / iResolution.y * 0.5, 0.5);
    float centerGlow = 0.02 / length(uv_aspect - center);
    color += centerGlow * 0.03 * (0.5 + 0.5 * cos(vec3(0.0, 0.3, 0.6) * PI * 2.0 + iTime * 0.5));
    
    // Add vignette effect
    float vignette = smoothstep(1.4, 0.2, length((uv_raw - 0.5) * 2.0));
    color *= vignette;
    
    // Gamma correction for better display
    color = pow(color, vec3(0.8));
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;