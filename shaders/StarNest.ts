// StarNest by user, adapted for Shader Sequencer by AI

const source = `
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float star(vec2 uv, float flicker) {
    float d = length(uv);
    float m = 0.02 / (d + 1e-6); // Prevent division by zero
    m *= smoothstep(0.5, 0.2, d);
    return m * flicker;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Correctly setup UVs, centered and aspect-corrected
    vec2 uv = (fragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
    
    // --- Audio-reactive parameters ---
    float time = iTime * (1.0 + iAudio.w * 1.5); // Overall volume affects time
    float bass_mod = iAudio.x * 0.5; // Bass affects mouse brightness/influence
    float mid_mod = iAudio.y * 0.1; // Mids shift the background color
    float high_mod = iAudio.z * 1.5; // Highs increase flicker intensity

    vec3 color = vec3(0.0);
    
    // Mouse influence, enhanced by bass
    vec2 mouse_norm = iMouse.xy / iResolution.xy;
    vec2 mouse_uv = (mouse_norm - 0.5) * vec2(iResolution.x / iResolution.y, 1.0);
    vec2 mouse_influence = mouse_uv * (0.2 + bass_mod);
    
    // Three layers of stars for parallax effect
    for(int i_int = 0; i_int < 3; i_int++) {
        float i = float(i_int);
        float scale = 8.0 + i * 4.0;
        vec2 grid = fract(uv * scale) - 0.5;
        vec2 id = floor(uv * scale);
        
        // Flicker is now faster and more intense with highs
        float flicker = noise(id + time * (0.5 + i * 0.2 + high_mod));
        flicker = pow(flicker, 3.0);
        
        // Brightness increases near the mouse cursor
        float dist_to_mouse = length(uv - mouse_influence);
        float brightness = 1.0 + (1.0 - smoothstep(0.0, 0.5, dist_to_mouse)) * (2.0 + bass_mod);
        
        color += vec3(0.8, 0.9, 1.0) * star(grid, flicker) * brightness;
    }
    
    // Background color shifts with mids
    vec3 bg = vec3(0.02, 0.02, 0.05 + mid_mod);
    color = color + bg;
    
    fragColor = vec4(color, 1.0);
}
`;
export default source;