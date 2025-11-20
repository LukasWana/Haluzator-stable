
const source = `
// Adapted and enhanced for VJ App with full audio reactivity and color.

// Helper function to convert HSV to RGB for easy color cycling
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Setup & UVs ---
    // Correct aspect ratio by normalizing based on the smaller dimension
    vec2 U = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;

    // --- Audio-reactive parameters ---
    float rot_speed = 0.05 + pow(iAudio.w, 1.5) * 0.2;
    float bass_pulse = iAudio.x * 0.8;
    float color_shift = iAudio.y * 0.5;
    float edge_glow = pow(iAudio.z, 1.5) * 0.8;
    
    // Time with bass-driven "jumps" for a rhythmic pulse
    float t = rot_speed * iTime + bass_pulse;
    
    float r = 1.0;
    float c = cos(t);
    float s = sin(t);
    
    float pattern = 0.0;
    
    // --- Color Palette ---
    // Mids shift the hue of the two alternating colors
    vec3 colorA = hsv2rgb(vec3(0.6 + color_shift, 0.9, 0.8));
    vec3 colorB = hsv2rgb(vec3(0.9 + color_shift, 0.7, 0.7));
    
    // --- Main Loop ---
    // An odd number of iterations ensures the center has a consistent color
    for( int i=0; i < 31; i++){
	    U *= mat2(c, s, -s, c); // Rotate
        r /= abs(c) + abs(s);   // Scale to fit the rotated square
        
        // Shape definition: mix between a square and a circle based on bass
        float roundness = smoothstep(0.0, 0.6, iAudio.x);
        float dist_square = max(abs(U.x), abs(U.y));
        float dist_circle = length(U);
        float dist = mix(dist_square, dist_circle, roundness);
        
        // Use smoothstep for anti-aliased lines. Highs control the sharpness.
        float sharpness = (15.0 - edge_glow * 12.0) / iResolution.y;
        pattern = smoothstep(sharpness, 0.0, dist - r) - pattern;
    }
    
    // --- Final Coloring ---
    // Use the black and white pattern to mix between our two main colors.
    vec3 final_color = mix(colorA, colorB, pattern);
    
    // Add a high-frequency driven glow to the final pattern
    final_color += pattern * edge_glow * vec3(1.0, 0.9, 0.8);
    
    // Add a dark, pulsating background for depth
    vec3 bg_color = vec3(0.01, 0.0, 0.02) * (1.0 + iAudio.x * 2.0);
    
    // Blend the pattern over the background using the pattern itself as a mask
    final_color = mix(bg_color, final_color, smoothstep(0.0, 0.1, pattern));
    
    // Vignette for focus
    final_color *= 1.0 - length(U / r) * 0.4;

	fragColor = vec4(final_color, 1.0);
}
`;
export default source;
