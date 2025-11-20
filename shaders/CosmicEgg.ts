const source = `
// A simple hash function for pseudo-random values
float hash22(vec2 p) {
    p = fract(p * vec2(5.3983, 5.4427));
    p += dot(p, p.yx);
    return fract(p.x * p.y * 93.758);
}

// Value noise function
float valueNoise(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    fp = fp * fp * (3.0 - 2.0 * fp); // Smoothstep interpolation
    
    float a = hash22(ip);
    float b = hash22(ip + vec2(1.0, 0.0));
    float c = hash22(ip + vec2(0.0, 1.0));
    float d = hash22(ip + vec2(1.0, 1.0));
    
    return mix(mix(a, b, fp.x), mix(c, d, fp.x), fp.y);
}

// FBM (Fractal Brownian Motion) for organic textures
float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; ++i) { // 4 octaves for complexity
        total += valueNoise(p * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Normalize UV coordinates to -1 to 1 range, aspect ratio corrected
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    uv /= 3.0;
    
    // Time and audio modifiers
    float time = iTime * 0.2; // Slower base time
    float bass_influence = iAudio.x * 2.0; // Bass for distortion
    float mid_influence = iAudio.y * 1.5;  // Mids for color shifts and flow
    float high_influence = iAudio.z * 1.0; // Highs for sharp details/flicker
    float vol_influence_raw = iAudio.w; // Raw overall volume for size
    float vol_influence_pow = pow(iAudio.w, 1.8); // Powered up volume for brightness

    // **Mandala-aware Animation**: Animate the center of the effect in a circular path.
    // This moves the primary visual into the mandala's "source slice," creating dynamic, complex patterns.
    float center_radius = 0.45 + sin(time * 0.7) * 0.1; // Pulsating radius for the path
    vec2 egg_center = vec2(cos(time * 1.2), sin(time * 1.2)) * center_radius;

    // Base "egg" shape with audio-reactive surface distortion
    vec2 displaced_uv = uv;
    // Distortion is toned down to keep the moving egg shape clear.
    displaced_uv += vec2(
        fbm(uv * 2.0 + time * 1.5 + bass_influence * 1.5) * 0.15,
        fbm(uv * 2.0 + time * 1.2 + mid_influence * 1.2) * 0.15
    );
    
    // Distance is now calculated from the animated 'egg_center'
    float d = length(displaced_uv - egg_center);

    // Prominent size reaction to overall volume.
    float dynamic_radius = 0.15 + vol_influence_raw * 0.35 + sin(time * 2.0 + bass_influence) * 0.02;
    
    // Create the egg shape with a distinct core and a softer outer glow
    float egg_core = smoothstep(dynamic_radius, dynamic_radius - 0.05, d);
    float egg_glow = smoothstep(dynamic_radius + 0.3, dynamic_radius, d);

    // Internal flow pattern, now relative to the egg's new position
    vec2 flow_uv = (uv - egg_center) * 4.0;
    float flow_noise_val = fbm(flow_uv + time * vec2(1.0, 0.7) + mid_influence) * 0.5 + 0.5;
    flow_noise_val += fbm(flow_uv * 8.0 - time * vec2(0.5, 0.9) + high_influence) * 0.25;

    // Combine the core shape with the internal flow pattern
    float final_shape = egg_core * (0.6 + flow_noise_val * 0.4); 

    // Dynamic, audio-reactive coloring
    vec3 color_a = vec3(0.1, 0.0, 0.25);
    vec3 color_b = vec3(0.8, 0.1, 0.1);
    vec3 color_c = vec3(0.1, 0.9, 0.7);
    vec3 color_d = vec3(1.0, 0.7, 0.3); // Glow color

    vec3 base_color = mix(color_a, color_b, smoothstep(0.0, 0.8, d) + bass_influence * 0.2);
    base_color = mix(base_color, color_c, flow_noise_val * 0.8 + mid_influence * 0.2);
    
    base_color += sin(base_color * 15.0 + iTime * 2.0 + mid_influence * 3.0) * 0.15;
    base_color = clamp(base_color, 0.0, 1.0);

    // Apply final shape and make brightness pulse strongly with volume
    vec3 final_output_color = base_color * final_shape * (0.5 + vol_influence_pow * 2.5);
    
    // Add the intense outer glow, also driven by volume
    final_output_color += color_d * egg_glow * (0.3 + vol_influence_pow * 2.0);
    
    // Add a sharp, bass-driven core flash for emphasis
    float core_flash = smoothstep(dynamic_radius * 0.3, 0.0, d);
    final_output_color += vec3(1.0, 0.95, 0.9) * core_flash * pow(iAudio.x, 2.0) * 2.0;

    // Subtle background stars that flicker with high frequencies.
    // The mask to hide stars now correctly follows the moving egg.
    float stars = fbm(uv * 12.0 + time * 0.5) * 0.5 + 0.5;
    stars = pow(stars, 18.0) * (0.6 + high_influence * 0.4);
    final_output_color += vec3(stars) * (1.0 - smoothstep(dynamic_radius + 0.1, dynamic_radius - 0.1, d));

    fragColor = vec4(final_output_color, 1.0);
}
`;
export default source;