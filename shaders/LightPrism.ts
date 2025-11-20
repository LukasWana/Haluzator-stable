const source = `
// LightPrism by AI
// Simulates light passing through a prism, creating caustic patterns and rainbows.

float noise(vec2 p, float time) {
    return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453);
}

float fbm(vec2 p, float time, float turbulence) {
    float t = 0.0;
    float amp = 0.5;
    mat2 rot_mat = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for(int i = 0; i < 4; i++) {
        t += amp * noise(p, time);
        p = rot_mat * p * (2.0 + turbulence);
        amp *= 0.5;
    }
    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * (0.05 + iAudio.w * 0.1);
    
    // Audio-reactive parameters
    float light_angle = time * 2.0 + iAudio.y * 1.5; // Mids control light angle
    float caustic_intensity = 0.5 + iAudio.x * 1.5; // Bass controls caustic intensity
    float shimmer_speed = 1.0 + iAudio.z * 5.0; // Highs control shimmer speed
    
    vec3 final_color = vec3(0.0);
    
    // Chromatic aberration / prism effect
    for(int i_int = 0; i_int < 3; i_int++) {
        float i = float(i_int);
        float angle_offset = i * 0.02;
        vec2 light_dir = vec2(cos(light_angle + angle_offset), sin(light_angle + angle_offset));
        
        // Distort UVs to create caustic patterns
        vec2 p = uv;
        float distortion = fbm(uv * 3.0 + light_dir * 2.0, time, iAudio.x);
        p += distortion * 0.2;
        
        // Create light beams
        float beam = dot(p, light_dir);
        float beam_pattern = sin(beam * 20.0 + time * shimmer_speed) * 0.5 + 0.5;
        beam_pattern = pow(beam_pattern, 10.0) * caustic_intensity;
        
        // Color based on channel
        vec3 color_channel = vec3(0.0);
        if(i == 0.0) color_channel.r = 1.0;
        if(i == 1.0) color_channel.g = 1.0;
        if(i == 2.0) color_channel.b = 1.0;
        
        final_color += color_channel * beam_pattern;
    }
    
    // Background
    vec3 bg_color = vec3(0.0, 0.0, 0.0);
    final_color = mix(bg_color, final_color, smoothstep(0.0, 0.1, length(final_color)));
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;