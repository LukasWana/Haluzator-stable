const source = `
// ChromaKelp by AI
// Underwater kelp forest swaying in a colorful current.

float hash1f(float n) { return fract(sin(n) * 43758.5453); }

float hash2f(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

mat2 rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * 0.2;
    
    // Audio-reactive parameters
    float sway_speed = 0.5 + iAudio.w * 1.0;
    float sway_amount = 0.3 + iAudio.x * 0.5; // Bass controls sway amount
    float light_color_shift = iAudio.y * 0.3; // Mids shift water color
    float bubble_rate = iAudio.z; // Highs create bubbles

    vec3 final_color = vec3(0.0);
    
    // Draw multiple kelp stalks
    for(int i_int = 0; i_int < 5; i_int++) {
        float i = float(i_int);
        float x_pos = (i - 2.0) * 0.4 + hash1f(i) * 0.2 - 0.1;
        
        vec2 p = uv;
        p.x -= x_pos;
        
        // Swaying motion
        float sway = sin(p.y * 2.0 + time * sway_speed + hash1f(i) * 6.28) * sway_amount;
        p.x += sway * (p.y + 1.0); // More sway at the top
        
        // Kelp shape
        float kelp_width = 0.05 + hash1f(i + 1.0) * 0.05;
        float d = abs(p.x) - kelp_width;
        
        // Leaves
        float leaves = sin(p.y * 10.0 + hash1f(i + 2.0) * 6.28) * 0.1;
        d -= max(0.0, leaves);
        
        float kelp = smoothstep(0.01, 0.0, d);
        
        // Coloring
        vec3 kelp_color = vec3(0.1, 0.4, 0.1) * (0.8 + hash1f(i + 3.0) * 0.4);
        
        final_color += kelp_color * kelp;
    }
    
    // Water color and light shafts
    vec3 water_color = vec3(0.1, 0.3, 0.5) + light_color_shift;
    float light_shafts = sin(uv.x * 10.0 + time * 0.5) * 0.5 + 0.5;
    light_shafts = pow(light_shafts, 8.0) * 0.1;
    
    final_color = mix(final_color, water_color, 1.0 - smoothstep(0.0, 0.8, length(final_color)));
    final_color += light_shafts;
    
    // Bubbles
    if(hash2f(floor(uv * vec2(10.0, 20.0)) + time) > 1.0 - bubble_rate * 0.05) {
        float bubble = 1.0 - smoothstep(0.0, 0.02, length(fract(uv * 10.0) - 0.5));
        final_color += bubble * 0.5;
    }

    fragColor = vec4(final_color, 1.0);
}
`;
export default source;