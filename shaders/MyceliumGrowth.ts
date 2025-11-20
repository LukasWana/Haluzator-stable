// MyceliumGrowth by AI
// Simulates the growth of mycelium tendrils.

// FIX: This file contained raw GLSL. It has been wrapped in a TypeScript module that exports the shader code as a string.
const source = `
// 2D rotation matrix
mat2 rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

// Pseudo-random number
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.1;

    // Audio-reactive parameters - ENHANCED
    float growth_speed = 0.1 + pow(iAudio.w, 1.5) * 2.0;       // Overall volume controls growth speed (more impactful)
    float branching = 2.0 + pow(iAudio.x, 2.0) * 15.0;      // Bass controls branching complexity (stronger effect)
    float color_flow = iAudio.y * 1.5;                      // Mids control color flow (stronger effect)
    float thickness = 0.003 + pow(iAudio.z, 1.5) * 0.02;    // Highs make tendrils thicker (more responsive)
    float rotation_wobble = iAudio.y * 0.8;                 // Mids add a "dance" to the tendrils

    vec3 final_color = vec3(0.0);

    // Animate growth over time
    float growth_time = time * growth_speed;

    vec2 p = uv * 3.0;

    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        // Create branching tendrils
        float angle = hash(vec2(fi, 1.0)) * 6.28318;
        vec2 dir = vec2(cos(angle), sin(angle));

        vec2 q = p;
        q *= rot(angle + sin(growth_time + fi) * 0.5);

        float d = 1.0;

        // Fractal growth pattern
        for(int j = 0; j < 5; j++) {
            q = abs(q);
            q.x -= 0.5;
            // Add audio-reactive wobble to rotation
            q *= rot(0.5 + sin(growth_time * 0.5 + fi) * (0.2 + rotation_wobble));
            q *= 1.2;
        }

        // Bass-reactive branching
        d = length(q) / (50.0 + branching * 20.0);

        // Animate the tendrils appearing
        float tendril_path = smoothstep(0.0, 1.0, growth_time + hash(vec2(fi, 2.0)) - length(p));

        // Draw the tendril with treble-reactive thickness
        float tendril = smoothstep(thickness, 0.0, d) * tendril_path;

        // Coloring, with mid-reactive flow and brightness
        float hue = fract(fi * 0.1 + growth_time * 0.1 + color_flow);
        vec3 color = 0.5 + 0.5 * cos(hue * 6.28318 + vec3(0.0, 0.6, 1.0));
        color *= (0.8 + iAudio.y * 0.5); // Mids make tendrils brighter

        final_color += color * tendril;
    }

    // High-frequency brightness flash
    final_color *= (1.0 + iAudio.z * 1.5);

    // Background pulses with bass
    vec3 bg_color = vec3(0.01, 0.0, 0.02) * (1.0 + iAudio.x * 3.0);
    final_color = mix(bg_color, final_color, smoothstep(0.0, 0.1, length(final_color)));

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;