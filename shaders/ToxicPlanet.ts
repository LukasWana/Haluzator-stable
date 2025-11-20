const source = `
// Toxic alien planet
// Original by Vlad NES (@vladgan) - https://www.shadertoy.com/view/WtG3Wc
// Adapted for Shader Sequencer. This version is heavily refactored for maximum GLSL compatibility and audio reactivity.

// Manual tanh implementation for maximum compatibility.
float _tanh(float x) {
    float ex = exp(x);
    float emx = exp(-x);
    // Add a small epsilon to the denominator to prevent division by zero.
    return (ex - emx) / (ex + emx + 1e-9);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Variable Declarations and Initializations ---
    // All variables are declared and initialized on separate lines to ensure maximum compatibility.
    
    vec2 r = iResolution.xy;
    vec2 centered_frag_coord = fragCoord - vec2(0.5, 1.0) * r;
    vec3 ray_dir = normalize(vec3(centered_frag_coord, r.y));

    float d = 9.0;      // distance to surface
    float z = 0.0;      // distance along the ray
    
    float s = 0.0;      // temporary storage for y-coordinate
    vec3 p = vec3(0.0); // current 3D position being sampled
    vec3 O = vec3(0.0); // accumulated color output
    
    // Audio-reactive color tinting. Mids (y) will shift the colors and fractal shape.
    vec3 U = vec3(1.0, 3.0 + iAudio.y * 2.5, iAudio.y * 0.8);
    
    // --- Main Raymarching Loop ---
    // Using a standard integer-based for-loop for maximum compatibility.
    const int MAX_STEPS = 54;
    int steps = int(mix(24.0, 54.0, u_quality));
    for (int i = 0; i < MAX_STEPS; i++) {
        if (i >= steps) break;
        // Exit condition: if the ray is very close to a surface.
        if (d < 0.001) break;

        // Calculate current 3D position of the ray
        p = z * ray_dir;
        
        // Animate by moving through the landscape over time. Speed controlled by overall volume (w).
        p.z += iTime * (0.8 + iAudio.w * 2.0);
   
        // Initialize values for this fractal step
        vec2 P = p.xz * 0.23;
        vec2 D = vec2(0.0);
        
        // Create mirrored effect. "Water level" pulses with bass (x).
        s = p.y + (4.0 - iAudio.x * 0.7);
        d = abs(s) + 0.6;
   
        // --- Fractal Detail Loop ---
        // COMPATIBILITY FIX: Replaced the original floating-point loop with a fixed-iteration integer loop.
        // The value of 'a' is now calculated based on the loop iterator 'j'.
        float a = 1.0;
        for (int j = 0; j < 7; j++) {
            // Calculate noise value for this octave
            vec4 tvec_inner = cos(P.xxyy + 11.0 * U.xzxz);
            
            // COMPATIBILITY FIX: Refactored complex vector multiplication to be more explicit
            // to work around potential GLSL compiler bugs.
            vec3 v1 = vec3(tvec_inner.y, tvec_inner.x, tvec_inner.x);
            vec3 v2 = vec3(tvec_inner.z, tvec_inner.w, tvec_inner.z);
            vec3 p_inner = v1 * v2;
            
            // Update derivative for sharp peak calculation
            D += p_inner.xy;
            
            // Subtract from distance field to create fractal detail.
            // High frequencies (z) can smooth out the peaks.
            // Added epsilon (1e-6) to prevent potential division by zero.
            d -= a * (1.0 + p_inner.z) / (1.0 + (3.0 * dot(D, D) * (1.0 - iAudio.z * 0.4)) + 1e-6);
            
            // Rotate and scale coordinates for the next octave.
            // Explicitly constructing mat2 from four float components.
            vec4 rot_vec = cos(1.0 + 11.0 * U.zxyz);
            mat2 rot_mat = mat2(rot_vec.x, rot_vec.y, rot_vec.z, rot_vec.w);
            
            // COMPATIBILITY FIX: Replaced unsupported compound assignment operator '*='.
            P = P * 2.0 * rot_mat;

            // Update 'a' for the next iteration.
            a *= 0.55;
        }

        // Color the pixel based on whether we're above or below the surface.
        if (s > 0.0) {
            // Above: desaturated green-blue mountain, pulses with treble
            O += vec3(1.0 + 2.0 * d * U.zxx) * (1.0 + iAudio.z * 0.3);
        } else {
            // Below: bright green lake, pulses with bass
            O += vec3(U + U) * (1.0 + iAudio.x * 0.5);
        }
        
        // Advance the ray
        z += d;
    }
    
    // Apply tone mapping to the accumulated color to prevent oversaturation.
    // Adjusted divisor for better brightness.
    vec3 toned_O = O / 80.0;
    
    // Use the tanh function for a smooth final output color.
    fragColor = vec4(_tanh(toned_O.x), _tanh(toned_O.y), _tanh(toned_O.z), 1.0);
}
`;
export default source;