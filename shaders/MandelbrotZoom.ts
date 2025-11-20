// FIX: This file contained raw GLSL. It has been wrapped in a TypeScript module that exports the shader code as a string.
const source = `
// Mandelbrot Zoom by user, adapted for Shader Sequencer.
// - Zoom speed is controlled by iAudio.w (overall).
// - Color palette shifts with iAudio.y (mids).
// - Glow is intensified by iAudio.x (bass).
// - Detail level (iterations) increases with iAudio.z (highs).

// Complex number operations
vec2 complexSquare(vec2 z) {
    return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
}

// Smoothed coloring function
vec3 getColor(float i, float maxIter, float escapeMag) {
    float smoothed = i - log2(log2(escapeMag)) + 4.0;
    float normalized = smoothed / maxIter;
    
    // Create a color palette
    vec3 color1 = vec3(0.1, 0.0, 0.2);
    vec3 color2 = vec3(0.0, 0.15, 0.4);
    vec3 color3 = vec3(0.0, 0.4, 0.8);
    vec3 color4 = vec3(1.0, 0.8, 0.3);
    vec3 color5 = vec3(1.0, 0.3, 0.0);
    
    // Cycle through colors, mids shift the cycle
    float t = fract(normalized * 3.0 + iTime * 0.1 + iAudio.y * 0.5);
    
    if (t < 0.2) return mix(color1, color2, t * 5.0);
    if (t < 0.4) return mix(color2, color3, (t - 0.2) * 5.0);
    if (t < 0.6) return mix(color3, color4, (t - 0.4) * 5.0);
    if (t < 0.8) return mix(color4, color5, (t - 0.6) * 5.0);
    return mix(color5, color1, (t - 0.8) * 5.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Correct way to handle aspect ratio for complex plane visualization.
    // This makes the Y axis range [-1, 1] and the X axis range [-aspect, aspect].
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    // Calculate zoom based on time and overall audio volume
    float zoom = pow(1.2, iTime * (1.0 + iAudio.w * 3.0));

    // Define the base area of the Mandelbrot set to view
    vec2 base_center = vec2(-0.745, 0.186);
    
    // Mouse panning logic
    vec2 pan_offset = vec2(0.0);
    // Only apply pan if the mouse has been moved from its initial (0,0) state.
    // This is a more robust check against drifting when the mouse is inactive.
    if (iMouse.x > 0.0 || iMouse.y > 0.0) {
        // Convert mouse coordinates to the same space as UVs.
        vec2 mouse_uv = (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y;
        // The pan offset is the mouse position. The view will center on the cursor.
        pan_offset = mouse_uv;
    }
    
    // The final center point in the complex plane. The pan offset's influence
    // is scaled by 1/zoom to make panning feel consistent at any zoom level.
    vec2 center = base_center + pan_offset / zoom;
    
    // Calculate the point 'c' in the complex plane for this pixel
    vec2 c = center + uv / zoom;
    
    // Mandelbrot iteration
    vec2 z = vec2(0.0);
    float escapeRadius = 20.0;
    // Highs increase detail
    float maxIter = 150.0 + iAudio.z * 150.0;
    
    const int MAX_LOOP_ITER = 400;
    float iter_count = 0.0;

    // Use a standard for-loop with a constant limit for maximum compatibility.
    // A separate float counter is used for the logic.
    for (int i = 0; i < MAX_LOOP_ITER; i++) {
        if (iter_count >= maxIter) {
            iter_count = maxIter; // Cap at maxIter
            break;
        }
        
        z = complexSquare(z) + c;
        
        if (dot(z,z) > escapeRadius * escapeRadius) break;
        
        iter_count += 1.0;
    }
    
    // Background color for points in the set
    vec3 backgroundColor = vec3(0.0, 0.0, 0.05);
    
    // Get color based on iteration count
    vec3 color;
    if (iter_count >= maxIter) {
        color = backgroundColor;
    } else {
        color = getColor(iter_count, maxIter, length(z));
    }
    
    // Add some glow effect, boosted by bass
    float glow = 1.0 - min(1.0, iter_count / maxIter);
    color += glow * vec3(0.1, 0.2, 0.5) * (0.5 + iAudio.x * 2.0);
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;