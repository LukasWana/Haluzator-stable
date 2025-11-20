const source = `
// QuantumFoam by AI
// The chaotic, bubbling surface of spacetime.

float hash(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(dot(i, vec2(1.0, 57.0)));
    float b = hash(dot(i + vec2(1.0, 0.0), vec2(1.0, 57.0)));
    float c = hash(dot(i + vec2(0.0, 1.0), vec2(1.0, 57.0)));
    float d = hash(dot(i + vec2(1.0, 1.0), vec2(1.0, 57.0)));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, float time) {
    float t = 0.0;
    float amp = 0.5;
    mat2 rot_mat = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for(int i = 0; i < 5; i++) {
        t += amp * noise(p + time);
        p = rot_mat * p * 2.0;
        amp *= 0.5;
    }
    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * (0.1 + iAudio.w * 0.2);
    
    // Audio-reactive parameters
    float turbulence = 0.5 + iAudio.y * 2.0; // Mids make foam more turbulent
    float zoom = 1.0 - iAudio.w * 0.3;
    float brightness = 0.8 + iAudio.z * 1.2; // Highs add brightness
    float core_pulse = iAudio.x; // Bass pulses the core

    vec2 p = uv * zoom;
    
    // Create bubbling voronoi-like cells
    float d = 1.0;
    for(int i = -1; i <= 1; i++) {
        for(int j = -1; j <= 1; j++) {
            vec2 n = vec2(float(i), float(j));
            vec2 g = n + 0.5 * vec2(
                sin(time * 0.7 + hash(dot(n, vec2(12.3, 45.6))) * 6.28),
                cos(time * 0.8 + hash(dot(n, vec2(78.9, 10.1))) * 6.28)
            ) * turbulence;
            d = min(d, length(p - g));
        }
    }
    
    // Cell interior noise
    float cell_noise = fbm(p * 3.0, time * 2.0);
    
    // Final pattern is a combination of cell distance and interior noise
    float pattern = smoothstep(0.15, 0.2, d) * (0.5 + cell_noise * 0.5);
    
    // Coloring
    vec3 color1 = vec3(0.1, 0.2, 0.8); // Blue
    vec3 color2 = vec3(0.8, 0.1, 0.5); // Magenta
    vec3 core_color = vec3(0.8, 1.0, 1.0); // Cyan-white
    
    vec3 final_color = mix(color1, color2, cell_noise);
    final_color *= pattern * brightness;
    
    // Add a pulsing core to each cell
    float core = smoothstep(0.1, 0.0, d) * (0.5 + core_pulse * 1.5);
    final_color += core * core_color;
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;