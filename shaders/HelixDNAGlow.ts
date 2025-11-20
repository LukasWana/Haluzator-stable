
const source = `
#define PI 3.14159265359
#define TWO_PI (2.0*PI)

// 3D Rotation matrix around Y axis
mat3 rotY(float a) {
    float s = sin(a), c = cos(a);
    return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
}

// 3D Rotation matrix around X axis
mat3 rotX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(1, 0, 0, 0, c, -s, 0, s, c);
}


// Draws a glowing point with a bright core and softer falloff
float draw_glowing_point(vec2 uv, vec2 p, float size, float glow_falloff) {
    float dist = length(uv - p);
    // Core is a small, bright point
    float core = smoothstep(size * 0.4, 0.0, dist);
    // Glow is a larger, softer area around the core
    float glow = smoothstep(size + glow_falloff, size * 0.5, dist);
    return core * 1.5 + glow * 0.7;
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float time = iTime_app * u_speed; // Use the app's time uniform

    // --- Audio-reactive parameters ---
    float speed = 0.5 + iAudio.w * 0.8;
    float helix_radius = 0.4 + iAudio.x * 0.2;
    float helix_freq = 4.0 - iAudio.x * 1.5;
    float cam_rot_speed = 0.2 + iAudio.y * 0.4;
    float color_shift = iAudio.y * 0.5;
    float point_glow = 0.5 + iAudio.w * 1.5; // Use overall volume for general brightness
    float connector_flash = pow(iAudio.x, 2.0);

    vec3 final_color = vec3(0.01, 0.0, 0.03); // Dark background

    // --- Camera ---
    float cam_dist = 4.0;
    mat3 cam_rot = rotY(time * cam_rot_speed) * rotX(0.5 + sin(time * 0.1) * 0.2);

    // --- Raymarching-style point rendering loop ---
    const int num_points = 200;
    for (int i = 0; i < num_points; i++) {
        float t = float(i) / float(num_points);
        float z = -2.0 + t * 4.0; // Z-range of the helix segment
        
        // Loop the z position for an infinite helix
        float scroll_offset = fract(time * speed);
        z = mod(z + scroll_offset * 4.0, 4.0) - 2.0;

        // Helix math
        float angle = z * helix_freq;
        
        // Strand 1
        vec3 p1 = vec3(cos(angle) * helix_radius, sin(angle) * helix_radius, z);
        
        // Strand 2
        vec3 p2 = vec3(cos(angle + PI) * helix_radius, sin(angle + PI) * helix_radius, z);

        // Apply camera rotation
        p1 = cam_rot * p1;
        p2 = cam_rot * p2;

        // Perspective projection
        float pz1 = 1.0 / (cam_dist - p1.z);
        vec2 proj_p1 = p1.xy * pz1;
        
        float pz2 = 1.0 / (cam_dist - p2.z);
        vec2 proj_p2 = p2.xy * pz2;

        // Point size based on depth - INCREASED BASE SIZE
        float size1 = 0.035 * pz1 * point_glow;
        float size2 = 0.035 * pz2 * point_glow;
        
        // Glow falloff reactive to highs
        float glow_falloff1 = 0.05 * pz1 * (1.0 + iAudio.z * 2.0);
        float glow_falloff2 = 0.05 * pz2 * (1.0 + iAudio.z * 2.0);

        // Calculate point intensity using the new function
        float intensity1 = draw_glowing_point(uv, proj_p1, size1, glow_falloff1);
        float intensity2 = draw_glowing_point(uv, proj_p2, size2, glow_falloff2);
        
        // Coloring
        float hue1 = fract(z * 0.1 - time * 0.1 + color_shift);
        vec3 color1 = 0.5 + 0.5 * cos(hue1 * TWO_PI + vec3(0.0, 0.6, 1.0));

        float hue2 = fract(z * 0.1 - time * 0.1 + 0.5 + color_shift);
        vec3 color2 = 0.5 + 0.5 * cos(hue2 * TWO_PI + vec3(0.0, 0.6, 1.0));
        
        final_color += color1 * intensity1;
        final_color += color2 * intensity2;

        // Base pair connectors
        float connector_spacing = mod(z * 5.0, 1.0);
        if (connector_spacing < 0.1) {
             // Project line segment
            vec2 a = proj_p1;
            vec2 b = proj_p2;

            // distance to line segment
            vec2 pa = uv - a;
            vec2 ba = b - a;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            float dist_to_line = length(pa - ba * h);
            
            // THICKER and BASS-REACTIVE lines
            float line_thickness = (0.008 * pz1) * (1.0 + iAudio.x * 2.0);
            float connector_intensity = 1.0 - smoothstep(0.0, line_thickness, dist_to_line);

            // BRIGHTER and STRONGER flash
            vec3 connector_color = vec3(1.0, 0.9, 0.95) * (0.8 + connector_flash * 2.5);
            final_color += connector_color * connector_intensity;
        }
    }

    // Vignette
    final_color *= 1.0 - dot(uv, uv) * 0.3;

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;