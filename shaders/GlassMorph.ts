// GlassMorph by AI
// A morphing, iridescent glass-like substance.

const source = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Corrected noise function - time should animate the domain, not be added to the output value.
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Corrected FBM function to properly animate the domain over time.
float fbm(vec2 p, float time, float turbulence) {
    float t = 0.0;
    float amp = 0.5;
    mat2 rot_mat = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    p += time * 0.2; // Animate domain by adding time to the input coordinate
    for(int i = 0; i < 5; i++) {
        t += amp * noise(p); // Use corrected noise function
        p = rot_mat * p * (2.0 + turbulence);
        amp *= 0.5;
    }
    return t;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float time = iTime * (0.1 + iAudio.w * 0.2);
    
    // Audio-reactive parameters
    float morph_speed = 0.5 + iAudio.y * 1.0;
    float turbulence = 0.1 + iAudio.x * 0.5;
    float brightness = 1.0 + iAudio.z * 1.5; // Increased base brightness

    // Morphing shape
    float dist_to_center = length(uv);
    float shape_radius = 0.3 + 0.1 * sin(time * morph_speed + dist_to_center * 5.0);
    
    // A mask to define the shape, with a slightly softer edge
    float mask = 1.0 - smoothstep(shape_radius, shape_radius + 0.02, dist_to_center);
    
    // Iridescent color pattern using the corrected FBM
    vec2 pattern_uv = uv;
    pattern_uv += fbm(uv * 2.0, time, turbulence) * 0.1;
    float pattern = fbm(pattern_uv * 3.0, time * 1.5, turbulence);
    
    // Coloring - More vibrant palette
    vec3 color1 = vec3(1.0, 0.3, 0.6); // Magenta/Pink
    vec3 color2 = vec3(0.3, 1.0, 0.8); // Cyan/Green
    vec3 shape_color = mix(color1, color2, pattern);
    
    // Add a glow effect to the edge of the shape for better definition
    float edge_glow = smoothstep(shape_radius + 0.02, shape_radius, dist_to_center);
    shape_color = shape_color * brightness * (mask + edge_glow * 1.5);
    
    // Background - slightly brighter and more colorful
    vec3 background_color = vec3(0.01, 0.0, 0.08);
    
    vec3 final_color = mix(background_color, shape_color, mask);
    
    fragColor = vec4(final_color, 1.0);
}
`;
export default source;