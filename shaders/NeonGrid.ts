// FIX: This file contained raw GLSL. It has been wrapped in a TypeScript module that exports the shader code as a string.
const source = `
// Adapted from user code for Shader Sequencer

#define PI 3.14159265359

// Hash function for stars
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Function to create a perspective grid effect without derivatives
float grid(vec2 uv, float thickness) {
    vec2 pos = uv * 10.0;  // Scale the grid
    vec2 dist_to_line = abs(fract(pos - 0.5) - 0.5);
    float min_dist = min(dist_to_line.x, dist_to_line.y);

    // 'thickness' (from grid_pulse) is audio-reactive (1.0 to 5.0).
    // A higher value should result in a thicker/brighter line.
    float line_width = 0.01 * thickness;

    // Use smoothstep to draw an anti-aliased line.
    // When min_dist is 0, result is 1.0 (full brightness).
    // When min_dist > line_width, result is 0.0.
    return smoothstep(line_width, 0.0, min_dist);
}

// Function to generate stars
float starfield(vec2 uv, float time, float flicker) {
    // Use hash for more random-looking stars
    vec2 grid_id = floor(uv * 100.0);
    float star_hash = hash(grid_id);
    if (star_hash < 0.98) return 0.0; // Reduce star density

    vec2 p = fract(uv * 100.0) - 0.5;
    float d = length(p);
    
    // Twinkling effect
    float twinkle = 0.5 + 0.5 * sin(time * (1.0 + star_hash * 5.0) + star_hash * 100.0);
    twinkle = pow(twinkle, 8.0) * (1.0 + flicker);

    float star = smoothstep(0.04, 0.01, d);
    return star * twinkle;
}

// Main function
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    // --- Audio-reactive parameters ---
    float speed = 0.5 + iAudio.w * 1.5;
    float grid_pulse = 1.0 + iAudio.x * 4.0;
    float color_shift = iAudio.y * 0.5;
    float star_flicker = iAudio.z * 2.0;
    
    // Mouse for looking around
    vec2 mouse = (iMouse.xy / iResolution.xy - 0.5) * 2.0;
    // Add easing to pitch control for smoother movement, less sensitive around the horizon
    float eased_mouse_y = sign(mouse.y) * pow(abs(mouse.y), 1.5);
    // Clamp pitch to a safe range just under +/- 90 degrees to prevent issues
    float pitch = clamp(-eased_mouse_y * PI * 0.5, -PI * 0.49, PI * 0.49);
    float yaw = -mouse.x * PI;

    // Camera setup
    vec3 ro = vec3(0.0, 0.0, -iTime * speed);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    // Rotate camera with mouse
    mat3 rotX = mat3(1.0, 0.0, 0.0, 0.0, cos(pitch), -sin(pitch), 0.0, sin(pitch), cos(pitch));
    mat3 rotY = mat3(cos(yaw), 0.0, sin(yaw), 0.0, 1.0, 0.0, -sin(yaw), 0.0, cos(yaw));
    rd = rotY * rotX * rd;
    
    // Start with the background (starfield)
    vec3 final_color = vec3(1.0) * starfield(rd.xy * 2.0, iTime, star_flicker) * 0.5;
    
    // --- Grid Rendering ---
    // Fade the grid out as the view ray approaches the horizon (rd.y -> 0).
    // This robustly prevents division-by-zero errors and graphical artifacts.
    float horizon_fade = smoothstep(0.0, 0.05, abs(rd.y));
    
    if (horizon_fade > 0.0) {
        // Since ro.y is 0, these are simplified.
        float dist_floor = -1.0 / rd.y;
        float dist_ceil  =  1.0 / rd.y;
        
        vec3 grid_color = vec3(0.0, 0.8, 1.0) + vec3(0.5, -0.3, 0.0) * color_shift;
        
        // Render floor if it's in front of the camera
        if (dist_floor > 0.0) {
            vec3 p = ro + rd * dist_floor;
            float grid_effect = grid(p.xz, grid_pulse);
            float dist_fade = 1.0 / (1.0 + dist_floor * dist_floor * 0.05);
            final_color += grid_color * grid_effect * dist_fade * horizon_fade;
        }
        
        // Render ceiling if it's in front of the camera
        if (dist_ceil > 0.0) {
            vec3 p = ro + rd * dist_ceil;
            float grid_effect = grid(p.xz, grid_pulse);
            float dist_fade = 1.0 / (1.0 + dist_ceil * dist_ceil * 0.05);
            final_color += grid_color * grid_effect * dist_fade * horizon_fade;
        }
    }

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;