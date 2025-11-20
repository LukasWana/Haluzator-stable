
const source = `
// BlackHole shader - Rewritten by AI to match the user's reference image.
// This version uses a 2D approach focusing on gravitational lensing,
// a bright accretion disk, and audio-reactive effects.

#define PI 3.14159265359

// Hash function for stars
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Star field function
float stars(vec2 uv, float twinkle_mod) {
    vec2 grid_id = floor(uv);
    
    float star_val = 0.0;
    
    // Check 3x3 grid for stars to make them appear larger and prevent aliasing
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor_id = grid_id + vec2(x, y);
            float star_hash = hash(neighbor_id);
            
            if (star_hash > 0.99) { // High threshold for sparse but distinct stars
                vec2 star_pos = neighbor_id + (hash(neighbor_id + 1.0) * 0.8 + 0.1);
                float dist = length(uv - star_pos);
                
                // Twinkle effect, audio reactive
                float twinkle = sin(iTime * 5.0 + star_hash * 6.28) * 0.5 + 0.5;
                float brightness = (0.5 + twinkle * 0.5) * (1.0 + twinkle_mod);
                
                star_val += smoothstep(0.08, 0.0, dist) * brightness;
            }
        }
    }
    return star_val;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Correct UV setup, centered at (0,0)
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;

    // --- Audio Reactivity ---
    float time = iTime * (0.5 + iAudio.w * 0.5); // Overall speed/animation
    float bass_pulse = iAudio.x; // Bass for pulsing intensity
    float mid_color_shift = iAudio.y; // Mids for color shifts
    float high_twinkle = iAudio.z; // Highs for star twinkling

    // --- Mouse Influence ---
    vec2 m = (iMouse.xy * 2.0 - iResolution.xy) / iResolution.y;
    // The black hole center is subtly moved by the mouse
    uv -= m * 0.1;

    // --- Gravitational Lensing ---
    // The core visual effect that distorts space around the center
    vec2 lens_dir = normalize(uv);
    float lens_dist = length(uv);
    // Strength of lensing is stronger near the center and pulses with bass
    float lens_strength = (0.05 + bass_pulse * 0.05) / (lens_dist * lens_dist + 0.01);
    vec2 distorted_uv = uv + lens_dir * lens_strength;

    // --- Background and Stars ---
    // A deep blue/purple background gradient
    vec3 col = vec3(0.05, 0.05, 0.2) + abs(uv.y) * vec3(0.1, 0.0, 0.1);
    // Render the starfield through the distorted space
    col += stars(distorted_uv * 10.0, high_twinkle);

    // --- Accretion Disk ---
    // Render the disk in the lensed coordinate space
    float disk_y = abs(distorted_uv.y);
    // Pinch the disk vertically near the center to simulate gravity's pull
    disk_y /= 1.0 - 0.8 * exp(-abs(distorted_uv.x) * 5.0);

    // Create the bright glow of the disk
    float disk_glow = pow(smoothstep(0.08, 0.0, disk_y), 2.0);
    
    // Color gradient for the disk: cyan on the left, pink on the right
    vec3 cyan_color = vec3(0.2, 0.8, 1.0);
    vec3 pink_color = vec3(1.0, 0.3, 0.8);
    // Mids shift the color balance
    float color_mix_factor = smoothstep(-0.5, 0.5, distorted_uv.x + mid_color_shift * 0.3);
    vec3 disk_color = mix(cyan_color, pink_color, color_mix_factor);

    // Add disk to the scene. Its intensity pulses with bass.
    col += disk_glow * disk_color * (2.0 + bass_pulse * 5.0);

    // --- Central Singularity (Black Hole) ---
    // A simple dark circle in the *original* UV space, so it's not affected by lensing
    float singularity_dist = length(uv);
    // Smoothstep creates a soft edge
    float singularity = 1.0 - smoothstep(0.02, 0.04, singularity_dist);
    // This masks everything behind it, creating the black hole effect
    col *= (1.0 - singularity);
    
    // --- Atmospheric Glow ---
    // A soft, blue glow around the entire phenomenon
    float atmosphere = pow(smoothstep(1.5, 0.0, length(uv)), 1.5) * 0.3;
    col += atmosphere * vec3(0.1, 0.2, 0.5) * (1.0 + mid_color_shift * 0.5);

    // --- Final Touches ---
    // Tone mapping to prevent the brightest parts from being completely white
    col = col / (col + 1.0);
    // Gamma correction for contrast
    col = pow(col, vec3(0.8));

    fragColor = vec4(col, 1.0);
}
`;
export default source;