// Tesseract4D shader, adapted from user-provided code for Shader Sequencer.
// Made audio-reactive for a dynamic visual experience.

const source = `
#define PI 3.14159265359
#define TWO_PI 6.28318530718

// Rotation matrix
mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// 4D rotation matrices
mat4 rotateXY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        c, -s, 0.0, 0.0,
        s, c, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

mat4 rotateXZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        c, 0.0, -s, 0.0,
        0.0, 1.0, 0.0, 0.0,
        s, 0.0, c, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

mat4 rotateXW(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        c, 0.0, 0.0, -s,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        s, 0.0, 0.0, c
    );
}

mat4 rotateYZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, c, -s, 0.0,
        0.0, s, c, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

mat4 rotateYW(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, c, 0.0, -s,
        0.0, 0.0, 1.0, 0.0,
        0.0, s, 0.0, c
    );
}

mat4 rotateZW(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, c, -s,
        0.0, 0.0, s, c
    );
}

// SDF for 4D hypercube (tesseract)
float sdTesseract(vec4 p, float size) {
    vec4 d = abs(p) - vec4(size);
    return min(max(d.x, max(d.y, max(d.z, d.w))), 0.0) + length(max(d, 0.0));
}

// Rainbow color function
vec3 rainbow(float t) {
    t = fract(t);
    if (t < 0.167) return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.5, 0.0), t * 6.0);
    else if (t < 0.333) return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.167) * 6.0);
    else if (t < 0.5) return mix(vec3(1.0, 1.0, 0.0), vec3(0.0, 1.0, 0.0), (t - 0.333) * 6.0);
    else if (t < 0.667) return mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0), (t - 0.5) * 6.0);
    else if (t < 0.833) return mix(vec3(0.0, 1.0, 1.0), vec3(0.0, 0.0, 1.0), (t - 0.667) * 6.0);
    else return mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), (t - 0.833) * 6.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // Mouse influence
    vec2 mouse_norm = iMouse.xy / iResolution.xy;
    float mouseInfluence = length(mouse_norm - 0.5) * 2.0;
    
    // Camera setup - blíž k objektu
    vec3 ro = vec3(0.0, 0.0, 3.0 - mouseInfluence * 0.5);
    vec3 rd = normalize(vec3(uv, -1.0));
    
    // Rotate ray based on mouse position
    vec2 mouseRotation = (mouse_norm - 0.5) * 6.28318;
    rd.xy = rotate2D(mouseRotation.x) * rd.xy;
    rd.yz = rotate2D(mouseRotation.y) * rd.yz;
    
    // Time-based variables
    float time = iTime * (0.5 + iAudio.w * 0.3);
    
    // Raymarching setup
    float t = 0.0;
    float tmax = 15.0;
    float closest = 1000.0;
    bool hit = false;
    
    // Colors
    vec3 col = vec3(0.0);
    vec3 bgCol = vec3(0.05, 0.05, 0.1);
    
    // Raymarching loop - méně kroků pro lepší výkon
    const int MAX_STEPS = 60;
    for (int i = 0; i < MAX_STEPS; i++) {
        if (t >= tmax || float(i) >= mix(20.0, 60.0, u_quality)) break;
        
        vec3 p = ro + rd * t;
        
        // Project 3D point to 4D
        vec4 p4 = vec4(p, 0.0);
        
        // Apply fewer 4D rotations for performance
        p4 = rotateXY(time * 0.3) * p4;
        p4 = rotateXZ(time * 0.2) * p4;
        p4 = rotateXW(time * 0.15) * p4;
        
        // Calculate tesseract SDF - větší velikost
        float size = 0.8 + sin(time * 0.5) * 0.2 + iAudio.x * 0.4;
        float d = sdTesseract(p4, size);
        
        // Track closest approach
        closest = min(closest, abs(d));
        
        // Step along ray
        t += max(abs(d) * 0.8, 0.01);
        
        // Hit test - větší tolerance
        if (abs(d) < 0.02) {
            // Calculate normal
            float eps = 0.01;
            vec4 n4 = vec4(
                sdTesseract(p4 + vec4(eps, 0.0, 0.0, 0.0), size) - sdTesseract(p4 - vec4(eps, 0.0, 0.0, 0.0), size),
                sdTesseract(p4 + vec4(0.0, eps, 0.0, 0.0), size) - sdTesseract(p4 - vec4(0.0, eps, 0.0, 0.0), size),
                sdTesseract(p4 + vec4(0.0, 0.0, eps, 0.0), size) - sdTesseract(p4 - vec4(0.0, 0.0, eps, 0.0), size),
                sdTesseract(p4 + vec4(0.0, 0.0, 0.0, eps), size) - sdTesseract(p4 - vec4(0.0, 0.0, 0.0, eps), size)
            );
            n4 = normalize(n4);
            
            // Rainbow coloring
            float rainbowParam = 0.5 + 0.5 * sin(length(p4) * 3.0 - time * 1.5 + iAudio.y * 3.0);
            vec3 rainbowColor = rainbow(rainbowParam + p4.w * 0.3);
            
            // Lighting
            float glow = pow(abs(dot(normalize(vec4(rd, 0.0)), n4)), 1.5);
            col = rainbowColor * (0.6 + glow * 0.8);
            
            // Specular highlight
            vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
            float spec = pow(max(0.0, dot(normalize(vec3(n4)), lightDir)), 8.0);
            col += spec * vec3(1.0) * (0.8 + iAudio.z * 1.2);
            
            hit = true;
            break;
        }
    }
    
    // Glow effect if no hit - silnější a viditelnější
    if (!hit) {
        float glow_strength = 0.5 / (closest * closest + 0.1);
        col = mix(bgCol, rainbow(closest * 3.0 - time * 0.5), glow_strength);
    }
    
    // Vignette
    vec2 screen_uv = fragCoord / iResolution.xy;
    float vignette = 1.0 - length(screen_uv - 0.5) * 0.8;
    vignette = smoothstep(0.2, 1.0, vignette);
    col *= vignette;
    
    // Brightness boost
    col = pow(col, vec3(0.8));
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;