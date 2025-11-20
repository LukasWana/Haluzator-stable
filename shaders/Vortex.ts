
const source = `
// --- Noise Functions (Simplex noise for organic textures) ---
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.792842914 - 0.8537347209 * r; }

float snoise(vec2 v) {
    const vec4 C = vec4(0.2113248654, 0.3660254038, -0.5773502692, 0.0243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.792842914 - 0.8537347209 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) {
        v += a * snoise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// --- Main Shader ---
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Setup UVs and Time ---
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float time = iTime * 0.3;

    // --- Audio Reactivity ---
    float bass = pow(iAudio.x, 1.8) * 1.5;
    float mid = pow(iAudio.y, 1.5);
    float high = pow(iAudio.z, 2.5);
    float volume = pow(iAudio.w, 2.0);

    // 1. Dynamic Camera Shake (stronger)
    uv.x += (snoise(vec2(time * 2.0, 1.0)) - 0.5) * 0.1 * bass;
    uv.y += (snoise(vec2(time * 2.0, 10.0)) - 0.5) * 0.1 * bass;

    // Convert to polar coordinates
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // --- Vortex Logic (more chaotic and detailed) ---
    float vortex_twist = 2.0 / (radius + 0.2) + time * 3.0;
    
    // Domain warp the coordinates before FBM for more swirling
    vec2 warp_uv = uv * mat2(cos(radius * 3.0 - time * 2.0), sin(radius * 3.0 - time * 2.0), -sin(radius * 3.0 - time * 2.0), cos(radius * 3.0 - time * 2.0)) * (2.0 + mid);
    float turbulence = fbm(warp_uv) * 4.0 * bass;
    
    float distorted_angle = angle + vortex_twist + turbulence;

    // 2. Energetic Plasma Filaments (sharper and more defined)
    vec2 fbm_uv = vec2(distorted_angle * 1.5, radius * 3.0 - time);
    float fbm_val = fbm(fbm_uv);
    // Create sharp lines instead of blobs
    float filaments = 1.0 - smoothstep(0.0, 0.05, abs(fbm_val));
    filaments = pow(filaments, 3.0);
    // Fade out towards the edge
    filaments *= (1.0 - smoothstep(0.7, 1.2, radius));

    // 3. Brighter, Pulsing Core
    float core_pulse = 1.0 + sin(time * 15.0) * 0.2 * mid;
    float core = smoothstep(0.08, 0.0, radius) * (2.0 + volume * 8.0) * core_pulse;
    float core_glow = smoothstep(0.3, 0.0, radius) * (0.5 + volume * 2.0);

    // 4. Dense Particle Field
    vec2 particle_uv = uv * (10.0 + high * 5.0);
    float particle_noise = fract(sin(dot(floor(particle_uv), vec2(12.9898, 78.233))) * 43758.5453);
    float particle_anim = fract(time * 5.0 + particle_noise * 10.0);
    // Particles move inwards
    particle_uv.x -= particle_anim * 0.5;
    
    float particle_dist = length(fract(particle_uv) - 0.5);
    float particle_brightness = 1.0 - smoothstep(0.0, 0.1, particle_dist);
    // Make them sparkle and be more numerous
    float particle = pow(particle_brightness, 20.0) * step(0.95, particle_noise) * (1.0 + high * 5.0);
    particle *= smoothstep(0.05, 0.15, radius); // Fade near core

    // --- Vibrant Coloring ---
    vec3 color_a = vec3(0.1, 0.0, 0.8); // Deep Blue/Purple
    vec3 color_b = vec3(1.0, 0.1, 0.5); // Magenta
    vec3 color_c = vec3(0.2, 0.8, 1.0); // Cyan
    
    // Color is based on the filament value and distorted angle
    float color_mix_val = fract(distorted_angle * 0.3 + mid * 0.5);
    vec3 filament_color = mix(color_a, color_b, color_mix_val);
    filament_color = mix(filament_color, color_c, pow(fbm_val + 0.5, 3.0));

    // Combine all visual elements
    vec3 final_color = filament_color * filaments;
    final_color += mix(color_b, color_c, 0.5) * core_glow;
    final_color += vec3(1.0, 0.9, 0.8) * core;
    final_color += vec3(1.0) * particle;

    // Final contrast boost
    final_color = pow(final_color, vec3(0.9));

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;