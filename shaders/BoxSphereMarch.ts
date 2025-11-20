const source = `
// Original shader from user, adapted and enhanced by AI for Shader Sequencer.

// SDF for a Box
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// SDF for a Sphere
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// 2D Rotation Matrix
mat2 rot2D(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Main image function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Setup UVs ---
    // Aspect-corrected UVs, centered at (0,0)
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    // --- Base Color ---
    vec3 col = vec3(0.1, 0.05, 0.2); // Dark background
    
    // --- Camera (Ray) Setup ---
    vec3 ro = vec3(0.0, 0.0, -3.0); // Ray Origin
    vec3 rd = normalize(vec3(uv, 1.0)); // Ray Direction

    // --- Raymarching ---
    float t = 0.0; // Distance traveled along the ray
    
    // Use a fixed integer loop for compatibility
    for(int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        
        // --- Scene Deformation (Audio-Reactive) ---
        // Rotation speed is controlled by the main speed uniform (iTime)
        // Mids (iAudio.y) add an extra wobble to the rotation
        p.xz *= rot2D(iTime * 0.5 + iAudio.y * 0.5);
        p.yz *= rot2D(iTime * 0.3 + iAudio.y * 0.3);
        
        // --- Scene Objects (SDFs) ---
        // Box size is static
        float d1 = sdBox(p, vec3(1.0));
        
        // Sphere size pulses with bass (iAudio.x)
        float sphereSize = 0.2 + sin(iTime * 2.0) * 0.1 + iAudio.x * 0.2;
        // Sphere position is animated
        vec3 spherePos = vec3(
            sin(iTime * 1.1) * 0.5,
            cos(iTime * 0.9) * 0.5,
            sin(iTime * 0.7) * 0.5
        );
        float d2 = sdSphere(p - spherePos, sphereSize);
        
        // Combine shapes
        float d = min(d1, d2);
        
        // --- Hit Detection & Shading ---
        if(d < 0.001) {
            vec3 hit_color;
            if(d1 < d2) {
                // Box color: Reddish, modulated by position and mids
                hit_color = vec3(0.7, 0.2, 0.3) + sin(p.xyz * 5.0 + iTime + iAudio.y * 2.0) * 0.2;
            } else {
                // Sphere color: Bluish, modulated by position and mids
                hit_color = vec3(0.3, 0.7, 0.9) + cos(p.xyz * 3.0 + iTime + iAudio.y * 2.0) * 0.2;
            }
            // Treble (iAudio.z) adds a bright flash on hit
            col = hit_color + vec3(1.0) * iAudio.z * 1.5;
            break; // Exit loop on hit
        }
        
        // Step forward
        t += d;
        // Far clip plane
        if(t > 10.0) break;
    }
    
    // --- Post-processing / Fog ---
    // Mix with background color based on distance for a fog effect
    col = mix(col, vec3(0.1, 0.05, 0.2), 1.0 - exp(-t * 0.2));
    
    fragColor = vec4(col, 1.0);
}
`;
export default source;
