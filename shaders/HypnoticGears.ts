// Original concept by user, adapted and enhanced by AI for Shader Sequencer.
// This shader replaces the previous "HypnoticGears". It creates a noisy, reflective tunnel
// with a moving orb light source, designed for performance and audio reactivity.

const source = `
// tanh implementation for WebGL 1 compatibility
vec4 Tanh(vec4 x) {
    vec4 ex = exp(x);
    vec4 emx = exp(-x);
    // Add epsilon to prevent division by zero
    return (ex - emx) / (ex + emx + 1e-9);
}

// Orb SDF, representing a light source, now audio reactive
float orbSDF(vec3 p, float time, float audio_w_mod) {
    float t = time * (4.0 + audio_w_mod * 2.0);
    vec3 orb_pos = vec3(
        sin(sin(t*0.2)+t*0.4) * 6.0,
        1.0+sin(sin(t*0.5)+t*0.2) *4.0,
        12.0+time+cos(t*0.3)*8.0
    );
    return length(p - orb_pos) - 0.1; // Orb itself
}

// Main Scene SDF
vec2 map(vec3 p, float time, float audio_x_mod, float audio_y_mod) {
    // 1. Orb distance field (material ID 1.0)
    float orb_dist = orbSDF(p, time, 0.0);

    // 2. Tunnel distance field (material ID 0.0)
    vec3 p_tunnel = p;
    // Spin by time, twist by depth
    p_tunnel.xy *= mat2(cos(0.1*time + p.z/8.0 + vec4(0,33,11,0)));
    // Mirrored planes 4 units apart
    float tunnel_dist = 4.0 - abs(p_tunnel.y);

    // FBM-like noise for tunnel surface detail
    float fbm_noise = 0.0;
    float amp = 0.8;
    vec3 p_noise = p_tunnel;
    // Use a fixed iteration loop for compatibility
    for(int j=0; j<5; j++) {
        p_noise += cos(0.7*time + p_noise.yzx) * (0.2 + audio_y_mod * 0.2); // Mids affect turbulence
        fbm_noise -= abs(dot(sin(0.1*time + p_noise * amp), vec3(0.6))) / amp;
        amp += amp;
    }
    tunnel_dist += fbm_noise * (0.5 + audio_x_mod); // Bass affects noise intensity
    
    // Combine the scene elements using min(), returning distance and material ID
    if (orb_dist < tunnel_dist) {
        return vec2(orb_dist, 1.0);
    }
    return vec2(tunnel_dist, 0.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // --- Setup ---
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    float time = iTime;
    
    // --- Audio reactive params ---
    float audio_w_mod = pow(iAudio.w, 1.5);
    float audio_x_mod = iAudio.x;
    float audio_y_mod = iAudio.y;
    float audio_z_mod = pow(iAudio.z, 2.0);

    // --- Camera ---
    vec3 ro = vec3(0.0, 0.0, 0.0); // Ray origin starts at center
    // Camera movement and audio wobble
    vec2 cam_move = vec2(cos(time*0.1)*0.3, cos(time*0.3)*0.1);
    cam_move += vec2(cos(time*2.5), sin(time*3.1)) * 0.05 * audio_y_mod;
    vec3 rd = normalize(vec3(uv + cam_move, 1.0)); // Ray direction

    // --- Raymarching ---
    float dist = 0.0;
    vec3 accumulated_color = vec3(0.0);
    
    // Use a fixed-iteration loop for compatibility
    for (int i = 0; i < 90; i++) {
        vec3 p = ro + rd * dist;
        p.z += time; // Move camera forward through the scene
        
        vec2 scene_info = map(p, time, audio_x_mod, audio_y_mod);
        float d = scene_info.x;
        
        if (d < 0.001) break; // Hit surface
        
        dist += d * 0.5; // Step forward

        // Volumetric glow accumulation
        if (d < 1.0) { // Only accumulate glow near surfaces
           accumulated_color += (0.005 + audio_z_mod * 0.02) * vec3(0.5, 0.7, 1.0) / (d*d + 1e-4);
        }

        if (dist > 60.0) break; // Far clip
    }
    
    // --- Shading ---
    // Calculate light from orb
    vec3 p = ro + rd * dist;
    p.z += time;
    vec3 orb_pos = vec3(
        sin(sin(time*4.0*0.2)+time*4.0*0.4) * 6.0,
        1.0+sin(sin(time*4.0*0.5)+time*4.0*0.2) *4.0,
        12.0+time+cos(time*4.0*0.3)*8.0
    );
    float light_dist = length(p - orb_pos);
    float light_intensity = (1.0 + audio_z_mod) / (light_dist * light_dist + 1e-4);
    
    accumulated_color += vec3(1.0, 0.8, 0.6) * light_intensity * 0.5;

    // Tonemap and finalize
    fragColor = Tanh(vec4(accumulated_color, 1.0) / 10.0);
}
`;
export default source;
