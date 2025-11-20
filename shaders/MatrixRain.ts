// Matrix Rain by user, adapted for Shader Sequencer by AI

const source = `
#define GREEN vec3(0.0, 0.8, 0.2)
#define DARK_GREEN vec3(0.0, 0.3, 0.1)
#define BLACK vec3(0.0, 0.0, 0.0)
// Bass makes the grid denser or sparser
#define GRID_SIZE (20.0 + iAudio.x * 20.0)
// Overall volume controls speed
#define CHAR_SPEED (0.5 + iAudio.w * 1.5)
// Highs control flicker speed
#define FLICKER_SPEED (10.0 + iAudio.z * 20.0)
#define NUM_COLUMNS (20.0 + iAudio.x * 20.0)

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float random(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
}

// Creates a simple Japanese-like character
float japaneseChar(vec2 uv, float seed) {
    uv = fract(uv * 2.0) - 0.5;
    
    float r = random(seed);
    float r2 = random(seed + 1.0);
    float r3 = random(seed + 2.0);
    
    float shape = 0.0;
    
    // Horizontal line
    if (r > 0.3) {
        float y = mix(-0.2, 0.2, r2);
        float thickness = mix(0.05, 0.1, r3);
        shape += smoothstep(thickness, 0.0, abs(uv.y - y));
    }
    
    // Vertical line
    if (r > 0.2) {
        float x = mix(-0.2, 0.2, random(seed + 3.0));
        float thickness = mix(0.05, 0.1, random(seed + 4.0));
        shape += smoothstep(thickness, 0.0, abs(uv.x - x));
    }
    
    // Circle or arc
    if (r > 0.5) {
        float radius = mix(0.1, 0.3, random(seed + 5.0));
        float cx = mix(-0.2, 0.2, random(seed + 6.0));
        float cy = mix(-0.2, 0.2, random(seed + 7.0));
        float arcStart = mix(0.0, 3.0, random(seed + 8.0));
        float arcEnd = arcStart + mix(1.0, 6.0, random(seed + 9.0));
        
        vec2 p = uv - vec2(cx, cy);
        float angle = atan(p.y, p.x);
        float dist = length(p);
        
        if (angle < 0.0) angle += 6.28318;
        
        if (angle >= arcStart && angle <= arcEnd) {
            shape += smoothstep(0.05, 0.0, abs(dist - radius));
        }
    }
    
    // Dot
    if (r > 0.7) {
        float dx = mix(-0.2, 0.2, random(seed + 10.0));
        float dy = mix(-0.2, 0.2, random(seed + 11.0));
        float size = mix(0.03, 0.08, random(seed + 12.0));
        shape += smoothstep(size, 0.0, length(uv - vec2(dx, dy)));
    }
    
    return clamp(shape, 0.0, 1.0);
}

float getColumn(float x) {
    return floor(x * NUM_COLUMNS);
}

float getColumnRandom(float col) {
    return random(col * 0.01);
}

float getCharPosition(float col, float time) {
    float speed = mix(0.5, 1.5, getColumnRandom(col));
    float offset = getColumnRandom(col + 100.0) * 10.0;
    return fract(time * speed * CHAR_SPEED + offset);
}

float crtEffect(vec2 uv, vec3 resolution, float time) {
    // Scanlines
    float scanline = sin(uv.y * resolution.y * 0.5) * 0.5 + 0.5;
    scanline = pow(scanline, 3.0) * 0.5 + 0.5;
    
    // Vignette
    float vignette = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y);
    vignette = pow(vignette * 15.0, 0.25);
    
    // Flickering
    float flicker = sin(time * FLICKER_SPEED) * 0.03 + 0.97;
    
    return scanline * vignette * flicker;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 original_uv = fragCoord / iResolution.xy;
    vec2 uv = original_uv;
    
    // Adjust aspect ratio
    float aspect = iResolution.x / iResolution.y;
    uv.x *= aspect;
    
    vec2 mouse_uv = iMouse.xy / iResolution.xy;

    // Mouse interaction - slight distortion
    // Mids (y) add to distortion
    float mouseDistance = length(uv - mouse_uv * vec2(aspect, 1.0));
    float mouseInfluence = smoothstep(0.5, 0.0, mouseDistance);
    uv.y += sin(uv.x * 10.0 + iTime) * 0.01 * (mouseInfluence + iAudio.y * 0.5);
    
    // Grid setup
    vec2 gridUv = uv * GRID_SIZE;
    vec2 cell = floor(gridUv);
    vec2 cellUv = fract(gridUv);
    
    float col = getColumn(uv.x);
    
    // Calculate character position
    float charPos = getCharPosition(col, iTime);
    
    // Final color
    vec3 finalColor = BLACK;
    
    // Draw characters
    float charSize = 0.8 + mouseInfluence * 0.2;
    float charIntensity = 0.0;
    
    // Draw multiple characters in each column with different speeds
    for (int i = 0; i < 5; i++) {
        float iFloat = float(i);
        float speed = mix(0.5, 1.5, random(col + iFloat * 10.0));
        float offset = random(col + 100.0 + iFloat) * 10.0;
        float yPos = fract(iTime * speed * CHAR_SPEED + offset);
        
        // Character position in grid
        float distFromChar = abs(uv.y - yPos);
        
        if (distFromChar < 0.02 * (1.0 + mouseInfluence)) {
            // Generate a unique character for this position
            float charSeed = col + floor(iTime * 0.5 + yPos * 100.0);
            float char = japaneseChar(cellUv, charSeed);
            
            // Fade characters based on their position
            float fade = 1.0 - smoothstep(0.0, 0.8, yPos);
            
            // Brightest at the top of the fall
            float brightness = smoothstep(0.1, 0.0, yPos) * 2.0;
            
            charIntensity += char * fade * (1.0 + brightness);
        }
    }
    
    // Leading character (brightest)
    float leadYPos = charPos;
    if (abs(uv.y - leadYPos) < 0.02 * (1.0 + mouseInfluence)) {
        float leadCharSeed = col + floor(iTime * 2.0);
        float leadChar = japaneseChar(cellUv, leadCharSeed);
        charIntensity += leadChar * 2.0; // Brighter
    }
    
    // Apply CRT effect
    float crt = crtEffect(original_uv, iResolution, iTime);
    
    // Mix colors based on character intensity
    if (charIntensity > 0.0) {
        finalColor = mix(DARK_GREEN, GREEN, min(charIntensity, 1.0)) * crt;
    }
    
    // Add subtle glow
    float glow = charIntensity * 0.5;
    finalColor += GREEN * glow * crt;
    
    // Add subtle grid effect
    float gridEffect = 0.03 * smoothstep(0.95, 1.0, sin(uv.x * 100.0) * 0.5 + 0.5);
    finalColor += gridEffect * GREEN * crt;
    
    fragColor = vec4(finalColor, 1.0);
}
`;
export default source;
